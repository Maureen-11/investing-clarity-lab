import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeCalendar,
  computeProductMetrics,
  purchasingPowerFactor,
  replayWindow,
} from "../app/plan/engine.ts";

const baseOptions = {
  frequency: "monthly",
  payment: 100,
  initial: 0,
  inflation: 2.5,
  contributionGrowth: false,
  fxRate: 1,
  fxMode: "fixed",
  inflationMode: "scenario",
  unitMode: "fractional",
  lotSize: 1,
  feeRate: 0,
};

test("month-end schedules are clamped and known closures shift forward", () => {
  const result = analyzeCalendar("2026-01-31", 1, "US", "monthly");
  assert.equal(result.contributions, 12);
  assert.deepEqual(result.previewDates.slice(0, 3), ["2026-02-02", "2026-03-02", "2026-03-31"]);
});

test("historical FX converts the initial purchase and ending value on their own dates", () => {
  const points = [["2020-01-02", 10], ["2021-01-04", 10]];
  const fixed = replayWindow(points, 0, 1, { ...baseOptions, payment: 0, initial: 100, fxRate: 7 }, true);
  const historical = replayWindow(points, 0, 1, {
    ...baseOptions,
    payment: 0,
    initial: 100,
    fxRate: 7,
    fxMode: "historical",
    fxPoints: [["2020-01-02", 7], ["2021-01-04", 6]],
  }, true);
  assert.equal(fixed.endValue, 100);
  assert.ok(Math.abs(historical.endValue - 600 / 7) < 1e-9);
  assert.equal(historical.startFx, 7);
  assert.equal(historical.endFx, 6);
});

test("historical CPI changes purchasing power but not nominal account value", () => {
  const options = {
    ...baseOptions,
    inflationMode: "historical",
    cpiPoints: [["2020-01-01", 100], ["2021-01-01", 110]],
  };
  assert.equal(purchasingPowerFactor(options, "2020-01-01", "2021-01-01"), 1.1);
  const replay = replayWindow([["2020-01-01", 10], ["2021-01-01", 10]], 0, 1, { ...options, payment: 0, initial: 110 }, true);
  assert.equal(replay.endValue, 110);
  assert.ok(Math.abs(replay.realEndValue - 100) < 1e-9);
  assert.equal(replay.path.at(-1).realPrincipal, 110);
});

test("monthly replay invests on the chosen day or the next available trading point", () => {
  const points = [
    ["2020-01-02", 10], ["2020-01-15", 10],
    ["2020-02-03", 10], ["2020-02-18", 10], ["2020-03-16", 10], ["2020-03-31", 10],
  ];
  const replay = replayWindow(points, 1, 5, { ...baseOptions, scheduleDay: 15 }, true, "2020-01-15");
  assert.equal(replay.contributions, 3);
  assert.equal(replay.principal, 300);
});

test("natural-year returns compare each year-end with the previous year-end", () => {
  const points = [];
  for (const [year, start, end] of [[2020, 90, 100], [2021, 100, 110], [2022, 110, 88]]) {
    for (let day = 1; day <= 300; day++) {
      const date = new Date(Date.UTC(year, 0, day)).toISOString().slice(0, 10);
      points.push([date, start + (end - start) * day / 300]);
    }
  }
  points.sort((a, b) => a[0].localeCompare(b[0]));
  const metrics = computeProductMetrics({ source: "test", retrieved: "", firstDate: points[0][0], lastDate: points.at(-1)[0], points });
  assert.ok(metrics);
  assert.equal(metrics.annualReturns[0].year, "2021");
  assert.ok(Math.abs(metrics.annualReturns[0].value - 10) < 1e-9);
  assert.equal(metrics.annualReturns[1].year, "2022");
  assert.ok(Math.abs(metrics.annualReturns[1].value + 20) < 1e-9);
});
