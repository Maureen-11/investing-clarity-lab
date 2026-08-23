import fs from "node:fs/promises";
import path from "node:path";
import { ETF_PACK_EXPECTED, ETF_PACK_GROUPS } from "./etf-pack-config.mjs";

const dataRoot = path.join(process.cwd(), "public", "data");
const directory = JSON.parse(await fs.readFile(path.join(dataRoot, "securities.json"), "utf8"));
const directoryById = new Map(directory.map((item) => [item.id, item]));
const entries = [];

for (const [market, groups] of Object.entries(ETF_PACK_GROUPS)) {
  for (const [category, symbols] of Object.entries(groups)) {
    for (const symbol of symbols) {
      const id = `${market}:${symbol}`;
      const security = directoryById.get(id);
      if (!security) throw new Error(`ETF pack security is missing from directory: ${id}`);
      const historyPath = `data/etf-history/${market}/${symbol}.json`;
      let history;
      try {
        history = JSON.parse(await fs.readFile(path.join(dataRoot, ...historyPath.replace(/^data\//, "").split("/")), "utf8"));
      } catch {
        throw new Error(`ETF pack history is missing: ${id}`);
      }
      if (!Array.isArray(history.points) || history.points.length < 20) throw new Error(`ETF pack history is invalid: ${id}`);
      entries.push({
        id, symbol, name: security.name, market, category,
        benchmark: null, issuer: null, fee: null, feeAsOf: null, inception: null,
        firstDate: history.firstDate,
        lastDate: history.lastDate,
        retrieved: history.retrieved,
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

const ids = new Set(entries.map((entry) => entry.id));
if (entries.length !== 100 || ids.size !== 100) throw new Error(`ETF pack must contain 100 unique entries; got ${entries.length}/${ids.size}`);
for (const [market, count] of Object.entries(ETF_PACK_EXPECTED)) {
  const actual = entries.filter((entry) => entry.market === market).length;
  if (actual !== count) throw new Error(`${market} ETF pack count must be ${count}; got ${actual}`);
}

const manifest = {
  version: 2,
  generated: new Date().toISOString().slice(0, 10),
  scope: "curated-100",
  counts: { total: 100, ...ETF_PACK_EXPECTED },
  notes: "100只ETF均提供供应商前复权价格历史用于回放；数据公开展示许可未确认，不代表基金公司官方总回报序列。",
  entries,
};
const destination = path.join(dataRoot, "etf-pack-manifest.json");
const temporary = `${destination}.tmp`;
await fs.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await fs.rename(temporary, destination);
console.log(`ETF pack generated: ${entries.length} entries, ${entries.length} histories`);
