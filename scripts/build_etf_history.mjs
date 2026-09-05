import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import zlib from "node:zlib";
import { ETF_PACK_GROUPS, INDEX_PACK, eastmoneySourceUrl, staticEastmoneyQuoteId } from "./etf-pack-config.mjs";

const root = process.cwd();
const dataRoot = path.join(root, "public", "data");
const retrieved = new Date().toISOString().slice(0, 10);
const minimumPoints = 20;
const requestPauseMs = Number(process.env.ETF_FETCH_PAUSE_MS || 500);
const retryWaits = [2000, 6000, 15000];
const headers = {
  accept: "application/json,text/plain,*/*",
  referer: "https://quote.eastmoney.com/",
  "user-agent": "Mozilla/5.0 (compatible; InvestingClarityLab/1.0; +https://github.com/Maureen-11/investing-clarity-lab)",
};

const etfs = Object.entries(ETF_PACK_GROUPS).flatMap(([market, groups]) =>
  Object.values(groups).flatMap((symbols) => symbols.map((symbol) => ({ kind: "etf", market, symbol, id: `${market}:${symbol}` }))),
);
const items = [...etfs, ...INDEX_PACK.map((item) => ({ ...item, kind: "index" }))];
let eastmoneyAvailable = process.env.ETF_SKIP_EASTMONEY !== "1";

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const targetPath = (item) => item.kind === "index"
  ? path.join(dataRoot, "index-history", `${item.id.replaceAll(":", "-")}.json`)
  : path.join(dataRoot, "etf-history", item.market, `${item.symbol}.json`);

function endpoint(quoteId, adjusted) {
  const params = new URLSearchParams({
    secid: quoteId,
    klt: "101",
    fqt: adjusted ? "1" : "0",
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
    const value = Number(String(close).replaceAll(",", ""));
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
    seriesType: provenance.seriesType ?? (item.kind === "index" ? "price-only" : "vendor-adjusted-price"),
    adjustment: provenance.adjustment ?? (item.kind === "index" ? "none" : "forward-adjusted"),
    instrumentKind: item.kind,
    licenseStatus: "not-confirmed",
  };
}

async function readExisting(item) {
  try {
    return JSON.parse(await fs.readFile(targetPath(item), "utf8"));
  } catch {
    return null;
  }
}

async function resolveEastmoneyQuoteId(item, previous) {
  if (item.quoteId) return item.quoteId;
  const staticId = staticEastmoneyQuoteId(item.market, item.symbol);
  if (staticId) return staticId;
  if (previous?.provider === "eastmoney" && /^\d+\./.test(previous.providerSymbol || "")) return previous.providerSymbol;
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(item.symbol)}&type=14&count=20`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`symbol lookup HTTP ${response.status}`);
  const payload = await response.json();
  const matches = payload?.QuotationCodeTable?.Data ?? [];
  const match = matches.find((candidate) => candidate.Code?.toUpperCase() === item.symbol.toUpperCase() && candidate.Classify === "UsStock");
  if (!match?.QuoteID) throw new Error(`no unambiguous US quote id for ${item.id}`);
  return match.QuoteID;
}

async function fetchEastmoney(item, previous) {
  const quoteId = await resolveEastmoneyQuoteId(item, previous);
  const response = await fetch(endpoint(quoteId, item.kind === "etf"), { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return parseRows(item, payload?.data?.klines, {
    source: item.kind === "index" ? "东方财富指数日线行情" : "东方财富日线前复权行情（fqt=1）",
    provider: "eastmoney",
    providerSymbol: quoteId,
    sourceUrl: item.kind === "index" ? item.sourceUrl : eastmoneySourceUrl(item.market, item.symbol),
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
  if (item.kind !== "etf") throw new Error("Tencent fallback is only configured for ETFs");
  const symbol = await resolveTencentSymbol(item);
  const route = item.market === "US" ? "usfqkline" : "fqkline";
  const pageSize = item.market === "US" ? 1024 : 640;
  const rows = [];
  let end = "";
  for (let page = 0; page < 30; page += 1) {
    const param = `${symbol},day,,${end},${pageSize},qfq`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/${route}/get?param=${encodeURIComponent(param)}`;
    const response = await fetch(url, { headers: { ...headers, referer: "https://gu.qq.com/" }, signal: AbortSignal.timeout(25_000) });
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

async function fetchTencentIndex(item) {
  if (item.kind !== "index" || item.market !== "HK") throw new Error("Tencent index fallback only supports Hong Kong indices");
  const symbol = `hk${item.symbol}`;
  const rows = [];
  let end = "";
  for (let page = 0; page < 30; page += 1) {
    const param = `${symbol},day,,${end},640`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param=${encodeURIComponent(param)}`;
    const response = await fetch(url, { headers: { ...headers, referer: "https://gu.qq.com/" }, signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const pageRows = payload?.data?.[symbol]?.day ?? [];
    if (!Array.isArray(pageRows) || !pageRows.length) break;
    rows.unshift(...pageRows);
    if (pageRows.length < 640) break;
    const nextEnd = previousDate(pageRows[0][0]);
    if (nextEnd === end) break;
    end = nextEnd;
    await delay(180);
  }
  return parseRows(item, rows, {
    source: "腾讯证券指数日线价格",
    provider: "tencent",
    providerSymbol: symbol,
    sourceUrl: item.sourceUrl,
  });
}

async function fetchEastmoneyFundNav(item) {
  if (item.kind !== "etf" || item.market !== "CN") throw new Error("Eastmoney cumulative NAV fallback only supports mainland ETFs");
  const sourceUrl = `https://fund.eastmoney.com/${item.symbol}.html`;
  const dataUrl = `https://fund.eastmoney.com/pingzhongdata/${item.symbol}.js?v=${retrieved.replaceAll("-", "")}`;
  const response = await fetch(dataUrl, { headers: { ...headers, referer: sourceUrl }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const script = await response.text();
  const serialized = script.match(/var\s+Data_ACWorthTrend\s*=\s*(\[.*?\]);/s)?.[1];
  if (!serialized) throw new Error("cumulative NAV series is absent");
  const values = JSON.parse(serialized);
  const rows = values.map(([timestamp, value]) => [new Date(timestamp).toISOString().slice(0, 10), null, value]);
  return parseRows(item, rows, {
    source: "东方财富基金累计净值历史（产品页公开数据）",
    provider: "eastmoney-fund-nav",
    providerSymbol: item.symbol,
    sourceUrl,
    seriesType: "vendor-cumulative-nav",
    adjustment: "cumulative-net-value-including-distributions",
  });
}

async function fetchRussell2000(item) {
  const sourceUrl = "https://chartexchange.com/symbol/index-rut/historical/";
  const response = await fetch(sourceUrl, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`ChartExchange HTTP ${response.status}`);
  const html = await response.text();
  const rows = [];
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const date = row[1].match(/<a name="(\d{4}-\d{2}-\d{2})"/i)?.[1];
    if (!date) continue;
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .slice(1)
      .map((cell) => cell[1].replace(/<[^>]+>/g, "").trim());
    const close = cells[3];
    rows.push([date, null, close]);
  }
  return parseRows(item, rows, {
    source: "ChartExchange Russell 2000日线价格（公开页面）",
    provider: "chartexchange",
    providerSymbol: "index-rut",
    sourceUrl,
  });
}

const BAO_SPLIT = "\x01";
function baoHeader(type, body) {
  return `00.9.30${BAO_SPLIT}${type}${BAO_SPLIT}${String(Buffer.byteLength(body)).padStart(10, "0")}`;
}

function baoRequest(socket, type, body) {
  return new Promise((resolve, reject) => {
    const headBody = `${baoHeader(type, body)}${body}`;
    const message = `${headBody}${BAO_SPLIT}${zlib.crc32(Buffer.from(headBody))}\n`;
    const chunks = [];
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };
    const onError = (error) => { cleanup(); reject(error); };
    const onTimeout = () => { cleanup(); reject(new Error("BaoStock socket timeout")); };
    const onData = (chunk) => {
      chunks.push(chunk);
      const received = Buffer.concat(chunks);
      if (received.subarray(-13).toString() !== "<![CDATA[]]>\n") return;
      cleanup();
      const header = received.subarray(0, 21).toString().split(BAO_SPLIT);
      const compressedLength = Number(header[2]);
      const bodyText = ["96", "99", "9B", "9D"].includes(header[1])
        ? zlib.inflateSync(received.subarray(21, 21 + compressedLength)).toString()
        : received.subarray(21).toString();
      resolve(bodyText);
    };
    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("timeout", onTimeout);
    socket.write(message);
  });
}

async function fetchBaoStock(item) {
  if (item.kind !== "etf" || item.market !== "CN") throw new Error("BaoStock fallback only supports mainland ETFs");
  const socket = net.createConnection({ host: "public-api.baostock.com", port: 10030 });
  socket.setTimeout(30_000);
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
  try {
    const login = String(await baoRequest(socket, "00", ["login", "anonymous", "123456", "0"].join(BAO_SPLIT))).split(BAO_SPLIT);
    if (login[0] !== "0") throw new Error(`BaoStock login failed: ${login[1] || login[0]}`);
    const code = `${item.symbol.startsWith("159") ? "sz" : "sh"}.${item.symbol}`;
    const rows = [];
    for (let page = 1; page <= 20; page += 1) {
      const query = ["query_history_k_data_plus", "anonymous", String(page), "2000", code, "date,close", "2000-01-01", retrieved, "d", "2"].join(BAO_SPLIT);
      const fields = String(await baoRequest(socket, "95", query)).split(BAO_SPLIT);
      if (fields[0] !== "0") throw new Error(`BaoStock query failed: ${fields[1] || fields[0]}`);
      const records = JSON.parse(fields[6] || '{"record":[]}').record ?? [];
      rows.push(...records.map(([date, close]) => [date, null, close]));
      if (records.length < 2000) break;
    }
    return parseRows(item, rows, {
      source: "BaoStock日线前复权行情（adjustflag=2）",
      provider: "baostock",
      providerSymbol: code,
      sourceUrl: "https://baostock.com/baostock/index.php/证券宝介绍",
    });
  } finally {
    socket.destroy();
  }
}

async function fetchSeries(item, previous) {
  if (item.id === "INDEX:US:RUT") return fetchRussell2000(item);
  if (item.kind === "index" && item.market === "HK") {
    try {
      return await fetchEastmoney(item, previous);
    } catch (error) {
      console.warn(`${item.id} Eastmoney unavailable (${error?.cause?.code || error.message}); using Tencent index fallback`);
      return fetchTencentIndex(item);
    }
  }
  if (eastmoneyAvailable) {
    try {
      return await fetchEastmoney(item, previous);
    } catch (error) {
      console.warn(`${item.id} Eastmoney unavailable (${error?.cause?.code || error.message});${item.kind === "etf" ? " using Tencent fallback" : " retrying"}`);
      if (item.kind === "etf" && item.market === "CN") {
        try {
          return await fetchBaoStock(item);
        } catch (fallbackError) {
          console.warn(`${item.id} BaoStock unavailable (${fallbackError.message}); using Tencent fallback`);
        }
      }
    }
  }
  if (!eastmoneyAvailable && item.kind === "etf" && item.market === "CN") {
    try {
      return await fetchEastmoneyFundNav(item);
    } catch (navError) {
      console.warn(`${item.id} cumulative NAV unavailable (${navError.message}); trying Tencent`);
      try {
        return await fetchTencent(item);
      } catch (fallbackError) {
        console.warn(`${item.id} Tencent unavailable (${fallbackError.message}); using BaoStock fallback`);
        return fetchBaoStock(item);
      }
    }
  }
  let lastError;
  for (let attempt = 0; attempt <= retryWaits.length; attempt += 1) {
    try {
      return item.kind === "etf" ? await fetchTencent(item) : await fetchEastmoney(item, previous);
    } catch (error) {
      lastError = error;
      if (attempt < retryWaits.length) {
        const wait = retryWaits[attempt];
        console.warn(`${item.id} attempt ${attempt + 1} failed; retrying in ${wait / 1000}s`);
        await delay(wait);
      }
    }
  }
  throw new Error(`${item.id} download failed: ${lastError?.message || lastError}`);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function reconcileWithExisting(item, next, previous) {
  if (!previous?.lastDate) return next;
  const publicationLagDays = (new Date(`${previous.lastDate}T00:00:00Z`) - new Date(`${next.lastDate}T00:00:00Z`)) / 86400000;
  if (next.firstDate < previous.firstDate && next.points.length > previous.points.length * 1.5 && publicationLagDays >= 0 && publicationLagDays <= 7) {
    return {
      ...next,
      updateWarning: `累计净值更新至${next.lastDate}，比交易所价格日期晚${publicationLagDays}天；为避免用短价格片段冒充完整历史，分析采用更长的累计净值序列`,
    };
  }
  if (next.firstDate < previous.firstDate && next.lastDate < previous.lastDate) {
    const nextByDate = new Map(next.points);
    const overlaps = previous.points
      .filter(([date, price]) => nextByDate.has(date) && Number.isFinite(price) && price > 0)
      .slice(-120)
      .map(([date, price]) => price / nextByDate.get(date));
    if (overlaps.length >= 20) {
      const scale = median(overlaps);
      const maxDeviation = Math.max(...overlaps.map((value) => Math.abs(value / scale - 1)));
      if (Number.isFinite(scale) && scale > 0 && maxDeviation <= 0.02) {
        const extension = previous.points
          .filter(([date]) => date > next.lastDate)
          .map(([date, price]) => [date, Math.round((price / scale) * 1000000) / 1000000]);
        return {
          ...next,
          source: `${next.source}；${previous.source}经重叠校验后补齐最近交易日`,
          provider: `hybrid-${next.provider}-${previous.provider || "legacy"}`,
          lastDate: previous.lastDate,
          points: [...next.points, ...extension],
        };
      }
    }
  }
  if (next.lastDate < previous.lastDate) throw new Error(`${item.id} last date regressed from ${previous.lastDate} to ${next.lastDate}`);
  if (next.firstDate <= previous.firstDate || next.points.length >= previous.points.length * 0.98) return next;
  const previousByDate = new Map(previous.points);
  const overlaps = next.points.filter(([date, price]) => previousByDate.has(date) && Number.isFinite(price) && price > 0).slice(-120).map(([date, price]) => previousByDate.get(date) / price);
  if (overlaps.length < 20) throw new Error(`${item.id} shorter provider history has only ${overlaps.length} overlap points`);
  const scale = median(overlaps);
  const maxDeviation = Math.max(...overlaps.map((value) => Math.abs(value / scale - 1)));
  if (!Number.isFinite(scale) || scale <= 0 || maxDeviation > 0.02) throw new Error(`${item.id} provider overlap is inconsistent (${(maxDeviation * 100).toFixed(2)}% max deviation)`);
  const extension = next.points.filter(([date]) => date > previous.lastDate).map(([date, price]) => [date, Math.round(price * scale * 1000000) / 1000000]);
  return { ...next, source: `${previous.source}；${next.source}重叠校验后延长`, provider: `hybrid-${previous.provider || "legacy"}-${next.provider}`, firstDate: previous.firstDate, points: [...previous.points, ...extension] };
}

const stageRoot = path.join(root, ".cache", "instrument-history", retrieved);
await fs.mkdir(stageRoot, { recursive: true });
const completed = [];
let networkCompleted = 0;
try {
  if (eastmoneyAvailable) {
    try {
      const probe = await fetch(endpoint(staticEastmoneyQuoteId(etfs[0].market, etfs[0].symbol), true).replace("lmt=1000000", "lmt=2"), { headers, signal: AbortSignal.timeout(8_000) });
      const payload = await probe.json();
      if (!probe.ok || !payload?.data?.klines?.length) throw new Error(`HTTP ${probe.status}`);
      console.log("Eastmoney preflight passed; using it as the primary provider");
    } catch (error) {
      eastmoneyAvailable = false;
      console.warn(`Eastmoney preflight failed (${error?.cause?.code || error.message}); using fallbacks for this complete run`);
    }
  }
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const relative = path.relative(dataRoot, targetPath(item));
    const destination = path.join(stageRoot, relative);
    let history;
    let cacheHit = false;
    try {
      history = JSON.parse(await fs.readFile(destination, "utf8"));
      if (history.retrieved !== retrieved || !Array.isArray(history.points) || history.points.length < minimumPoints) throw new Error("stale cache");
      if (process.env.ETF_REFRESH_BAOSTOCK === "1" && String(history.provider || "").includes("baostock")) throw new Error("refreshing shortened BaoStock history");
      cacheHit = true;
      console.log(`[cache] ${item.id}`);
    } catch {
      const previous = await readExisting(item);
      try {
        history = reconcileWithExisting(item, await fetchSeries(item, previous), previous);
      } catch (error) {
        if (!previous?.points?.length) throw error;
        history = { ...previous, lastAttempt: retrieved, updateWarning: error.message };
        console.warn(`${item.id}: retaining the last valid snapshot after update failure (${error.message})`);
      }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, `${JSON.stringify(history)}\n`, "utf8");
    }
    completed.push({ ...item, firstDate: history.firstDate, lastDate: history.lastDate, points: history.points.length });
    console.log(`[${index + 1}/${items.length}] ${item.id}: ${history.firstDate}—${history.lastDate} (${history.points.length})`);
    if (!cacheHit) {
      networkCompleted += 1;
      await delay(requestPauseMs);
      if (networkCompleted % 25 === 0 && index + 1 < items.length) await delay(8_000);
    }
  }
  if (completed.length !== items.length) throw new Error(`Refusing to promote a partial pack: ${completed.length}/${items.length} histories completed`);
  for (const item of items) {
    const relative = path.relative(dataRoot, targetPath(item));
    const sourcePath = path.join(stageRoot, relative);
    const destination = targetPath(item);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.next`;
    await fs.copyFile(sourcePath, temporary);
    await fs.rename(temporary, destination);
  }
  console.log(`Instrument history promotion complete: ${completed.length}/${items.length}, retrieved ${retrieved}`);
} finally {
  console.log(`Run cache retained at ${stageRoot} for safe resume`);
}
