import fs from "node:fs/promises";
import path from "node:path";
import { ETF_PACK_EXPECTED, ETF_PACK_GROUPS, LEGACY_HISTORY_SYMBOLS } from "./etf-pack-config.mjs";

const dataRoot = path.join(process.cwd(), "public", "data");
const directory = JSON.parse(await fs.readFile(path.join(dataRoot, "securities.json"), "utf8"));
const legacyHistory = JSON.parse(await fs.readFile(path.join(dataRoot, "etf-history.json"), "utf8"));
const directoryById = new Map(directory.map((item) => [item.id, item]));
const entries = [];

for (const [market, groups] of Object.entries(ETF_PACK_GROUPS)) {
  for (const [category, symbols] of Object.entries(groups)) {
    for (const symbol of symbols) {
      const id = `${market}:${symbol}`;
      const security = directoryById.get(id);
      if (!security) throw new Error(`ETF pack security is missing from directory: ${id}`);
      const history = legacyHistory[symbol];
      const hasHistory = LEGACY_HISTORY_SYMBOLS.has(symbol) && Boolean(history);
      const historyPath = hasHistory ? `data/etf-history/${market}/${symbol}.json` : null;
      entries.push({
        id, symbol, name: security.name, market, category,
        benchmark: null, issuer: null, fee: null, feeAsOf: null, inception: null,
        firstDate: history?.firstDate ?? null,
        lastDate: history?.lastDate ?? null,
        retrieved: history?.retrieved ?? null,
        sourceUrl: history?.sourceUrl ?? (hasHistory ? `https://finance.yahoo.com/quote/${symbol}/history/` : null),
        historyPath,
        seriesType: hasHistory ? "etf-total-return" : null,
        dataStatus: hasHistory ? "verified-history" : "metadata-only",
        licenseStatus: hasHistory ? "not-confirmed" : "pending",
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

for (const entry of entries.filter((item) => item.historyPath)) {
  const history = legacyHistory[entry.symbol];
  const output = { ...history, seriesType: "etf-total-return", licenseStatus: "not-confirmed", sourceUrl: entry.sourceUrl };
  const destination = path.join(dataRoot, ...entry.historyPath.replace(/^data\//, "").split("/"));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(output)}\n`, "utf8");
  await fs.rename(temporary, destination);
}

const manifest = {
  version: 1,
  generated: new Date().toISOString().slice(0, 10),
  scope: "curated-100",
  counts: { total: 100, ...ETF_PACK_EXPECTED },
  notes: "清单已核验不等于历史数据或公开展示许可已核验。只有historyPath存在的标的可加载本地历史。",
  entries,
};
const destination = path.join(dataRoot, "etf-pack-manifest.json");
const temporary = `${destination}.tmp`;
await fs.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await fs.rename(temporary, destination);
console.log(`ETF pack generated: ${entries.length} entries, ${entries.filter((entry) => entry.historyPath).length} histories`);
