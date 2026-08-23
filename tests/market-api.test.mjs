import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { main } = require("../cloudbase/functions/market-api/index.cjs");

test("CloudBase beta API exposes the broad directory without provider keys", async () => {
  const response = await main({ httpMethod: "GET", path: "/v1/search", queryStringParameters: { q: "长江电力", market: "CN" }, headers: { "x-forwarded-for": "test-api" } });
  assert.equal(response.statusCode, 200);
  const rows = JSON.parse(response.body);
  assert.equal(rows[0]?.id, "CN:600900");
  assert.equal(rows[0]?.market, "CN");
});

test("CloudBase beta API rate limits a noisy client", async () => {
  const client = `rate-test-${Date.now()}`;
  let last;
  for (let index = 0; index < 61; index += 1) {
    last = await main({ httpMethod: "GET", path: "/v1/directory", headers: { "x-forwarded-for": client } });
  }
  assert.equal(last.statusCode, 429);
});

test("CloudBase capability states distinguish verified ETF history from catalog-only stocks", async () => {
  const response = await main({ httpMethod: "GET", path: "/v1/capabilities", headers: { "x-forwarded-for": `capability-test-${Date.now()}` } });
  assert.equal(response.statusCode, 200);
  const rows = JSON.parse(response.body);
  assert.equal(rows.find((item) => item.id === "US:QQQ")?.status, "verified-history");
  assert.equal(rows.find((item) => item.id === "CN:159919")?.status, "pack-pending");
  assert.equal(rows.find((item) => item.id === "CN:600900")?.status, "catalog-only");
});

test("CloudBase loads manifest and one ETF history at a time", async () => {
  const client = `history-test-${Date.now()}`;
  const manifestResponse = await main({ httpMethod: "GET", path: "/v1/manifest", headers: { "x-forwarded-for": client } });
  assert.equal(manifestResponse.statusCode, 200);
  assert.equal(JSON.parse(manifestResponse.body).entries.length, 100);
  const historyResponse = await main({ httpMethod: "GET", path: "/v1/history", queryStringParameters: { id: "US:QQQ" }, headers: { "x-forwarded-for": client } });
  assert.equal(historyResponse.statusCode, 200);
  assert.ok(JSON.parse(historyResponse.body).points.length > 1000);
  const pendingResponse = await main({ httpMethod: "GET", path: "/v1/history", queryStringParameters: { id: "CN:159919" }, headers: { "x-forwarded-for": client } });
  assert.equal(pendingResponse.statusCode, 404);
  assert.equal(JSON.parse(pendingResponse.body).error, "history_pending");
});
