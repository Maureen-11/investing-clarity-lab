export type Frequency = "daily" | "monthly" | "yearly";
export type Market = "US" | "CN" | "HK";
export type MarketFilter = "ALL" | Market;
export type UnitMode = "fractional" | "whole";
export type FxMode = "historical" | "fixed";
export type InflationMode = "historical" | "scenario";

export type Security = {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  exchange: string;
  assetType: string;
  aliases: string;
  source: string;
  updated: string;
};

export type FundDetail = {
  fee: number;
  feeAsOf: string;
  inception: string;
  benchmark: string;
  officialUrl: string;
  issuer: string;
  quoteCurrency: "USD" | "CNY" | "HKD";
  holdings?: number;
  holdingsAsOf?: string;
  spread?: number;
  spreadAsOf?: string;
  yield?: number;
  yieldAsOf?: string;
  turnover?: number;
  turnoverAsOf?: string;
};

export type HistorySeries = {
  source: string;
  retrieved: string;
  firstDate: string;
  lastDate: string;
  points: [string, number][];
  /** Optional provenance fields populated by licensed providers in later phases. */
  seriesType?: "etf-total-return" | "index-total-return" | "price-only";
  licenseStatus?: "verified" | "pending" | "not-confirmed";
  sourceUrl?: string;
  proxyUntil?: string;
  proxyLabel?: string;
};
export type HistoryLibrary = Record<string, HistorySeries>;

export type EtfPackEntry = {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  category: string;
  benchmark: string | null;
  issuer: string | null;
  fee: number | null;
  feeAsOf: string | null;
  inception: string | null;
  firstDate: string | null;
  lastDate: string | null;
  retrieved: string | null;
  sourceUrl: string | null;
  historyPath: string | null;
  seriesType: HistorySeries["seriesType"] | null;
  dataStatus: "verified-history" | "metadata-only";
  licenseStatus: "verified" | "pending" | "not-confirmed";
  publicHistoryEligible: boolean;
};

export type EtfPackManifest = {
  version: number;
  generated: string;
  scope: "curated-100";
  counts: { total: number; CN: number; US: number; HK: number };
  notes: string;
  entries: EtfPackEntry[];
};

export type MacroSeries = {
  source: string;
  sourceUrl: string;
  definition: string;
  firstDate: string;
  lastDate: string;
  points: [string, number][];
};

export type MacroHistory = {
  retrieved: string;
  fx: { USD_CNY?: MacroSeries; HKD_CNY?: MacroSeries };
  cpiCny?: MacroSeries;
};

export type PathPoint = { date: string; value: number; principal: number; realValue: number; realPrincipal: number };
export type Replay = {
  anchorDate: string;
  start: string;
  end: string;
  startIndex: number;
  endIndex: number;
  endValue: number;
  realEndValue: number;
  principal: number;
  contributions: number;
  multiple: number;
  productMaxDrawdown: number;
  accountWorstReturn: number;
  recoveryDays: number;
  estimatedDirectFee: number;
  feeDrag: number;
  inflationFactor: number;
  startFx: number;
  endFx: number;
  path?: PathPoint[];
};

export type RollingReplay = {
  samples: number;
  requestedYears: number;
  firstDate: string;
  lastDate: string;
  worst: Replay;
  median: Replay;
  best: Replay;
  lossShare: number;
  limited: boolean;
};

export type ReplayOptions = {
  frequency: Frequency;
  payment: number;
  initial: number;
  inflation: number;
  contributionGrowth: boolean;
  fxRate: number;
  fxMode?: FxMode;
  fxPoints?: [string, number][];
  inflationMode?: InflationMode;
  cpiPoints?: [string, number][];
  scheduleDay?: number;
  unitMode: UnitMode;
  lotSize: number;
  feeRate: number;
};

export type CalendarAnalysis = {
  start: Date;
  end: Date;
  totalDays: number;
  weekends: number;
  exactHolidays: number;
  estimatedHolidays: number;
  tradingDays: number;
  contributions: number;
  nonContribution: number;
  tradableNonContribution: number;
  exact: boolean;
  estimatedYears: number[];
  previewDates: string[];
  contributionCountsByYear: number[];
};

export type ProductMetrics = {
  cagr: number;
  volatility: number;
  maxDrawdown: number;
  drawdownWindow: string;
  recoveryDays: number;
  worstYear: { year: string; value: number };
  bestYear: { year: string; value: number };
  positiveOneYear: number;
  recovered: boolean;
  annualReturns: { year: string; value: number }[];
  growth: { date: string; value: number }[];
  drawdowns: { date: string; value: number }[];
};

export const MARKET_META: Record<Market, { short: string; name: string; days: number; source: string; currency: "USD" | "CNY" | "HKD"; defaultFx: number; lotSize: number }> = {
  US: { short: "美股", name: "美股（NYSE / Nasdaq）", days: 252, source: "NYSE 已公布交易日历", currency: "USD", defaultFx: 7.2, lotSize: 1 },
  CN: { short: "A股", name: "A股（上交所 / 深交所）", days: 242, source: "沪深交易所已公布交易日历", currency: "CNY", defaultFx: 1, lotSize: 100 },
  HK: { short: "港股", name: "港股（香港交易所）", days: 250, source: "港交所已公布交易日历", currency: "HKD", defaultFx: .93, lotSize: 100 },
};

const KNOWN_YEARS: Record<Market, Set<number>> = {
  US: new Set([2026, 2027, 2028]),
  CN: new Set([2026]),
  HK: new Set([2026]),
};

const HOLIDAYS: Record<Market, Set<string>> = {
  US: new Set(["2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25","2026-06-19","2026-07-03","2026-09-07","2026-11-26","2026-12-25","2027-01-01","2027-01-18","2027-02-15","2027-03-26","2027-05-31","2027-06-18","2027-07-05","2027-09-06","2027-11-25","2027-12-24","2028-01-17","2028-02-21","2028-04-14","2028-05-29","2028-06-19","2028-07-04","2028-09-04","2028-11-23","2028-12-25"]),
  CN: new Set(["2026-01-01","2026-01-02","2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20","2026-02-23","2026-04-06","2026-05-01","2026-05-04","2026-05-05","2026-06-19","2026-09-25","2026-10-01","2026-10-02","2026-10-05","2026-10-06","2026-10-07"]),
  HK: new Set(["2026-01-01","2026-02-17","2026-02-18","2026-02-19","2026-04-03","2026-04-06","2026-04-07","2026-05-01","2026-05-25","2026-06-19","2026-07-01","2026-10-01","2026-10-19","2026-12-25"]),
};

export function parseDate(value: string) { return new Date(`${value}T12:00:00`); }
export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function addDays(date: Date, amount: number) { const result = new Date(date); result.setDate(result.getDate() + amount); return result; }
function addYears(date: Date, amount: number) { const result = new Date(date); result.setFullYear(result.getFullYear() + amount); return result; }
function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function addMonthsClamped(date: Date, amount: number) {
  const monthIndex = date.getMonth() + amount;
  const year = date.getFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)), 12);
}
function addYearsClamped(date: Date, amount: number) {
  const year = date.getFullYear() + amount;
  const month = date.getMonth();
  return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)), 12);
}
function daysInYear(year: number) { return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365; }
function exactTradingState(date: Date, market: Market) {
  if (!KNOWN_YEARS[market].has(date.getFullYear())) return null;
  if (date.getDay() === 0 || date.getDay() === 6) return false;
  return !HOLIDAYS[market].has(dateKey(date));
}

function nextExactTradingDate(date: Date, market: Market) {
  let cursor = new Date(date);
  for (let attempt = 0; attempt < 14; attempt++, cursor = addDays(cursor, 1)) {
    const state = exactTradingState(cursor, market);
    if (state === null) return null;
    if (state) return cursor;
  }
  return null;
}

export function analyzeCalendar(startValue: string, years: number, market: Market, frequency: Frequency): CalendarAnalysis {
  const start = parseDate(startValue);
  const endExclusive = addYears(start, years);
  const end = addDays(endExclusive, -1);
  let totalDays = 0;
  let weekends = 0;
  let exactHolidays = 0;
  let exactTrading = 0;
  const unknown = new Map<number, { calendar: number; weekdays: number }>();
  const tradingDates: Date[] = [];
  for (let cursor = new Date(start); cursor < endExclusive; cursor = addDays(cursor, 1)) {
    totalDays++;
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    if (weekend) { weekends++; continue; }
    const state = exactTradingState(cursor, market);
    if (state === true) { exactTrading++; tradingDates.push(new Date(cursor)); }
    else if (state === false) exactHolidays++;
    else {
      const item = unknown.get(cursor.getFullYear()) ?? { calendar: 0, weekdays: 0 };
      item.weekdays++;
      unknown.set(cursor.getFullYear(), item);
    }
  }
  for (const [year, item] of unknown) {
    const rangeStart = year === start.getFullYear() ? start : new Date(year, 0, 1, 12);
    const rangeEnd = year === end.getFullYear() ? addDays(end, 1) : new Date(year + 1, 0, 1, 12);
    item.calendar = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000);
  }
  const estimatedTrading = [...unknown.entries()].reduce((sum, [year, item]) => sum + Math.round(MARKET_META[market].days * item.calendar / daysInYear(year)), 0);
  const unknownWeekdays = [...unknown.values()].reduce((sum, item) => sum + item.weekdays, 0);
  const estimatedHolidays = Math.max(0, unknownWeekdays - estimatedTrading);
  const tradingDays = exactTrading + estimatedTrading;
  const contributionDates: Date[] = [];
  if (frequency === "daily") contributionDates.push(...tradingDates);
  else {
    for (let offset = 0; ; offset++) {
      const planned = frequency === "monthly" ? addMonthsClamped(start, offset) : addYearsClamped(start, offset);
      if (planned >= endExclusive) break;
      const shifted = nextExactTradingDate(planned, market);
      if (shifted && shifted < endExclusive) contributionDates.push(shifted);
    }
  }
  const contributions = frequency === "daily" ? tradingDays : frequency === "monthly" ? years * 12 : years;
  const counts = Array.from({ length: years }, () => 0);
  if (frequency === "daily") {
    tradingDates.forEach((date) => { const index = Math.min(years - 1, Math.max(0, date.getFullYear() - start.getFullYear())); counts[index]++; });
    for (const [year, item] of unknown) {
      const index = Math.min(years - 1, Math.max(0, year - start.getFullYear()));
      counts[index] += Math.round(MARKET_META[market].days * item.calendar / daysInYear(year));
    }
  } else counts.fill(frequency === "monthly" ? 12 : 1);
  return {
    start,
    end,
    totalDays,
    weekends,
    exactHolidays,
    estimatedHolidays,
    tradingDays,
    contributions,
    nonContribution: totalDays - contributions,
    tradableNonContribution: Math.max(0, tradingDays - contributions),
    exact: unknown.size === 0,
    estimatedYears: [...unknown.keys()].sort(),
    previewDates: contributionDates.slice(0, 8).map(dateKey),
    contributionCountsByYear: counts,
  };
}

export function projectedPrincipal(calendar: CalendarAnalysis, payment: number, initial: number, inflation: number, grows: boolean) {
  return initial + calendar.contributionCountsByYear.reduce((sum, count, year) => sum + count * payment * (grows ? Math.pow(1 + inflation / 100, year) : 1), 0);
}

function utcDate(value: string) { return new Date(`${value}T00:00:00Z`); }
function utcMonthClamped(value: string, months: number) {
  const date = utcDate(value);
  const monthIndex = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}
function utcYearLater(value: string, years: number) { return utcMonthClamped(value, years * 12); }
export function dayDistance(first: string, second: string) { return Math.max(0, Math.round((utcDate(second).getTime() - utcDate(first).getTime()) / 86400000)); }
export function lowerBound(points: [string, number][], date: string) {
  let low = 0, high = points.length;
  while (low < high) { const middle = (low + high) >> 1; if (points[middle][0] < date) low = middle + 1; else high = middle; }
  return low;
}

function seriesValue(points: [string, number][] | undefined, date: string) {
  if (!points?.length) return null;
  const index = lowerBound(points, date);
  if (index < points.length && points[index][0] === date) return points[index][1];
  return index > 0 ? points[index - 1][1] : null;
}

export function fxAtDate(options: ReplayOptions, date: string) {
  return options.fxMode === "historical" ? (seriesValue(options.fxPoints, date) ?? options.fxRate) : options.fxRate;
}

export function purchasingPowerFactor(options: ReplayOptions, start: string, end: string) {
  const scenario = (first: string, last: string) => Math.pow(1 + options.inflation / 100, dayDistance(first, last) / 365.25);
  const points = options.inflationMode === "historical" ? options.cpiPoints : undefined;
  if (!points?.length || end <= start) return scenario(start, end);
  const firstDate = points[0][0], lastDate = points.at(-1)![0];
  if (end < firstDate || start > lastDate) return scenario(start, end);
  const coveredStart = start < firstDate ? firstDate : start;
  const coveredEnd = end > lastDate ? lastDate : end;
  const startValue = seriesValue(points, coveredStart);
  const endValue = seriesValue(points, coveredEnd);
  let factor = startValue && endValue ? endValue / startValue : 1;
  if (start < firstDate) factor *= scenario(start, firstDate);
  if (end > lastDate) factor *= scenario(lastDate, end);
  return factor;
}

function buy(amountCny: number, carriedQuote: number, price: number, fxRate: number, unitMode: UnitMode, lotSize: number) {
  const amountQuote = amountCny / fxRate + carriedQuote;
  const rawShares = amountQuote / price;
  const shares = unitMode === "fractional" ? rawShares : Math.floor(rawShares / lotSize) * lotSize;
  return { shares, cashQuote: amountQuote - shares * price };
}

function contributionIndices(points: [string, number][], startIndex: number, endIndex: number, options: ReplayOptions, anchorDate: string) {
  if (options.frequency === "daily") return new Set(Array.from({ length: Math.max(0, endIndex - startIndex) }, (_, offset) => startIndex + offset));
  const result = new Set<number>();
  for (let offset = 0; offset < 1200; offset++) {
    const planned = options.frequency === "monthly" ? utcMonthClamped(anchorDate, offset) : utcYearLater(anchorDate, offset);
    const index = lowerBound(points, planned);
    if (index >= endIndex) break;
    if (index >= startIndex) result.add(index);
  }
  return result;
}

export function replayWindow(points: [string, number][], startIndex: number, endIndex: number, options: ReplayOptions, capturePath = false, anchorDate = points[startIndex][0]): Replay {
  const startDate = points[startIndex][0];
  const startFx = fxAtDate(options, startDate);
  const firstBuy = buy(options.initial, 0, points[startIndex][1], startFx, options.unitMode, options.lotSize);
  const firstNoFeeBuy = buy(options.initial, 0, points[startIndex][1], startFx, options.unitMode, options.lotSize);
  let shares = firstBuy.shares;
  let cashQuote = firstBuy.cashQuote;
  let noFeeShares = firstNoFeeBuy.shares;
  let noFeeCashQuote = firstNoFeeBuy.cashQuote;
  let contributions = 0;
  let principal = options.initial;
  let realPrincipal = options.initial;
  let peakPrice = points[startIndex][1];
  let peakDate = startDate;
  let productMaxDrawdown = 0;
  let longestRecovery = 0;
  let accountWorstReturn = 0;
  let estimatedDirectFee = 0;
  const path: PathPoint[] = [];
  const scheduled = contributionIndices(points, startIndex, endIndex, options, anchorDate);

  for (let index = startIndex; index <= endIndex; index++) {
    const [date, price] = points[index];
    const shouldInvest = scheduled.has(index);
    const elapsedYears = dayDistance(startDate, date) / 365.25;
    const noFeePrice = price * Math.exp(options.feeRate / 100 * elapsedYears);
    const fxRate = fxAtDate(options, date);
    if (shouldInvest) {
      const payment = options.payment * (options.contributionGrowth ? purchasingPowerFactor(options, anchorDate, date) : 1);
      const purchase = buy(payment, cashQuote, price, fxRate, options.unitMode, options.lotSize);
      shares += purchase.shares;
      cashQuote = purchase.cashQuote;
      const noFeePurchase = buy(payment, noFeeCashQuote, noFeePrice, fxRate, options.unitMode, options.lotSize);
      noFeeShares += noFeePurchase.shares;
      noFeeCashQuote = noFeePurchase.cashQuote;
      principal += payment;
      realPrincipal += payment / purchasingPowerFactor(options, anchorDate, date);
      contributions++;
    }
    if (price >= peakPrice) {
      longestRecovery = Math.max(longestRecovery, dayDistance(peakDate, date));
      peakPrice = price;
      peakDate = date;
    } else productMaxDrawdown = Math.min(productMaxDrawdown, price / peakPrice - 1);
    const value = (shares * price + cashQuote) * fxRate;
    if (principal > 0) accountWorstReturn = Math.min(accountWorstReturn, value / principal - 1);
    if (index > startIndex) estimatedDirectFee += shares * price * fxRate * (options.feeRate / 100) / 365.25;
    if (capturePath && (index === startIndex || index === endIndex || index % 21 === 0)) {
      const factor = purchasingPowerFactor(options, anchorDate, date);
      path.push({ date, value, principal, realValue: value / factor, realPrincipal });
    }
  }
  longestRecovery = Math.max(longestRecovery, dayDistance(peakDate, points[endIndex][0]));
  const endPrice = points[endIndex][1];
  const elapsed = dayDistance(startDate, points[endIndex][0]) / 365.25;
  const endFx = fxAtDate(options, points[endIndex][0]);
  const endValue = (shares * endPrice + cashQuote) * endFx;
  const noFeeEndPrice = endPrice * Math.exp(options.feeRate / 100 * elapsed);
  const noFeeEndValue = (noFeeShares * noFeeEndPrice + noFeeCashQuote) * endFx;
  const inflationFactor = purchasingPowerFactor(options, anchorDate, points[endIndex][0]);
  return {
    anchorDate,
    start: startDate,
    end: points[endIndex][0],
    startIndex,
    endIndex,
    endValue,
    realEndValue: endValue / inflationFactor,
    principal,
    contributions,
    multiple: principal ? endValue / principal : 0,
    productMaxDrawdown: productMaxDrawdown * 100,
    accountWorstReturn: accountWorstReturn * 100,
    recoveryDays: longestRecovery,
    estimatedDirectFee,
    feeDrag: Math.max(0, noFeeEndValue - endValue),
    inflationFactor,
    startFx,
    endFx,
    path: capturePath ? path : undefined,
  };
}

export function calculateRollingReplay(series: HistorySeries | undefined, years: number, options: ReplayOptions): RollingReplay | null {
  if (!series || years < 1) return null;
  const starts: { index: number; anchor: string }[] = [];
  const first = utcDate(series.firstDate);
  const last = utcDate(series.lastDate);
  const scheduleDay = Math.min(31, Math.max(1, options.scheduleDay ?? first.getUTCDate()));
  const firstMonth = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const lastMonth = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1);
  const seen = new Set<number>();
  for (let month = firstMonth; month <= lastMonth; ) {
    const cursor = new Date(month);
    const anchor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), Math.min(scheduleDay, new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate()))).toISOString().slice(0, 10);
    const index = lowerBound(series.points, anchor);
    if (index < series.points.length && !seen.has(index)) { starts.push({ index, anchor }); seen.add(index); }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    month = cursor.getTime();
  }
  const replays = starts.flatMap(({ index: startIndex, anchor }) => {
    const target = utcYearLater(anchor, years);
    const endIndex = lowerBound(series.points, target);
    return endIndex >= series.points.length ? [] : [replayWindow(series.points, startIndex, endIndex, options, false, anchor)];
  }).sort((a, b) => a.multiple - b.multiple);
  if (!replays.length) return null;
  const enrich = (item: Replay) => replayWindow(series.points, item.startIndex, item.endIndex, options, true, item.anchorDate);
  return {
    samples: replays.length,
    requestedYears: years,
    firstDate: series.firstDate,
    lastDate: series.lastDate,
    worst: enrich(replays[0]),
    median: enrich(replays[Math.floor((replays.length - 1) / 2)]),
    best: enrich(replays.at(-1)!),
    lossShare: replays.filter((item) => item.endValue < item.principal).length / replays.length,
    limited: replays.length < 24,
  };
}

export function calculateSpecificReplay(series: HistorySeries | undefined, startDate: string, years: number, options: ReplayOptions) {
  if (!series || !startDate) return null;
  const startIndex = lowerBound(series.points, startDate);
  const endIndex = lowerBound(series.points, utcYearLater(startDate, years));
  if (startIndex >= series.points.length || endIndex >= series.points.length) return null;
  return replayWindow(series.points, startIndex, endIndex, options, true, startDate);
}

export function computeProductMetrics(series: HistorySeries | undefined): ProductMetrics | null {
  if (!series || series.points.length < 252) return null;
  const points = series.points;
  const years = dayDistance(points[0][0], points.at(-1)![0]) / 365.25;
  const cagr = (Math.pow(points.at(-1)![1] / points[0][1], 1 / years) - 1) * 100;
  const returns: number[] = [];
  for (let index = 1; index < points.length; index++) returns.push(points[index][1] / points[index - 1][1] - 1);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / Math.max(1, returns.length - 1);
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
  let peak = points[0][1], peakDate = points[0][0], maxDrawdown = 0, troughDate = peakDate, deepestPeakDate = peakDate;
  const drawdowns: { date: string; value: number }[] = [];
  for (const [date, price] of points) {
    if (price >= peak) { peak = price; peakDate = date; }
    const drawdown = (price / peak - 1) * 100;
    if (drawdown < maxDrawdown) { maxDrawdown = drawdown; troughDate = date; deepestPeakDate = peakDate; }
    drawdowns.push({ date, value: drawdown });
  }
  const peakPrice = points[lowerBound(points, deepestPeakDate)]?.[1] ?? points[0][1];
  const afterTrough = lowerBound(points, troughDate);
  let recoveryDate: string | null = null;
  for (let index = afterTrough; index < points.length; index++) if (points[index][1] >= peakPrice) { recoveryDate = points[index][0]; break; }
  const byYear = new Map<string, number>();
  points.forEach(([date, price]) => byYear.set(date.slice(0,4), price));
  const yearEnds = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const annualReturns = yearEnds.slice(1).map(([year, price], index) => ({ year, value: (price / yearEnds[index][1] - 1) * 100 })).filter((item) => Number.isFinite(item.value));
  const sortedAnnual = [...annualReturns].sort((a,b) => a.value - b.value);
  let positive = 0, samples = 0;
  for (let index = 0; index < points.length; index += 21) {
    const target = utcYearLater(points[index][0], 1);
    const endIndex = lowerBound(points, target);
    if (endIndex >= points.length) continue;
    samples++;
    if (points[endIndex][1] >= points[index][1]) positive++;
  }
  const stride = Math.max(1, Math.floor(points.length / 180));
  const growth = points.filter((_, index) => index % stride === 0 || index === points.length - 1).map(([date, price]) => ({ date, value: price / points[0][1] * 100 }));
  const sampledDrawdowns = drawdowns.filter((_, index) => index % stride === 0 || index === drawdowns.length - 1);
  const recovered = recoveryDate !== null;
  const recoveryEnd = recoveryDate ?? points.at(-1)![0];
  return {
    cagr,
    volatility,
    maxDrawdown,
    drawdownWindow: `${deepestPeakDate} — ${troughDate}`,
    recoveryDays: dayDistance(troughDate, recoveryEnd),
    worstYear: sortedAnnual[0],
    bestYear: sortedAnnual.at(-1)!,
    positiveOneYear: samples ? positive / samples * 100 : 0,
    recovered,
    annualReturns,
    growth,
    drawdowns: sampledDrawdowns,
  };
}

export function commonSeries(first: HistorySeries | undefined, second: HistorySeries | undefined) {
  if (!first || !second) return null;
  const start = first.firstDate > second.firstDate ? first.firstDate : second.firstDate;
  const end = first.lastDate < second.lastDate ? first.lastDate : second.lastDate;
  const slice = (series: HistorySeries) => {
    const points = series.points.slice(lowerBound(series.points, start), lowerBound(series.points, end) + 1);
    return { ...series, firstDate: points[0]?.[0] ?? start, lastDate: points.at(-1)?.[0] ?? end, points };
  };
  const a = slice(first), b = slice(second);
  return a.points.length > 2 && b.points.length > 2 ? { first: a, second: b, start, end } : null;
}
