import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const symbols = ["QQQ", "VOO", "SPY", "VTI", "VT", "SCHX"];
const source = "Yahoo Finance Chart API（日终复权收盘价）；基金资料由发行方页面交叉核验";
const retrieved = new Date().toISOString().slice(0, 10);
const output = {};

for (const symbol of symbols) {
  const params = new URLSearchParams({ period1: "0", period2: String(Math.floor(Date.now() / 1000)), interval: "1d", events: "div,splits", includeAdjustedClose: "true" });
  let response;
  for (const host of ["query2.finance.yahoo.com", "query1.finance.yahoo.com"]) {
    response = await fetch(`https://${host}/v8/finance/chart/${symbol}?${params}`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; JianTouAcademy/1.0)", accept: "application/json" },
    });
    if (response.ok) break;
  }
  if (!response?.ok) throw new Error(`${symbol} download failed: ${response?.status ?? "no response"}. Existing verified data was not overwritten.`);
  const payload = await response.json();
  const chart = payload?.chart?.result?.[0];
  const timestamps = chart?.timestamp ?? [];
  const adjusted = chart?.indicators?.adjclose?.[0]?.adjclose ?? [];
  const points = timestamps
    .map((timestamp, index) => {
      const price = adjusted[index];
      if (!Number.isFinite(price)) return null;
      return [new Date(timestamp * 1000).toISOString().slice(0, 10), Math.round(price * 10000) / 10000];
    })
    .filter(Boolean);

  if (points.length < 1000) throw new Error(`${symbol} history is unexpectedly short`);
  output[symbol] = {
    source,
    retrieved,
    firstDate: points[0][0],
    lastDate: points.at(-1)[0],
    points,
  };
}

const target = path.join(root, "public", "data", "etf-history.json");
const temporary = `${target}.next`;
fs.writeFileSync(temporary, JSON.stringify(output));
fs.renameSync(temporary, target);

console.log(
  Object.fromEntries(
    Object.entries(output).map(([symbol, series]) => [
      symbol,
      { points: series.points.length, first: series.firstDate, last: series.lastDate },
    ]),
  ),
);
