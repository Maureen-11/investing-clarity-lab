import { readFileSync } from "node:fs";
import {
  analyzeCalendar,
  calculateRollingReplay,
  computeProductMetrics,
  projectedPrincipal,
} from "../app/plan/engine.ts";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const series = readJson("../public/data/etf-history/US/VOO.json");
const macro = readJson("../public/data/macro-history.json");

const years = 15;
const calendar = analyzeCalendar("2011-01-03", years, "US", "monthly");
const options = {
  frequency: "monthly",
  payment: 1_000,
  initial: 10_000,
  inflation: 2.5,
  contributionGrowth: false,
  fxRate: 7.2,
  fxMode: "historical",
  fxPoints: macro.fx.USD_CNY.points,
  inflationMode: "historical",
  cpiPoints: macro.cpiCny.points,
  scheduleDay: 3,
  unitMode: "fractional",
  lotSize: 1,
  feeRate: 0.03,
};
const rolling = calculateRollingReplay(series, years, options);
const metrics = computeProductMetrics(series);

if (!rolling || !metrics) throw new Error("VOO README example could not be calculated");

console.log(JSON.stringify({
  inputs: {
    symbol: "VOO",
    startDate: "2011-01-03",
    frequency: "monthly",
    payment: 1_000,
    initial: 10_000,
    years,
    feeRate: 0.03,
  },
  outputs: {
    contributions: calendar.contributions,
    totalPrincipal: projectedPrincipal(calendar, 1_000, 10_000, 2.5, false),
    calendarDays: calendar.totalDays,
    estimatedTradingDays: calendar.tradingDays,
    samples: rolling.samples,
    worstEndValue: Math.round(rolling.worst.endValue),
    medianEndValue: Math.round(rolling.median.endValue),
    bestEndValue: Math.round(rolling.best.endValue),
    medianRealEndValue: Math.round(rolling.median.realEndValue),
    medianFeeDrag: Math.round(rolling.median.feeDrag),
    maxDrawdown: Number(metrics.maxDrawdown.toFixed(2)),
  },
  data: {
    firstDate: series.firstDate,
    lastDate: series.lastDate,
    retrieved: series.retrieved,
    provider: series.provider,
  },
}, null, 2));
