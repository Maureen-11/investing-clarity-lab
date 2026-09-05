import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../public/data/etf-pack-manifest.json", import.meta.url), "utf8"));
const directory = JSON.parse(await readFile(new URL("../public/data/securities.json", import.meta.url), "utf8"));

test("curated ETF pack has exactly 300 unique three-market entries and 15 indices", () => {
  assert.equal(manifest.entries.length, 300);
  assert.equal(new Set(manifest.entries.map((entry) => entry.id)).size, 300);
  assert.deepEqual(Object.fromEntries(["CN", "US", "HK"].map((market) => [market, manifest.entries.filter((entry) => entry.market === market).length])), { CN: 150, US: 105, HK: 45 });
  assert.equal(manifest.indices.length, 15);
  assert.equal(new Set(manifest.indices.map((entry) => entry.id)).size, 15);
  assert.deepEqual(Object.fromEntries(["CN", "US", "HK"].map((market) => [market, manifest.indices.filter((entry) => entry.market === market).length])), { CN: 7, US: 5, HK: 3 });
  const ids = new Set(directory.map((entry) => entry.id));
  assert.ok(manifest.entries.every((entry) => ids.has(entry.id)));
});

test("all products have traceable listing metadata without invented defaults", () => {
  for (const entry of manifest.entries) {
    assert.match(entry.officialListingUrl, /^https:\/\//);
    assert.ok(entry.metadataAsOf);
    assert.ok(["verified-official-detail", "secondary-detail-with-official-listing", "official-listing-only"].includes(entry.metadataStatus));
  }
});

test("curated ETF pack excludes leverage, inverse and crypto products", () => {
  const forbidden = /杠杆|反向|两倍|三倍|2x|3x|bitcoin|ether|crypto/i;
  assert.ok(manifest.entries.every((entry) => !forbidden.test(`${entry.symbol} ${entry.name}`)));
});

test("lazy histories are ordered and consistent with manifest metadata", async () => {
  assert.ok(manifest.entries.every((entry) => entry.historyPath));
  for (const entry of manifest.entries) {
    const history = JSON.parse(await readFile(new URL(`../public/${entry.historyPath}`, import.meta.url), "utf8"));
    assert.equal(history.firstDate, entry.firstDate);
    assert.equal(history.lastDate, entry.lastDate);
    assert.ok(history.points.length >= 20);
    assert.ok(history.points.every((point, index) => index === 0 || point[0] > history.points[index - 1][0]));
    assert.ok(history.points.every((point) => Number.isFinite(point[1]) && point[1] > 0));
    assert.ok(["vendor-adjusted-price", "vendor-cumulative-nav"].includes(history.seriesType));
    assert.ok(["forward-adjusted", "cumulative-net-value-including-distributions"].includes(history.adjustment));
    assert.equal(history.licenseStatus, "not-confirmed");
    assert.equal(entry.dataStatus, "history-available");
  }
});

test("all public histories keep the unconfirmed redistribution boundary visible", () => {
  for (const entry of manifest.entries) {
    assert.equal(entry.publicHistoryEligible, false);
    assert.equal(entry.licenseStatus, "not-confirmed");
  }
});

test("indices are price-only context series and never ETF replays", async () => {
  for (const entry of manifest.indices) {
    const history = JSON.parse(await readFile(new URL(`../public/${entry.historyPath}`, import.meta.url), "utf8"));
    assert.equal(entry.instrumentKind, "index");
    assert.equal(history.instrumentKind, "index");
    assert.equal(history.seriesType, "price-only");
    assert.equal(history.adjustment, "none");
  }
});
