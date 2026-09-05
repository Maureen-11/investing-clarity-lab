import assert from "node:assert/strict";
import test from "node:test";
import { capabilityFor, historyFor } from "../app/plan/capabilities.ts";

const etf = { id: "US:ZZZ", symbol: "ZZZ", name: "Example ETF", market: "US", exchange: "TEST", assetType: "ETF", aliases: "", source: "test", updated: "2026-08-21" };
const stock = { id: "CN:600900", symbol: "600900", name: "长江电力", market: "CN", exchange: "上交所", assetType: "股票", aliases: "", source: "test", updated: "2026-08-21" };
const history = { source: "test snapshot", retrieved: "2026-08-21", firstDate: "2010-01-01", lastDate: "2026-08-20", points: [["2010-01-01", 1], ["2026-08-20", 2]] };
const packEntry = { id: "US:ZZZ", symbol: "ZZZ", name: "Example ETF", market: "US", category: "宽基", historyPath: null, dataStatus: "metadata-only", licenseStatus: "pending" };

test("directory entries are not mistaken for ETF history", () => {
  assert.equal(capabilityFor(etf).status, "catalog-only");
  assert.equal(capabilityFor(etf, undefined, packEntry).status, "pack-pending");
  assert.match(capabilityFor(etf, undefined, packEntry).description, /300只主流ETF/);
  assert.equal(capabilityFor(etf, history).mode, "etf-replay");
  assert.equal(capabilityFor(etf, history).status, "history-available");
  assert.equal(capabilityFor(stock).status, "catalog-only");
  assert.equal(capabilityFor(stock, history).mode, "stock-facts");
  assert.match(capabilityFor(stock, history).description, /个股/);
});

test("indices use context analysis and cannot enter ETF replay", () => {
  const index = { ...etf, id: "US:INDEX_SP500", symbol: "S&P 500", name: "S&P 500 Index", assetType: "指数", instrumentKind: "index" };
  const indexHistory = { ...history, instrumentKind: "index", seriesType: "price-only", adjustment: "none" };
  assert.equal(capabilityFor(index, indexHistory).mode, "index-context");
  assert.equal(capabilityFor(index, indexHistory).status, "index-context");
});

test("history lookup prefers market-qualified ids and supports legacy symbols", () => {
  assert.equal(historyFor({ "US:ZZZ": history }, etf), history);
  assert.equal(historyFor({ ZZZ: history }, etf), history);
  assert.equal(historyFor({}, etf), undefined);
});
