import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { computeProductMetrics, replayWindow } from "../app/plan/engine.ts";

test("all 100 ETF histories can execute a factual replay", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/data/etf-pack-manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.entries.length, 100);

  for (const entry of manifest.entries) {
    const historyPath = entry.historyPath.replace(/^\/+/, "");
    const series = JSON.parse(await readFile(new URL(`../public/${historyPath}`, import.meta.url), "utf8"));
    const replay = replayWindow(series.points, 0, series.points.length - 1, {
      frequency: "daily",
      payment: 10,
      initial: 0,
      inflation: 2.5,
      contributionGrowth: false,
      fxRate: 1,
      fxMode: "fixed",
      inflationMode: "scenario",
      unitMode: "fractional",
      lotSize: 1,
      feeRate: Number.NaN,
    });
    assert.ok(Number.isFinite(replay.endValue) && replay.endValue > 0, `${entry.id} ending value is invalid`);
    assert.ok(Number.isFinite(replay.principal) && replay.principal > 0, `${entry.id} principal is invalid`);
    assert.ok(Number.isFinite(replay.productMaxDrawdown), `${entry.id} drawdown is invalid`);
    assert.equal(replay.feeRateKnown, false, `${entry.id} must not invent an unverified fee rate`);

    const metrics = computeProductMetrics(series);
    if (series.points.length >= 252) assert.ok(metrics, `${entry.id} should produce factual metrics`);
    else assert.equal(metrics, null, `${entry.id} short history must not be annualized`);
  }
});
