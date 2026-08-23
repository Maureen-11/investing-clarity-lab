import fs from "node:fs/promises";
import path from "node:path";
import { ETF_PACK_EXPECTED } from "./etf-pack-config.mjs";

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, "public", "data", "etf-pack-manifest.json"), "utf8"));
const errors = [];

if (manifest.entries?.length !== 100) errors.push(`manifest contains ${manifest.entries?.length ?? 0}/100 entries`);
if (new Set((manifest.entries ?? []).map((entry) => entry.id)).size !== 100) errors.push("manifest ids are not unique");
for (const [market, expected] of Object.entries(ETF_PACK_EXPECTED)) {
  const actual = (manifest.entries ?? []).filter((entry) => entry.market === market).length;
  if (actual !== expected) errors.push(`${market} count is ${actual}, expected ${expected}`);
}

for (const entry of manifest.entries ?? []) {
  if (!entry.historyPath) {
    errors.push(`${entry.id} has no historyPath`);
    continue;
  }
  try {
    const history = JSON.parse(await fs.readFile(path.join(root, "public", ...entry.historyPath.split("/")), "utf8"));
    if (!Array.isArray(history.points) || history.points.length < 20) errors.push(`${entry.id} has fewer than 20 valid points`);
    if (history.firstDate !== entry.firstDate || history.lastDate !== entry.lastDate) errors.push(`${entry.id} manifest dates do not match history`);
    if (history.retrieved !== entry.retrieved) errors.push(`${entry.id} retrieval date does not match history`);
    if (history.seriesType !== "vendor-adjusted-price") errors.push(`${entry.id} has unexpected series type ${history.seriesType}`);
    if (history.adjustment !== "forward-adjusted") errors.push(`${entry.id} does not declare forward adjustment`);
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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`ETF pack validation passed: 100/100 histories, generated ${manifest.generated}`);
}
