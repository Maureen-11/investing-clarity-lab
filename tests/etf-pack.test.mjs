import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../public/data/etf-pack-manifest.json", import.meta.url), "utf8"));
const directory = JSON.parse(await readFile(new URL("../public/data/securities.json", import.meta.url), "utf8"));

test("curated ETF pack has exactly 100 unique three-market entries", () => {
  assert.equal(manifest.entries.length, 100);
  assert.equal(new Set(manifest.entries.map((entry) => entry.id)).size, 100);
  assert.deepEqual(Object.fromEntries(["CN", "US", "HK"].map((market) => [market, manifest.entries.filter((entry) => entry.market === market).length])), { CN: 50, US: 35, HK: 15 });
  const ids = new Set(directory.map((entry) => entry.id));
  assert.ok(manifest.entries.every((entry) => ids.has(entry.id)));
});

test("curated ETF pack excludes leverage, inverse and crypto products", () => {
  const forbidden = /杠杆|反向|两倍|三倍|2x|3x|bitcoin|ether|crypto/i;
  assert.ok(manifest.entries.every((entry) => !forbidden.test(`${entry.symbol} ${entry.name}`)));
});

test("lazy histories are ordered and consistent with manifest metadata", async () => {
  for (const entry of manifest.entries.filter((item) => item.historyPath)) {
    const history = JSON.parse(await readFile(new URL(`../public/${entry.historyPath}`, import.meta.url), "utf8"));
    assert.equal(history.firstDate, entry.firstDate);
    assert.equal(history.lastDate, entry.lastDate);
    assert.ok(history.points.length > 1000);
    assert.ok(history.points.every((point, index) => index === 0 || point[0] > history.points[index - 1][0]));
    assert.ok(history.points.every((point) => Number.isFinite(point[1]) && point[1] > 0));
    assert.equal(history.seriesType, "etf-total-return");
  }
});

test("metadata-only entries never pretend to have public histories", () => {
  for (const entry of manifest.entries.filter((item) => item.dataStatus === "metadata-only")) {
    assert.equal(entry.historyPath, null);
    assert.equal(entry.publicHistoryEligible, false);
  }
});
