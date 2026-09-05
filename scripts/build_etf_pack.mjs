import fs from "node:fs/promises";
import path from "node:path";
import { ETF_PACK_EXPECTED, ETF_PACK_GROUPS, INDEX_PACK, INDEX_PACK_EXPECTED } from "./etf-pack-config.mjs";

const dataRoot = path.join(process.cwd(), "public", "data");
const directory = JSON.parse(await fs.readFile(path.join(dataRoot, "securities.json"), "utf8"));
const metadata = JSON.parse(await fs.readFile(path.join(dataRoot, "etf-product-metadata.json"), "utf8"));
const directoryById = new Map(directory.map((item) => [item.id, item]));
const entries = [];

for (const [market, groups] of Object.entries(ETF_PACK_GROUPS)) {
  for (const [category, symbols] of Object.entries(groups)) {
    for (const symbol of symbols) {
      const id = `${market}:${symbol}`;
      const security = directoryById.get(id);
      if (!security) throw new Error(`ETF pack security is missing from directory: ${id}`);
      const historyPath = `data/etf-history/${market}/${symbol}.json`;
      const history = JSON.parse(await fs.readFile(path.join(dataRoot, ...historyPath.replace(/^data\//, "").split("/")), "utf8"));
      if (!Array.isArray(history.points) || history.points.length < 20) throw new Error(`ETF pack history is invalid: ${id}`);
      const product = metadata.entries?.[id];
      if (!product?.officialListingUrl) throw new Error(`ETF product metadata is missing an official listing source: ${id}`);
      entries.push({
        id, symbol, name: security.name, market, instrumentKind: "etf", category,
        benchmark: product.benchmark,
        trackingIndex: product.trackingIndex,
        issuer: product.issuer,
        inception: product.inceptionDate,
        listingDate: product.listingDate,
        managementFee: product.managementFee,
        custodianFee: product.custodianFee,
        fee: product.expenseRatio ?? product.managementFee,
        feeLabel: product.expenseRatio ? product.expenseRatioLabel : product.managementFee != null ? "管理费" : null,
        feeAsOf: product.feeAsOf,
        distributionPolicy: product.distributionPolicy,
        quoteCurrency: product.quoteCurrency,
        metadataStatus: product.metadataStatus,
        metadataAsOf: product.metadataAsOf,
        officialListingUrl: product.officialListingUrl,
        officialProductUrl: product.officialProductUrl,
        detailSourceUrl: product.detailSourceUrl,
        detailSourceType: product.detailSourceType,
        firstDate: history.firstDate,
        lastDate: history.lastDate,
        retrieved: history.retrieved,
        lastAttempt: history.lastAttempt ?? history.retrieved,
        updateWarning: history.updateWarning ?? null,
        sourceUrl: history.sourceUrl,
        historyPath,
        seriesType: history.seriesType,
        adjustment: history.adjustment,
        provider: history.provider,
        providerSymbol: history.providerSymbol,
        dataStatus: "history-available",
        licenseStatus: history.licenseStatus,
        publicHistoryEligible: false,
      });
    }
  }
}

const indices = [];
for (const item of INDEX_PACK) {
  const historyPath = `data/index-history/${item.id.replaceAll(":", "-")}.json`;
  const history = JSON.parse(await fs.readFile(path.join(dataRoot, ...historyPath.replace(/^data\//, "").split("/")), "utf8"));
  indices.push({
    ...item,
    instrumentKind: "index",
    firstDate: history.firstDate,
    lastDate: history.lastDate,
    retrieved: history.retrieved,
    lastAttempt: history.lastAttempt ?? history.retrieved,
    updateWarning: history.updateWarning ?? null,
    historyPath,
    seriesType: history.seriesType,
    adjustment: history.adjustment,
    provider: history.provider,
    providerSymbol: history.providerSymbol,
    dataStatus: "history-available",
    licenseStatus: history.licenseStatus,
    publicHistoryEligible: false,
  });
}

const ids = new Set(entries.map((entry) => entry.id));
if (entries.length !== 300 || ids.size !== 300) throw new Error(`ETF pack must contain 300 unique entries; got ${entries.length}/${ids.size}`);
for (const [market, count] of Object.entries(ETF_PACK_EXPECTED)) {
  const actual = entries.filter((entry) => entry.market === market).length;
  if (actual !== count) throw new Error(`${market} ETF pack count must be ${count}; got ${actual}`);
}
if (indices.length !== INDEX_PACK_EXPECTED.total || new Set(indices.map((entry) => entry.id)).size !== INDEX_PACK_EXPECTED.total) throw new Error("Index pack must contain 15 unique entries");

const manifest = {
  version: 3,
  generated: new Date().toISOString().slice(0, 10),
  scope: "curated-300-plus-15-indices",
  counts: { total: 300, ...ETF_PACK_EXPECTED },
  indexCounts: INDEX_PACK_EXPECTED,
  notes: "300只ETF提供供应商复权价格历史；15个指数只用于市场参照。公开展示许可未确认，不代表基金公司或指数公司官方总回报序列。",
  entries,
  indices,
};
const destination = path.join(dataRoot, "etf-pack-manifest.json");
const temporary = `${destination}.tmp`;
await fs.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await fs.rename(temporary, destination);
console.log(`Instrument pack generated: ${entries.length} ETFs + ${indices.length} indices`);
