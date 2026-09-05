import fs from "node:fs/promises";
import path from "node:path";
import { ETF_PACK_EXPECTED, INDEX_PACK_EXPECTED } from "./etf-pack-config.mjs";

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, "public", "data", "etf-pack-manifest.json"), "utf8"));
const errors = [];
const forbidden = /杠杆|反向|两倍|三倍|2x|3x|bitcoin|ether|crypto|single.stock|每日做多|每日做空/i;

if (manifest.entries?.length !== 300) errors.push(`manifest contains ${manifest.entries?.length ?? 0}/300 ETF entries`);
if (new Set((manifest.entries ?? []).map((entry) => entry.id)).size !== 300) errors.push("ETF ids are not unique");
for (const [market, expected] of Object.entries(ETF_PACK_EXPECTED)) {
  const actual = (manifest.entries ?? []).filter((entry) => entry.market === market).length;
  if (actual !== expected) errors.push(`${market} ETF count is ${actual}, expected ${expected}`);
}
if (manifest.indices?.length !== INDEX_PACK_EXPECTED.total) errors.push(`manifest contains ${manifest.indices?.length ?? 0}/15 indices`);
if (new Set((manifest.indices ?? []).map((entry) => entry.id)).size !== INDEX_PACK_EXPECTED.total) errors.push("index ids are not unique");
for (const [market, expected] of Object.entries(INDEX_PACK_EXPECTED).filter(([key]) => key !== "total")) {
  const actual = (manifest.indices ?? []).filter((entry) => entry.market === market).length;
  if (actual !== expected) errors.push(`${market} index count is ${actual}, expected ${expected}`);
}

async function validateHistory(entry, kind) {
  if (!entry.historyPath) return errors.push(`${entry.id} has no historyPath`);
  try {
    const history = JSON.parse(await fs.readFile(path.join(root, "public", ...entry.historyPath.split("/")), "utf8"));
    if (!Array.isArray(history.points) || history.points.length < 20) errors.push(`${entry.id} has fewer than 20 valid points`);
    if (history.firstDate !== entry.firstDate || history.lastDate !== entry.lastDate) errors.push(`${entry.id} manifest dates do not match history`);
    if (history.retrieved !== entry.retrieved) errors.push(`${entry.id} retrieval date does not match history`);
    if (kind === "etf" && !["vendor-adjusted-price", "vendor-cumulative-nav"].includes(history.seriesType)) errors.push(`${entry.id} has unexpected ETF series type ${history.seriesType}`);
    if (kind === "index" && history.seriesType !== "price-only") errors.push(`${entry.id} has unexpected index series type ${history.seriesType}`);
    if (kind === "etf" && !["forward-adjusted", "cumulative-net-value-including-distributions"].includes(history.adjustment)) errors.push(`${entry.id} does not declare an accepted return adjustment`);
    if (kind === "index" && history.adjustment !== "none") errors.push(`${entry.id} index must use unadjusted price levels`);
    if (history.licenseStatus !== "not-confirmed") errors.push(`${entry.id} must expose the unconfirmed license state`);
    for (let index = 0; index < (history.points?.length ?? 0); index += 1) {
      const point = history.points[index];
      if (!Array.isArray(point) || !/^\d{4}-\d{2}-\d{2}$/.test(point[0]) || !Number.isFinite(point[1]) || point[1] <= 0) {
        errors.push(`${entry.id} has an invalid point at index ${index}`);
        break;
      }
      if (index > 0 && point[0] <= history.points[index - 1][0]) {
        errors.push(`${entry.id} dates are not strictly increasing at index ${index}`);
        break;
      }
    }
  } catch (error) {
    errors.push(`${entry.id} cannot be read: ${error.message}`);
  }
}

for (const entry of manifest.entries ?? []) {
  if (forbidden.test(`${entry.symbol} ${entry.name}`)) errors.push(`${entry.id} violates the product exclusions`);
  if (entry.instrumentKind !== "etf") errors.push(`${entry.id} is not marked as an ETF`);
  if (!entry.officialListingUrl || !entry.metadataAsOf || !entry.metadataStatus) errors.push(`${entry.id} lacks traceable product metadata`);
  if (entry.publicHistoryEligible !== false || entry.licenseStatus !== "not-confirmed") errors.push(`${entry.id} hides the public-history licensing boundary`);
  await validateHistory(entry, "etf");
}
for (const entry of manifest.indices ?? []) {
  if (entry.instrumentKind !== "index") errors.push(`${entry.id} is not marked as an index`);
  if (!entry.sourceUrl) errors.push(`${entry.id} lacks an official index source`);
  for (const relatedId of entry.relatedEtfIds ?? []) {
    if (!(manifest.entries ?? []).some((candidate) => candidate.id === relatedId)) errors.push(`${entry.id}: related ETF ${relatedId} is not in the 300 ETF pack`);
  }
  await validateHistory(entry, "index");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Instrument pack validation passed: 300 ETFs + 15 indices, generated ${manifest.generated}`);
}
