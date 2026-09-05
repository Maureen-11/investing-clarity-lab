import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the beginner investment research site", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /简投学堂/);
  assert.match(html, /从每天10元开始/);
  assert.doesNotMatch(html, /访问口令|内部预览/);
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /看懂你的第一笔/);
  assert.match(source, /不是让你填四个答案/);
  assert.match(source, /ETF、指数基金和个股采用不同的分析逻辑/);
});

test("renders the plan calculator and evidence boundaries", async () => {
  const response = await render("/plan");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.doesNotMatch(html, /访问口令|内部预览/);
  const source = await readFile(new URL("../app/plan/page.tsx", import.meta.url), "utf8");
  for (const phrase of ["每日", "每月", "每年", "完整周期执行统计", "SCHX", "起点购买力", "国家统计局历史CPI", "外汇局逐日中间价", "产品费用和购买渠道，分开算", "共同历史口径", "天天基金", "当前按个股事实统计逻辑处理，不生成 ETF 式长期收益范围"]) assert.match(source, new RegExp(phrase));
  assert.match(source, /例如：QQQ、VOO、SPY、SCHX/);
  assert.doesNotMatch(source, /placeholder="[^"]*(长江电力|小米)/);
  assert.doesNotMatch(source, /本期研究对象/);
});

test("ships a broad, linked three-market security directory", async () => {
  const directory = JSON.parse(await readFile(new URL("../public/data/securities.json", import.meta.url), "utf8"));
  assert.ok(directory.length > 20000);
  const byId = new Map(directory.map((item) => [item.id, item]));
  assert.equal(byId.get("CN:600900")?.name, "长江电力");
  assert.match(byId.get("HK:01810")?.aliases ?? "", /小米/);
  assert.match(byId.get("US:SCHX")?.name ?? "", /Schwab/);
  assert.match(byId.get("CN:510300")?.name ?? "", /300ETF/);
});

test("ships the curated 300 ETF and 15 index manifest with lazy history files", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/data/etf-pack-manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.counts, { total: 300, CN: 150, US: 105, HK: 45 });
  assert.deepEqual(manifest.indexCounts, { total: 15, CN: 7, US: 5, HK: 3 });
  for (const id of ["CN:159919", "CN:510300", "CN:510880", "CN:512890", "US:QQQ", "US:VOO", "HK:02800", "HK:03033"]) {
    assert.ok(manifest.entries.some((entry) => entry.id === id), `${id} missing from pack`);
  }
  const qqq = JSON.parse(await readFile(new URL("../public/data/etf-history/US/QQQ.json", import.meta.url), "utf8"));
  assert.equal(qqq.seriesType, "vendor-adjusted-price");
  assert.equal(qqq.licenseStatus, "not-confirmed");
  assert.ok(manifest.entries.every((entry) => entry.historyPath && entry.dataStatus === "history-available"));
  assert.ok(manifest.indices.every((entry) => entry.historyPath && entry.instrumentKind === "index"));
});
