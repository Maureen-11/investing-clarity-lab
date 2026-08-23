import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ETF_PACK_GROUPS, eastmoneyQuoteId, eastmoneySourceUrl } from "./etf-pack-config.mjs";

const root = process.cwd();
const targetRoot = path.join(root, "public", "data", "etf-history");
const retrieved = new Date().toISOString().slice(0, 10);
const minimumPoints = 20;
const requestPauseMs = Number(process.env.ETF_FETCH_PAUSE_MS || 500);
const retryWaits = [2000, 6000, 15000];
const headers = {
  accept: "application/json,text/plain,*/*",
  referer: "https://quote.eastmoney.com/",
  "user-agent": "Mozilla/5.0 (compatible; InvestingClarityLab/1.0; +https://github.com/Maureen-11/investing-clarity-lab)",
};

const items = Object.entries(ETF_PACK_GROUPS).flatMap(([market, groups]) =>
  Object.values(groups).flatMap((symbols) => symbols.map((symbol) => ({ market, symbol, id: `${market}:${symbol}` }))),
);
let eastmoneyAvailable = process.env.ETF_SKIP_EASTMONEY !== "1";

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function endpoint(quoteId) {
  const params = new URLSearchParams({
    secid: quoteId,
    klt: "101",
    fqt: "1",
    lmt: "1000000",
    beg: "0",
    end: "20500101",
    iscca: "1",
    fields1: "f1,f2,f3,f4,f5,f6,f7,f8",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
  });
  return `https://push2his.eastmoney.com/api/qt/stock/kline/get?${params}`;
}

function parseRows(item, rows, provenance) {
  if (!Array.isArray(rows)) throw new Error(`${item.id} returned no kline array`);
  const byDate = new Map();
  for (const row of rows) {
    const fields = Array.isArray(row) ? row : String(row).split(",");
    const [date, , close] = fields;
    const value = Number(close);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(value) && value > 0) byDate.set(date, Math.round(value * 1000000) / 1000000);
  }
  const points = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (points.length < minimumPoints) throw new Error(`${item.id} history has only ${points.length} valid points`);
  return {
    ...provenance,
    retrieved,
    firstDate: points[0][0],
    lastDate: points.at(-1)[0],
    points,
    seriesType: "vendor-adjusted-price",
    adjustment: "forward-adjusted",
    licenseStatus: "not-confirmed",
  };
}

async function fetchEastmoney(item) {
  const url = endpoint(eastmoneyQuoteId(item.market, item.symbol));
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return parseRows(item, payload?.data?.klines, {
    source: "东方财富日线前复权行情（fqt=1）",
    provider: "eastmoney",
    providerSymbol: eastmoneyQuoteId(item.market, item.symbol),
    sourceUrl: eastmoneySourceUrl(item.market, item.symbol),
  });
}

function tencentBaseSymbol(item) {
  if (item.market === "CN") return `${item.symbol.startsWith("159") ? "sz" : "sh"}${item.symbol}`;
  if (item.market === "HK") return `hk${item.symbol}`;
  return `us${item.symbol}`;
}

async function resolveTencentSymbol(item) {
  const base = tencentBaseSymbol(item);
  if (item.market !== "US") return base;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get?param=${encodeURIComponent(`${base},day,,,2,qfq`)}`;
  const response = await fetch(url, { headers: { ...headers, referer: "https://gu.qq.com/" }, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Tencent symbol lookup HTTP ${response.status}`);
  const payload = await response.json();
  const quote = payload?.data?.[base]?.qt?.[base]?.[2];
  if (!quote || !quote.startsWith(`${item.symbol}.`)) throw new Error(`Tencent symbol lookup failed for ${item.id}`);
  return `us${quote}`;
}

function previousDate(date) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

async function fetchTencent(item) {
  const symbol = await resolveTencentSymbol(item);
  const route = item.market === "US" ? "usfqkline" : "fqkline";
  const pageSize = item.market === "US" ? 1024 : 640;
  const rows = [];
  let end = "";
  for (let page = 0; page < 30; page += 1) {
    const param = `${symbol},day,,${end},${pageSize},qfq`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/${route}/get?param=${encodeURIComponent(param)}`;
    const response = await fetch(url, {
      headers: { ...headers, referer: "https://gu.qq.com/" },
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const block = payload?.data?.[symbol];
    const pageRows = block?.qfqday ?? block?.day ?? [];
    if (!Array.isArray(pageRows) || !pageRows.length) break;
    rows.unshift(...pageRows);
    if (pageRows.length < pageSize) break;
    const nextEnd = previousDate(pageRows[0][0]);
    if (nextEnd === end) break;
    end = nextEnd;
    await delay(180);
  }
  return parseRows(item, rows, {
    source: "腾讯证券日线前复权行情（qfq）",
    provider: "tencent",
    providerSymbol: symbol,
    sourceUrl: `https://gu.qq.com/${symbol}/gp`,
  });
}

async function fetchSeries(item) {
  if (eastmoneyAvailable) {
    try {
      return await fetchEastmoney(item);
    } catch (error) {
      console.warn(`${item.id} Eastmoney unavailable (${error?.cause?.code || error.message}); using Tencent fallback`);
    }
  }
  let lastError;
  for (let attempt = 0; attempt <= retryWaits.length; attempt += 1) {
    try {
      return await fetchTencent(item);
    } catch (error) {
      lastError = error;
      if (attempt < retryWaits.length) {
        const wait = retryWaits[attempt];
        console.warn(`${item.id} fallback attempt ${attempt + 1} failed; retrying in ${wait / 1000}s`);
        await delay(wait);
      }
    }
  }
  throw new Error(`${item.id} download failed from both providers: ${lastError?.message || lastError}`);
}

async function readExisting(item) {
  try {
    return JSON.parse(await fs.readFile(path.join(targetRoot, item.market, `${item.symbol}.json`), "utf8"));
  } catch {
    return null;
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function reconcileWithExisting(item, next, previous) {
  if (!previous?.lastDate) return next;
  if (next.lastDate < previous.lastDate) throw new Error(`${item.id} last date regressed from ${previous.lastDate} to ${next.lastDate}`);
  if (next.firstDate <= previous.firstDate || next.points.length >= previous.points.length * 0.98) return next;

  const previousByDate = new Map(previous.points);
  const overlaps = next.points
    .filter(([date, price]) => previousByDate.has(date) && Number.isFinite(price) && price > 0)
    .slice(-120)
    .map(([date, price]) => previousByDate.get(date) / price);
  if (overlaps.length < 20) throw new Error(`${item.id} shorter provider history has only ${overlaps.length} overlap points`);
  const scale = median(overlaps);
  const maxDeviation = Math.max(...overlaps.map((value) => Math.abs(value / scale - 1)));
  if (!Number.isFinite(scale) || scale <= 0 || maxDeviation > 0.02) {
    throw new Error(`${item.id} provider overlap is inconsistent (${(maxDeviation * 100).toFixed(2)}% max deviation)`);
  }
  const extension = next.points
    .filter(([date]) => date > previous.lastDate)
    .map(([date, price]) => [date, Math.round(price * scale * 1000000) / 1000000]);
  if (!extension.length && next.lastDate > previous.lastDate) throw new Error(`${item.id} could not extend the prior history`);
  console.log(`${item.id}: preserving longer ${previous.firstDate} history and appending ${extension.length} provider-adjusted points`);
  return {
    ...next,
    source: `${previous.source}；${next.source}重叠校验后延长`,
    provider: `hybrid-${previous.provider || "legacy"}-${next.provider}`,
    firstDate: previous.firstDate,
    points: [...previous.points, ...extension],
  };
}

const stageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "investing-clarity-etf-"));
const completed = [];
try {
  if (eastmoneyAvailable) {
    const probeUrl = endpoint(eastmoneyQuoteId(items[0].market, items[0].symbol)).replace("lmt=1000000", "lmt=2");
    try {
      const probe = await fetch(probeUrl, { headers, signal: AbortSignal.timeout(8_000) });
      if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
      const payload = await probe.json();
      if (!payload?.data?.klines?.length) throw new Error("empty probe response");
      console.log("Eastmoney preflight passed; using it as the primary provider");
    } catch (error) {
      eastmoneyAvailable = false;
      console.warn(`Eastmoney preflight failed (${error?.cause?.code || error.message}); using Tencent for this complete run`);
    }
  }
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const history = reconcileWithExisting(item, await fetchSeries(item), await readExisting(item));
    const destination = path.join(stageRoot, item.market, `${item.symbol}.json`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, `${JSON.stringify(history)}\n`, "utf8");
    completed.push({ ...item, firstDate: history.firstDate, lastDate: history.lastDate, points: history.points.length });
    console.log(`[${index + 1}/100] ${item.id}: ${history.firstDate}—${history.lastDate} (${history.points.length})`);
    await delay(requestPauseMs);
    if ((index + 1) % 25 === 0 && index + 1 < items.length) await delay(10_000);
  }

  if (completed.length !== 100) throw new Error(`Refusing to publish a partial pack: ${completed.length}/100 histories completed`);
  for (const item of items) {
    const sourcePath = path.join(stageRoot, item.market, `${item.symbol}.json`);
    const destination = path.join(targetRoot, item.market, `${item.symbol}.json`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.next`;
    await fs.copyFile(sourcePath, temporary);
    await fs.rename(temporary, destination);
  }
  console.log(`ETF history promotion complete: ${completed.length}/100, retrieved ${retrieved}`);
} finally {
  await fs.rm(stageRoot, { recursive: true, force: true });
}
