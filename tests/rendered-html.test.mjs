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
  for (const phrase of ["每日", "每月", "每年", "完整周期执行统计", "SCHX", "起点购买力", "国家统计局历史CPI", "外汇局逐日中间价", "产品费用和购买渠道，分开算", "共同历史口径", "天天基金", "个股不能只根据价格历史给出ETF式长期结论"]) assert.match(source, new RegExp(phrase));
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

test("ships verified replay histories for the first ETF cohort", async () => {
  const history = JSON.parse(await readFile(new URL("../public/data/etf-history.json", import.meta.url), "utf8"));
  for (const symbol of ["QQQ", "VOO", "SPY", "VTI", "VT", "SCHX"]) {
    assert.ok(history[symbol].points.length > 1000, `${symbol} history is too short`);
    assert.match(history[symbol].source, /复权收盘价/);
  }
});
