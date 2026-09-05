import fs from "node:fs/promises";
import path from "node:path";
import { ETF_PACK_GROUPS, officialListingUrl } from "./etf-pack-config.mjs";

const root = process.cwd();
const outputPath = path.join(root, "public", "data", "etf-product-metadata.json");
const asOf = new Date().toISOString().slice(0, 10);
const pauseMs = Number(process.env.METADATA_FETCH_PAUSE_MS || 250);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const directory = JSON.parse(await fs.readFile(path.join(root, "public", "data", "securities.json"), "utf8"));
const directoryById = new Map(directory.map((item) => [item.id, item]));

const verifiedDetails = {
  "US:QQQ": { expenseRatio: 0.18, expenseRatioLabel: "总费率", feeAsOf: "2025-12-22", inceptionDate: "1999-03-10", benchmark: "Nasdaq-100 Index", issuer: "Invesco", officialProductUrl: "https://www.invesco.com/qqq-etf/en/home.html", quoteCurrency: "USD" },
  "US:VOO": { expenseRatio: 0.03, expenseRatioLabel: "费用率", feeAsOf: "2026-04-28", inceptionDate: "2010-09-07", benchmark: "S&P 500 Index", issuer: "Vanguard", officialProductUrl: "https://investor.vanguard.com/investment-products/etfs/profile/voo", quoteCurrency: "USD" },
  "US:SPY": { expenseRatio: 0.0945, expenseRatioLabel: "总费率", feeAsOf: "2026-07-28", inceptionDate: "1993-01-22", benchmark: "S&P 500 Index", issuer: "State Street", officialProductUrl: "https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy", quoteCurrency: "USD" },
  "US:VTI": { expenseRatio: 0.03, expenseRatioLabel: "费用率", feeAsOf: "2026-04-28", inceptionDate: "2001-05-24", benchmark: "CRSP US Total Market Index", issuer: "Vanguard", officialProductUrl: "https://investor.vanguard.com/investment-products/etfs/profile/vti", quoteCurrency: "USD" },
  "US:VT": { expenseRatio: 0.06, expenseRatioLabel: "费用率", feeAsOf: "2026-02-27", inceptionDate: "2008-06-24", benchmark: "FTSE Global All Cap Index", issuer: "Vanguard", officialProductUrl: "https://investor.vanguard.com/investment-products/etfs/profile/vt", quoteCurrency: "USD" },
  "US:SCHX": { expenseRatio: 0.03, expenseRatioLabel: "总费率", feeAsOf: "2026-07-31", inceptionDate: "2009-11-03", benchmark: "Dow Jones U.S. Large-Cap Total Stock Market Index", issuer: "Schwab", officialProductUrl: "https://www.schwabassetmanagement.com/products/schx", quoteCurrency: "USD" },
};

function textFromHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function take(text, pattern) {
  const value = text.match(pattern)?.[1]?.trim();
  return value && value !== "---" ? value : null;
}

async function fetchCnDetail(symbol) {
  const url = `https://fundf10.eastmoney.com/jbgk_${symbol}.html`;
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; InvestingClarityLab/1.0)" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = textFromHtml(await response.text());
  const managementFeeText = take(text, /管理费率\s*([0-9.]+)%/);
  const custodianFeeText = take(text, /托管费率\s*([0-9.]+)%/);
  const parsed = {
    issuer: take(text, /基金管理人\s*([^\s]+基金)/) ?? take(text, /管理人：\s*([^\s<]+)/),
    benchmark: take(text, /业绩比较基准\s*(.*?)\s*跟踪标的/),
    trackingIndex: take(text, /跟踪标的\s*(.*?)\s*(?:◆|什么是)/),
    inceptionDate: take(text, /成立日期：\s*(\d{4}-\d{2}-\d{2})/),
    managementFee: managementFeeText == null ? null : Number(managementFeeText),
    custodianFee: custodianFeeText == null ? null : Number(custodianFeeText),
  };
  return {
    ...parsed,
    detailSourceUrl: url,
    detailSourceType: "secondary",
    metadataStatus: Object.values(parsed).some((value) => value != null) ? "secondary-detail-with-official-listing" : "official-listing-only",
  };
}

let previous = {};
try {
  previous = JSON.parse(await fs.readFile(outputPath, "utf8")).entries ?? {};
} catch { /* first build */ }

const entries = {};
for (const [market, groups] of Object.entries(ETF_PACK_GROUPS)) {
  for (const symbol of Object.values(groups).flat()) {
    const id = `${market}:${symbol}`;
    const security = directoryById.get(id);
    if (!security) throw new Error(`Missing directory entry for ${id}`);
    let detail = verifiedDetails[id]
      ? { ...verifiedDetails[id], detailSourceUrl: verifiedDetails[id].officialProductUrl, detailSourceType: "official", metadataStatus: "verified-official-detail" }
      : {};
    if (market === "CN") {
      try {
        detail = { ...detail, ...await fetchCnDetail(symbol) };
      } catch (error) {
        detail = { ...(previous[id] ?? detail), metadataWarning: `资料页本次读取失败：${error.message}` };
      }
      await delay(pauseMs);
    }
    entries[id] = {
      id,
      symbol,
      name: security.name,
      market,
      issuer: null,
      benchmark: null,
      trackingIndex: null,
      inceptionDate: null,
      listingDate: null,
      managementFee: null,
      custodianFee: null,
      expenseRatio: null,
      expenseRatioLabel: null,
      feeAsOf: null,
      distributionPolicy: "官方资料未结构化披露",
      quoteCurrency: market === "US" ? "USD" : market === "HK" ? "HKD" : "CNY",
      officialListingUrl: officialListingUrl(market, symbol),
      officialProductUrl: null,
      detailSourceUrl: null,
      detailSourceType: null,
      metadataStatus: "official-listing-only",
      metadataAsOf: asOf,
      ...detail,
    };
  }
}

const payload = {
  version: 1,
  generated: asOf,
  notes: "交易所/SEC链接用于核对证券身份；部分A股结构化字段来自天天基金并明确标为二手来源。无法核验的字段保持为空，不以推测补齐。",
  entries,
};
const temporary = `${outputPath}.tmp`;
await fs.writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
await fs.rename(temporary, outputPath);
console.log(`Product metadata generated: ${Object.keys(entries).length}/300 entries`);
