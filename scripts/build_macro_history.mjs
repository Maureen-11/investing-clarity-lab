import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const workspace = process.cwd();
const outputPath = path.join(workspace, "public", "data", "macro-history.json");
const tempPath = `${outputPath}.next`;
const SAFE_URL = "https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do";
const NBS_BASE = "https://data.stats.gov.cn/dg/website/publicrelease/web/external";
const NBS_ROOT = "fc982599aa684be7969d7b90b1bd0e84";

const CPI_SEGMENTS = [
  { cid: "bc985d1741a94451880c606022a8fe00", indicator: "384ddbda2edc47969caa98263f16231b", start: "200001MM", end: "201512MM" },
  { cid: "42132fae9f2244818f0480b4c422615c", indicator: "0dc091b5194c46afaf10369d5c55676a", start: "201601MM", end: "202012MM" },
  { cid: "e6664817f0cd427783cd397770695634", indicator: "e437d965279d41ceb9ace591b62f6ffc", start: "202101MM", end: "202512MM" },
  { cid: "b4fad2cf9e0e4af7815b7e9e2e95c5c7", indicator: "f3904a1f5a384d54a3944ec6e2df3d1c", start: "202601MM", end: `${new Date().getUTCFullYear()}12MM` },
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function decodeText(value) {
  return value.replace(/&nbsp;|&#160;/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseSafeRows(html) {
  const rows = [];
  for (const match of html.matchAll(/<tr class="first"[\s\S]*?<\/tr>/g)) {
    const cells = [...match[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => decodeText(cell[1]));
    if (cells.length < 5 || !/^\d{4}-\d{2}-\d{2}$/.test(cells[0])) continue;
    const usd = Number(cells[1]) / 100;
    const hkd = Number(cells[4]) / 100;
    if (Number.isFinite(usd) && Number.isFinite(hkd)) rows.push([cells[0], usd, hkd]);
  }
  return rows;
}

async function fetchSafeYear(year, endDate) {
  const body = new URLSearchParams({ startDate: `${year}-01-01`, endDate, queryYN: "true" });
  const response = await fetch(SAFE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "JiantouAcademyDataUpdater/1.0" },
    body,
  });
  if (!response.ok) throw new Error(`SAFE ${year} returned HTTP ${response.status}`);
  const rows = parseSafeRows(await response.text());
  if (!rows.length) throw new Error(`SAFE ${year} returned no exchange-rate rows`);
  return rows;
}

async function fetchSafeHistory() {
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const all = [];
  for (let year = 2000; year <= currentYear; year++) {
    const endDate = year === currentYear ? isoDate(today) : `${year}-12-31`;
    all.push(...await fetchSafeYear(year, endDate));
  }
  const deduped = new Map(all.map((row) => [row[0], row]));
  return [...deduped.values()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function fetchCpiSegment(segment) {
  const response = await fetch(`${NBS_BASE}/getEsDataByCidAndDt/`, {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json", "user-agent": "JiantouAcademyDataUpdater/1.0" },
    body: JSON.stringify({
      cid: segment.cid,
      indicatorIds: [segment.indicator],
      das: [{ text: "全国", value: "000000000000" }],
      dts: [`${segment.start}-${segment.end}`],
      showType: "1",
      rootId: NBS_ROOT,
    }),
  });
  if (!response.ok) throw new Error(`NBS CPI ${segment.start} returned HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.data ?? []).flatMap((row) => {
    const rawValue = row.values?.find((item) => item._id === segment.indicator)?.value;
    const value = typeof rawValue === "string" && rawValue.trim() !== "" ? Number(rawValue) : Number.NaN;
    const code = String(row.code ?? "").slice(0, 6);
    return /^\d{6}$/.test(code) && Number.isFinite(value) && value > 0 ? [[`${code.slice(0, 4)}-${code.slice(4)}-01`, value]] : [];
  });
}

async function fetchCpiHistory() {
  const monthlyRates = (await Promise.all(CPI_SEGMENTS.map(fetchCpiSegment))).flat().sort((a, b) => a[0].localeCompare(b[0]));
  if (monthlyRates.length < 250) throw new Error(`NBS CPI returned only ${monthlyRates.length} months`);
  let index = 100;
  return monthlyRates.map(([date, relative]) => {
    index *= relative / 100;
    return [date, Number(index.toFixed(6))];
  });
}

async function main() {
  const [safeRows, cpiPoints] = await Promise.all([fetchSafeHistory(), fetchCpiHistory()]);
  const usdPoints = safeRows.map(([date, usd]) => [date, Number(usd.toFixed(6))]);
  const hkdPoints = safeRows.map(([date, , hkd]) => [date, Number(hkd.toFixed(6))]);
  const retrieved = isoDate(new Date());
  const payload = {
    retrieved,
    fx: {
      USD_CNY: {
        source: "国家外汇管理局人民币汇率中间价（数据来自中国外汇交易中心）",
        sourceUrl: "https://www.safe.gov.cn/safe/rmbhlzjj/",
        definition: "1美元折合人民币；工作日参考中间价，不是银行或券商实际换汇成交价",
        firstDate: usdPoints[0][0],
        lastDate: usdPoints.at(-1)[0],
        points: usdPoints,
      },
      HKD_CNY: {
        source: "国家外汇管理局人民币汇率中间价（数据来自中国外汇交易中心）",
        sourceUrl: "https://www.safe.gov.cn/safe/rmbhlzjj/",
        definition: "1港元折合人民币；工作日参考中间价，不是银行或券商实际换汇成交价",
        firstDate: hkdPoints[0][0],
        lastDate: hkdPoints.at(-1)[0],
        points: hkdPoints,
      },
    },
    cpiCny: {
      source: "国家统计局全国居民消费价格指数（上月=100）",
      sourceUrl: "https://data.stats.gov.cn/easyquery.htm?cn=A01",
      definition: "月度环比指数累乘并以2000年初为基准；用于估算人民币购买力变化",
      firstDate: cpiPoints[0][0],
      lastDate: cpiPoints.at(-1)[0],
      points: cpiPoints,
    },
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(tempPath, `${JSON.stringify(payload)}\n`, "utf8");
  await fs.rename(tempPath, outputPath);
  console.log(`Wrote ${outputPath}`);
  console.log(`FX: ${usdPoints.length} workdays through ${usdPoints.at(-1)[0]}; CPI: ${cpiPoints.length} months through ${cpiPoints.at(-1)[0]}`);
}

main().catch(async (error) => {
  await fs.rm(tempPath, { force: true }).catch(() => {});
  console.error(`Macro data update failed; existing file was preserved: ${error.message}`);
  process.exitCode = 1;
});
