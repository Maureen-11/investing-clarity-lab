"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarAnalysis,
  Frequency,
  FundDetail,
  EtfPackEntry,
  EtfPackManifest,
  FxMode,
  HistoryLibrary,
  HistorySeries,
  InflationMode,
  MacroHistory,
  MARKET_META,
  Market,
  MarketFilter,
  PathPoint,
  ProductMetrics,
  Replay,
  ReplayOptions,
  Security,
  UnitMode,
  analyzeCalendar,
  calculateRollingReplay,
  calculateSpecificReplay,
  commonSeries,
  computeProductMetrics,
  dayDistance,
  projectedPrincipal,
  replayWindow,
} from "./engine";
import { capabilityFor, historyFor, packEntryFor, type AnalysisCapability } from "./capabilities";
import { loadMarketData, loadSecurityHistory } from "./market-api";

const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Insight = { title: string; titleLines: [string, string]; summary: string; risks: string[]; role: string };
type HistoryMode = "rolling" | "specific";

const FUND_DETAILS: Record<string, FundDetail> = {
  "US:QQQ": { fee: .18, feeAsOf: "2025-12-22", inception: "1999-03-10", benchmark: "Nasdaq-100 Index", officialUrl: "https://www.invesco.com/qqq-etf/en/home.html", issuer: "Invesco", quoteCurrency: "USD" },
  "US:VOO": { fee: .03, feeAsOf: "2026-04-28", inception: "2010-09-07", benchmark: "S&P 500 Index", officialUrl: "https://investor.vanguard.com/investment-products/etfs/profile/voo", issuer: "Vanguard", quoteCurrency: "USD" },
  "US:SPY": { fee: .0945, feeAsOf: "2026-07-28", inception: "1993-01-22", benchmark: "S&P 500 Index", officialUrl: "https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy", issuer: "State Street", quoteCurrency: "USD", holdings: 503, holdingsAsOf: "2026-03-31", yield: 1.10, yieldAsOf: "2026-03-31" },
  "US:VTI": { fee: .03, feeAsOf: "2026-04-28", inception: "2001-05-24", benchmark: "CRSP US Total Market Index", officialUrl: "https://investor.vanguard.com/investment-products/etfs/profile/vti", issuer: "Vanguard", quoteCurrency: "USD" },
  "US:VT": { fee: .06, feeAsOf: "2026-02-27", inception: "2008-06-24", benchmark: "FTSE Global All Cap Index", officialUrl: "https://investor.vanguard.com/investment-products/etfs/profile/vt", issuer: "Vanguard", quoteCurrency: "USD" },
  "US:SCHX": { fee: .03, feeAsOf: "2026-07-31", inception: "2009-11-03", benchmark: "Dow Jones U.S. Large-Cap Total Stock Market Index", officialUrl: "https://www.schwabassetmanagement.com/products/schx", issuer: "Schwab", quoteCurrency: "USD", holdings: 754, holdingsAsOf: "2026-07-31", spread: .03, spreadAsOf: "2026-07-31", yield: 1.03, yieldAsOf: "2026-06-30", turnover: 3.2, turnoverAsOf: "2026-06-30" },
};

const ASSET_INSIGHTS: Record<string, Insight> = {
  "US:QQQ": { title: "QQQ不是“整个美股”，而是偏成长的大型非金融公司组合", titleLines: ["QQQ不是“整个美股”，", "而是偏成长的大型非金融公司组合"], summary: "它跟踪纳斯达克100指数，长期表现很大程度受大型科技与成长公司驱动。看它时，重点不只在收益，也在集中度和估值收缩时的回撤。", risks: ["行业与头部公司集中度较高", "估值收缩时回撤可能更深", "不包含金融公司，不能代表美股全市场"], role: "更像成长风格配置，不是完整市场基准" },
  "US:VOO": { title: "VOO是美国大型股入口，不等于覆盖全部美国公司", titleLines: ["VOO是美国大型股入口，", "不等于覆盖全部美国公司"], summary: "它跟踪标普500指数。低费率和广泛持股适合用来理解核心配置，但市值加权仍会把较多权重交给最大公司。", risks: ["只覆盖美国大型公司", "头部公司权重会随市值上升", "短期仍可能出现显著回撤"], role: "常被用作美国大型股核心配置" },
  "US:SPY": { title: "SPY与VOO跟踪同一指数，但用途和持有成本并不相同", titleLines: ["SPY与VOO跟踪同一指数，", "但用途和持有成本并不相同"], summary: "SPY历史更长且交易活跃，适合研究长历史和高流动性；长期持有时还要比较费用率、价差与产品结构。", risks: ["仍只覆盖美国大型公司", "费用率高于部分同指数ETF", "高流动性不代表长期持有成本最低"], role: "长历史与高流动性是它的主要特点" },
  "US:VTI": { title: "VTI覆盖美国大中小公司，但仍是一项单一国家配置", titleLines: ["VTI覆盖美国大中小公司，", "但仍是一项单一国家配置"], summary: "它比标普500覆盖面更广，能观察美国全市场；市值加权意味着大型公司仍决定大部分波动。", risks: ["地域集中于美国", "大型公司仍占主要权重", "小盘股覆盖不会消除系统性风险"], role: "用于观察美国全市场，而不是全球市场" },
  "US:VT": { title: "VT把多个国家放在一只ETF里，但全球分散不等于平均分配", titleLines: ["VT把多个国家放在一只ETF里，", "但全球分散不等于平均分配"], summary: "它按市值覆盖全球股票，国家权重会随市场规模变化。它降低单一国家依赖，但全球危机时仍可能一起下跌。", risks: ["美国市场仍可能占较大权重", "包含汇率与不同市场制度风险", "全球市场可能同步回撤"], role: "更接近一只全球股票底仓" },
  "US:SCHX": { title: "SCHX覆盖约750家美国大型公司，范围广于标普500但不是全市场", titleLines: ["SCHX覆盖约750家美国大型公司，", "范围广于标普500但不是全市场"], summary: "它跟踪道琼斯美国大型股总市场指数，发行方定位是低成本大型股核心工具。和VOO相近，不代表持仓与收益路径完全相同。", risks: ["仍集中于美国大型公司", "不覆盖完整的小盘股与海外市场", "与VOO相似不等于完全可替代"], role: "低成本美国大型股核心配置候选" },
};

const money = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });
const compactMoney = (value: number) => value >= 10000 ? `${decimal.format(value / 10000)}万` : `${money.format(value)}元`;
const frequencyName = (value: Frequency) => value === "daily" ? "每日" : value === "monthly" ? "每月" : "每年";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};

function buildVooProxy(voo: HistorySeries | undefined, spy: HistorySeries | undefined): HistorySeries | undefined {
  if (!voo || !spy) return undefined;
  const firstVooPrice = voo.points[0][1];
  const spyAtInception = spy.points.find((point) => point[0] >= voo.firstDate)?.[1];
  if (!spyAtInception) return undefined;
  const feeDifference = (FUND_DETAILS["US:SPY"].fee - FUND_DETAILS["US:VOO"].fee) / 100;
  const proxyPoints = spy.points.filter((point) => point[0] < voo.firstDate).map(([date, price]) => {
    const yearsToInception = dayDistance(date, voo.firstDate) / 365.25;
    return [date, firstVooPrice * (price / spyAtInception) * Math.exp(-feeDifference * yearsToInception)] as [string, number];
  });
  return { ...voo, firstDate: proxyPoints[0]?.[0] ?? voo.firstDate, points: [...proxyPoints, ...voo.points], proxyUntil: voo.firstDate, proxyLabel: "VOO成立前使用同指数ETF SPY的复权历史，并按两者当前费率差做近似调整" };
}

function SecuritySearch({ id, value, market, directory, historyLibrary, packEntries, onSelect }: { id: string; value: Security | null; market: MarketFilter; directory: Security[]; historyLibrary: HistoryLibrary; packEntries: EtfPackEntry[]; onSelect: (item: Security) => void }) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  // Keep the editable label synchronized when a result is selected externally.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDraft(value ? `${value.symbol} — ${value.name}` : ""), [value]);
  const matches = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query || (value && draft === `${value.symbol} — ${value.name}`)) return [];
    return directory.filter((item) => market === "ALL" || item.market === market).map((item) => {
      const symbol = item.symbol.toLowerCase(), name = item.name.toLowerCase(), aliases = item.aliases.toLowerCase();
      const score = symbol === query ? 0 : symbol.startsWith(query) ? 1 : name.startsWith(query) || aliases.startsWith(query) ? 2 : name.includes(query) || aliases.includes(query) ? 3 : 99;
      return { item, score };
    }).filter((result) => result.score < 99).sort((a,b) => a.score - b.score || a.item.symbol.length - b.item.symbol.length).slice(0, 10).map((result) => result.item);
  }, [draft, value, market, directory]);
  return <label className="search-field" htmlFor={id}>
    <span>证券名称或代码</span>
    <div className="search-box"><input id={id} value={draft} autoComplete="off" placeholder="例如：QQQ、VOO、SPY、SCHX" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onChange={(event) => { setDraft(event.target.value); setOpen(true); }} /><b aria-hidden="true">⌕</b>
      {open && matches.length > 0 && <div className="search-menu">{matches.map((item) => { const capability = capabilityFor(item, historyFor(historyLibrary, item), packEntryFor(packEntries, item)); return <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(item); setOpen(false); }}><span><strong>{item.symbol}</strong>{item.name}</span><em>{MARKET_META[item.market].short} · {capability.label}</em></button>; })}</div>}
      {open && draft && matches.length === 0 && (!value || draft !== `${value.symbol} — ${value.name}`) && <div className="search-empty">当前目录未找到；试试完整代码、名称或“全部市场”。</div>}
    </div>
  </label>;
}

function StatusBadge({ security, history, packEntry }: { security: Security | null; history?: HistorySeries; packEntry?: EtfPackEntry }) {
  if (!security) return <span className="status neutral">等待选择</span>;
  const capability = capabilityFor(security, history, packEntry);
  if (capability.status === "history-available") return <span className="status verified">{capability.label}</span>;
  if (capability.status === "facts-only") return <span className="status facts">{capability.label}</span>;
  if (capability.status === "pack-pending") return <span className="status pending">{capability.label}</span>;
  return <span className="status basic">{capability.label}</span>;
}

export default function PlanPage() {
  const [directory, setDirectory] = useState<Security[]>([]);
  const [historyLibrary, setHistoryLibrary] = useState<HistoryLibrary>({});
  const [etfManifest, setEtfManifest] = useState<EtfPackManifest | null>(null);
  const [macroHistory, setMacroHistory] = useState<MacroHistory | null>(null);
  const [directoryError, setDirectoryError] = useState(false);
  const [dataSource, setDataSource] = useState<"cloudbase" | "static">("static");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("ALL");
  const [selected, setSelected] = useState<Security | null>(null);
  const [compared, setCompared] = useState<Security | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [startDate, setStartDate] = useState(today);
  const [payment, setPayment] = useState(10);
  const [initial, setInitial] = useState(0);
  const [years, setYears] = useState(20);
  const [inflation, setInflation] = useState(2.5);
  const [inflationMode, setInflationMode] = useState<InflationMode>("historical");
  const [contributionGrowth, setContributionGrowth] = useState(false);
  const [unitMode, setUnitMode] = useState<UnitMode>("fractional");
  const [fxRate, setFxRate] = useState(7.2);
  const [fxMode, setFxMode] = useState<FxMode>("historical");
  const [lotSize, setLotSize] = useState(1);
  const [historyMode, setHistoryMode] = useState<HistoryMode>("rolling");
  const [historyStart, setHistoryStart] = useState("");
  const [realChart, setRealChart] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [channelRates, setChannelRates] = useState<Record<string,string>>({ tiantian: "", ant: "", direct: "", broker: "" });
  const paymentInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMarketData(PUBLIC_BASE_PATH).then((bundle) => {
      setDirectory(bundle.directory);
      setHistoryLibrary(bundle.historyLibrary);
      setEtfManifest(bundle.etfManifest);
      setMacroHistory(bundle.macroHistory);
      setDataSource(bundle.source);
    }).catch(() => {
      setDirectoryError(true);
      setHistoryLibrary({});
      setEtfManifest(null);
      setMacroHistory(null);
    });
  }, []);

  const market: Market = selected?.market ?? (marketFilter === "ALL" ? "US" : marketFilter);
  const detail = selected ? FUND_DETAILS[selected.id] : undefined;
  const fxSeries = market === "US" ? macroHistory?.fx.USD_CNY : market === "HK" ? macroHistory?.fx.HKD_CNY : undefined;
  const cpiSeries = macroHistory?.cpiCny;
  const insight = selected ? ASSET_INSIGHTS[selected.id] : undefined;
  const packEntries = useMemo(() => etfManifest?.entries ?? [], [etfManifest]);
  const selectedPackEntry = packEntryFor(packEntries, selected);
  const comparedPackEntry = packEntryFor(packEntries, compared);
  const actualHistorySeries = historyFor(historyLibrary, selected);
  const availableProxySeries = useMemo(() => selected?.id === "US:VOO" ? buildVooProxy(historyLibrary.VOO, historyLibrary.SPY) : undefined, [selected?.id, historyLibrary]);
  const historySeries = proxyEnabled && availableProxySeries ? availableProxySeries : actualHistorySeries;
  const comparedSeries = historyFor(historyLibrary, compared);
  const capability = capabilityFor(selected, actualHistorySeries, selectedPackEntry);
  const isEtfReplay = capability.mode === "etf-replay";
  const historyDays = historySeries ? dayDistance(historySeries.firstDate, historySeries.lastDate) : 0;
  const historyPoints = historySeries?.points.length ?? 0;
  const availableHistoryYears = historySeries ? Math.floor(historyDays / 365.25) : 0;
  const effectiveReplayYears = availableHistoryYears > 0 ? Math.min(years, availableHistoryYears) : 0;
  const suggestedYears = availableHistoryYears >= 20 ? 20 : availableHistoryYears >= 15 ? 15 : availableHistoryYears >= 10 ? 10 : availableHistoryYears >= 5 ? 5 : 0;

  const options: ReplayOptions = useMemo(() => ({
    frequency,
    payment,
    initial,
    inflation,
    inflationMode,
    cpiPoints: cpiSeries?.points,
    contributionGrowth,
    fxRate: market === "CN" ? 1 : Math.max(.0001, fxRate),
    fxMode: market === "CN" ? "fixed" : fxMode,
    fxPoints: fxSeries?.points,
    scheduleDay: Number(startDate.slice(8, 10)) || 1,
    unitMode,
    lotSize: Math.max(1, lotSize),
    feeRate: detail?.fee ?? Number.NaN,
  }), [frequency, payment, initial, inflation, inflationMode, cpiSeries, contributionGrowth, fxRate, fxMode, fxSeries, startDate, market, unitMode, lotSize, detail?.fee]);

  const replay = useMemo(() => calculateRollingReplay(historySeries, effectiveReplayYears, options), [historySeries, effectiveReplayYears, options]);
  const shortReplay = useMemo(() => {
    if (!isEtfReplay || !historySeries || historySeries.points.length < 2 || availableHistoryYears > 0) return null;
    return replayWindow(historySeries.points, 0, historySeries.points.length - 1, options, true, historySeries.firstDate);
  }, [isEtfReplay, historySeries, availableHistoryYears, options]);
  const replayForDisplay = useMemo(() => isEtfReplay ? (replay ?? (shortReplay && historySeries ? {
    samples: 1,
    requestedYears: 0,
    firstDate: historySeries.firstDate,
    lastDate: historySeries.lastDate,
    worst: shortReplay,
    median: shortReplay,
    best: shortReplay,
    lossShare: shortReplay.endValue < shortReplay.principal ? 1 : 0,
    limited: true,
  } : null)) : null, [isEtfReplay, replay, shortReplay, historySeries]);
  const specificReplay = useMemo(() => calculateSpecificReplay(historySeries, historyStart || historySeries?.firstDate || "", effectiveReplayYears, options), [historySeries, historyStart, effectiveReplayYears, options]);
  const metrics = useMemo(() => computeProductMetrics(actualHistorySeries), [actualHistorySeries]);
  const comparedMetrics = useMemo(() => computeProductMetrics(comparedSeries), [comparedSeries]);
  const calendar = useMemo(() => analyzeCalendar(startDate, years, market, frequency), [startDate, years, market, frequency]);
  const principal = projectedPrincipal(calendar, payment, initial, inflation, contributionGrowth);
  const periodicPrincipal = principal - initial;
  const historyLatest = useMemo(() => packEntries.map((entry) => entry.lastDate).filter(Boolean).sort().at(-1), [packEntries]);
  const retrievedLatest = useMemo(() => packEntries.map((entry) => entry.retrieved).filter(Boolean).sort().at(-1), [packEntries]);
  const directoryLatest = useMemo(() => directory.map((item) => item.updated).sort().at(-1), [directory]);
  const directoryCounts = useMemo(() => directory.reduce((acc, item) => ({ ...acc, [item.market]: (acc[item.market] ?? 0) + 1 }), {} as Record<string,number>), [directory]);
  const common = useMemo(() => commonSeries(historySeries, comparedSeries), [historySeries, comparedSeries]);
  const commonMetricsA = useMemo(() => common ? computeProductMetrics(common.first) : null, [common]);
  const commonMetricsB = useMemo(() => common ? computeProductMetrics(common.second) : null, [common]);
  const representative = historyMode === "rolling" ? replayForDisplay?.median : specificReplay;
  const dataAgeDays = historyLatest ? dayDistance(historyLatest, today()) : null;
  const historyTitleLines: [string, string] = insight?.titleLines ?? ["ETF和个股，不能套用", "同一套长期结论"];

  useEffect(() => {
    const entries = [selectedPackEntry, comparedPackEntry].filter((entry): entry is EtfPackEntry => Boolean(entry?.historyPath));
    for (const entry of entries) {
      if (historyLibrary[entry.id] || historyLibrary[entry.symbol]) continue;
      loadSecurityHistory(entry, PUBLIC_BASE_PATH).then((series) => {
        if (series) setHistoryLibrary((current) => ({ ...current, [entry.id]: series, [entry.symbol]: series }));
      }).catch(() => { /* The capability card keeps the precise no-history state. */ });
    }
  }, [selectedPackEntry, comparedPackEntry, historyLibrary]);

  useEffect(() => {
    const meta = MARKET_META[market];
    // Market changes intentionally reset market-specific calculator defaults.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFxRate(market === "CN" ? 1 : (fxSeries?.points.at(-1)?.[1] ?? meta.defaultFx));
    setLotSize(meta.lotSize);
  }, [market, fxSeries]);
  // Clamp an outdated start date after the selected history series changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (historySeries && (!historyStart || historyStart < historySeries.firstDate)) setHistoryStart(historySeries.firstDate); }, [historySeries, historyStart]);

  function choose(item: Security) { setSelected(item); setMarketFilter(item.market); setProxyEnabled(false); }
  function chooseQuick(symbol: string, wantedMarket: Market = "US") { const item = directory.find((entry) => entry.market === wantedMarket && entry.symbol === symbol); if (item) choose(item); }
  function changeMarket(next: MarketFilter) { setMarketFilter(next); if (next !== "ALL" && selected && selected.market !== next) setSelected(null); }
  function beginCalculation() { document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" }); setTimeout(() => paymentInput.current?.focus(), 450); }

  const channels = useMemo(() => {
    const entries = [
      { key: "tiantian", name: "天天基金", evidence: "同一基金、同一份额、同日购买页" },
      { key: "ant", name: "支付宝 / 蚂蚁财富", evidence: "同一基金、同一份额、同日购买页" },
      { key: "direct", name: "基金公司直销", evidence: "直销页、招募说明书或费率公告" },
      { key: "broker", name: "银行 / 券商代销", evidence: "合同、公告或产品确认页" },
    ];
    const base = replayForDisplay?.median;
    const results = entries.map((item) => {
      const rate = channelRates[item.key] === "" ? null : Number(channelRates[item.key]);
      if (rate == null || !Number.isFinite(rate)) return { ...item, rate: null, paid: null, opportunity: null };
      const adjusted = base && historySeries ? replayWindow(historySeries.points, base.startIndex, base.endIndex, { ...options, payment: options.payment * (1-rate/100), initial: options.initial * (1-rate/100) }) : null;
      const paid = adjusted && base ? base.principal - adjusted.principal : principal * rate / 100;
      const opportunity = adjusted && base ? Math.max(0, base.endValue - adjusted.endValue) : null;
      return { ...item, rate, paid, opportunity };
    });
    const ranked = results.filter((item) => item.paid != null).sort((a,b) => (a.paid ?? 0) - (b.paid ?? 0));
    return results.map((item) => ({ ...item, rank: item.paid == null ? null : ranked.findIndex((row) => row.key === item.key) + 1, gap: item.paid == null || !ranked[0] ? null : item.paid - (ranked[0].paid ?? 0) }));
  }, [channelRates, principal, replayForDisplay, historySeries, options]);

  return <main>
    <header className="site-header"><a className="brand" href={`${PUBLIC_BASE_PATH}/`}><span className="brand-mark"><i/><i/><i/></span><span>简投学堂</span></a><nav><a href={`${PUBLIC_BASE_PATH}/`}>首页</a><a href="#calculator">定投测算</a><a href="#charts">数据图</a><a href="#history">历史回放</a><a href="#directory">对比</a><a href="#channels">费用</a></nav><span className="no-ads"><i/> 零广告 · 只讲证据</span></header>

    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow"><span/> 定投研究工具</p><h1>先算清投入，<br/>再把计划放进<span>真实历史</span>。</h1><p className="hero-lede">从每天10元这样的生活尺度开始。工具会区分交易日、产品费用、通胀、交易单位和历史波动；不会拿一个“稳定年化”替你猜未来。</p><button className="primary-button" onClick={beginCalculation}>输入我的计划 <span>→</span></button><ul className="trust-list"><li><span>✓</span> 只在交易日执行</li><li><span>✓</span> 供应商复权历史回放</li><li><span>✓</span> 数据不足明确留空</li></ul></div>
      <div className="answer-card"><div className="answer-head"><p>先看四个可计算的答案</p><StatusBadge security={selected} history={historySeries} packEntry={selectedPackEntry}/></div><div className="answer-grid">
        <article><span>01 · 计划投入</span><strong>{compactMoney(principal)}</strong><p>{money.format(calendar.contributions)}次投入，不把30天当30个交易日</p></article>
        <article><span>02 · 历史中间结果</span><strong>{replayForDisplay ? compactMoney(replayForDisplay.median.endValue) : "资料不足"}</strong><p>{replayForDisplay ? `${replayForDisplay.samples}个滚动起点的排序中间值` : capability.mode === "stock-facts" ? "个股只展示事实统计" : "选择有完整历史的ETF后计算"}</p></article>
        <article><span>03 · 购买力</span><strong>{replayForDisplay ? compactMoney(replayForDisplay.median.realEndValue) : "随通胀变化"}</strong><p>按历史路径起点币值表示，不等于名义余额</p></article>
        <article><span>04 · 产品费率影响</span><strong>{replayForDisplay && detail ? compactMoney(replayForDisplay.median.feeDrag) : (detail ? `${detail.fee}% / 年` : "等待核验")}</strong><p>{replayForDisplay && detail ? "历史中间路径的期末差额估算" : "费率来自发行方，不是销售平台统一收费"}</p></article>
      </div><div className="answer-flow"><span>计划本金</span><b>→</b><span>真实历史</span><b>→</b><span>风险与回撤</span><b>→</b><span>费用与购买力</span></div></div>
    </section>

    <section className="calculator-section" id="calculator">
      <div className="section-title"><div><p>DCA PLAN LAB</p><h2>先算清投入，再讨论收益</h2></div><span>数据模式：{dataSource === "cloudbase" ? "CloudBase 内测 API" : "公开历史快照"} · 行情最后交易日 {historyLatest ?? "加载中"} · 数据抓取 {retrievedLatest ?? "加载中"} · 证券目录 {directoryLatest ?? "加载中"}</span></div>
      <div className="calculator-layout"><div className="input-panel">
        <div className="frequency-tabs">{(["daily","monthly","yearly"] as Frequency[]).map((item) => <button type="button" key={item} className={frequency===item?"active":""} onClick={() => setFrequency(item)}>{frequencyName(item)}</button>)}</div>
        <div className="input-grid">
          <label><span>交易市场</span><select value={marketFilter} onChange={(event) => changeMarket(event.target.value as MarketFilter)}><option value="ALL">全部市场</option>{Object.entries(MARKET_META).map(([id,item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
          <label><span>计划开始日期</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value || today())}/></label>
          <SecuritySearch id="main-security" value={selected} market={marketFilter} directory={directory} historyLibrary={historyLibrary} packEntries={packEntries} onSelect={choose}/>
          <label><span>{frequencyName(frequency)}投入</span><div className="input-with-unit"><input ref={paymentInput} type="number" min="0" step={frequency==="daily"?1:100} value={payment} onChange={(event) => setPayment(Math.max(0,Number(event.target.value)))}/><em>元</em></div></label>
          <label><span>初始资金</span><div className="input-with-unit"><input type="number" min="0" step="1000" value={initial} onChange={(event) => setInitial(Math.max(0,Number(event.target.value)))}/><em>元</em></div></label>
          <label><span>投入年限</span><div className="input-with-unit"><input type="number" min="1" max="40" value={years} onChange={(event) => setYears(Math.max(1,Math.min(40,Number(event.target.value))))}/><em>年</em></div></label>
          <label><span>购买力口径</span><select value={inflationMode} onChange={(event)=>setInflationMode(event.target.value as InflationMode)}><option value="historical">国家统计局历史CPI（推荐）</option><option value="scenario">固定通胀情景</option></select></label>
          <label><span>{inflationMode==="historical"?"历史缺口 / 未来通胀假设":"固定年通胀假设"}</span><div className="input-with-unit"><input type="number" min="0" max="20" step=".1" value={inflation} onChange={(event) => setInflation(Math.max(0,Number(event.target.value)))}/><em>%</em></div></label>
          {market!=="CN"&&<label><span>人民币换算口径</span><select value={fxMode} onChange={(event)=>setFxMode(event.target.value as FxMode)}><option value="historical">外汇局逐日中间价（推荐）</option><option value="fixed">固定汇率情景</option></select></label>}
          {market!=="CN"&&<label><span>{fxMode==="historical"?`历史缺口备用：1 ${MARKET_META[market].currency}`:`固定换算：1 ${MARKET_META[market].currency}`}</span><div className="input-with-unit"><input type="number" min=".01" step=".0001" value={fxRate} onChange={(event) => setFxRate(Math.max(.01,Number(event.target.value)))}/><em>元</em></div></label>}
          <label><span>交易单位</span><select value={unitMode} onChange={(event) => setUnitMode(event.target.value as UnitMode)}><option value="fractional">理论碎股（允许小数份额）</option><option value="whole">按整股 / 整手，余额累计</option></select></label>
          {unitMode==="whole"&&<label><span>每手份额（需向券商核对）</span><div className="input-with-unit"><input type="number" min="1" step="1" value={lotSize} onChange={(event) => setLotSize(Math.max(1,Number(event.target.value)))}/><em>份</em></div></label>}
        </div>
        <div className="switch-row"><label><input type="checkbox" checked={contributionGrowth} onChange={(event)=>setContributionGrowth(event.target.checked)}/><span>每年按通胀上调投入额</span></label><p>{contributionGrowth ? "投入额与物价同步增长，因此未来实际投入本金也会增加。" : "每次投入保持名义金额不变。"}</p></div>
        <div className="selection-note"><StatusBadge security={selected} history={actualHistorySeries} packEntry={selectedPackEntry}/><p>{selected ? <><strong>{selected.symbol} · {selected.name}</strong> 已自动切换到{MARKET_META[selected.market].short}。{capability.description}</> : "输入证券后，市场会自动联动。"}</p></div>
        <p className="method-inline">{market!=="CN" ? (fxMode==="historical"&&fxSeries ? `每笔投入按当日外汇局人民币汇率中间价换算，非交易日沿用最近公布值；当前最新参考值为 1 ${MARKET_META[market].currency} = ${fxSeries.points.at(-1)?.[1].toFixed(4)} 元（${fxSeries.lastDate}）。中间价不是券商实际换汇成交价。` : `当前按固定汇率情景换算；它适合做敏感性测试，不代表历史实际换汇成本。`) : "A股以人民币计价，无需换汇。"} {inflationMode==="historical"&&cpiSeries ? `购买力按国家统计局CPI月度指数计算（最新 ${cpiSeries.lastDate}），超出覆盖期才使用你填写的通胀假设。` : "购买力按固定通胀假设计算。"}</p>
      </div>

      <div className="projection-panel" aria-live="polite">
        <div className="projection-head"><span>{selected ? `${selected.symbol} · ${MARKET_META[market].short}` : "尚未选择证券"}</span><StatusBadge security={selected} history={actualHistorySeries} packEntry={selectedPackEntry}/></div>
        {detail&&<div className="fund-strip"><div><span>发行方年费率</span><strong>{detail.fee}%</strong><small>截至 {detail.feeAsOf}</small></div><div><span>跟踪指数</span><strong>{detail.benchmark}</strong><small>{detail.issuer} · <a href={detail.officialUrl} target="_blank" rel="noreferrer">原始资料 ↗</a></small></div></div>}
        <div className="principal-card"><p>计划期内总投入</p><strong>{decimal.format(principal/10000)}<small> 万元</small></strong><dl><div><dt>定投次数</dt><dd>{money.format(calendar.contributions)}次</dd></div><div><dt>分期投入</dt><dd>{money.format(periodicPrincipal)}元</dd></div><div><dt>初始资金</dt><dd>{money.format(initial)}元</dd></div></dl></div>
        {replayForDisplay ? <><div className="outcome-focus"><span>{shortReplay ? "最长可用实际历史的期末金额" : "历史排序中间路径的期末金额"}</span><strong>{compactMoney(replayForDisplay.median.endValue)}</strong><div><p>按路径起点购买力 <b>{compactMoney(replayForDisplay.median.realEndValue)}</b></p><p>投资收益 <b>{compactMoney(replayForDisplay.median.endValue-replayForDisplay.median.principal)}</b></p><p>按当前费率估算的期末拖累 <b>{replayForDisplay.median.feeRateKnown ? compactMoney(replayForDisplay.median.feeDrag) : "费率资料未核验"}</b></p></div></div>{shortReplay ? <div className="scenario-cards"><ScenarioCard label="全部可用历史路径" replay={shortReplay}/></div> : <div className="scenario-cards"><ScenarioCard label="最不利实际起点" replay={replayForDisplay.worst}/><ScenarioCard label="排序中间起点" replay={replayForDisplay.median}/><ScenarioCard label="最有利实际起点" replay={replayForDisplay.best}/></div>}<p className="warning-note">请求投入期为{years}年；当前产品实际可用历史为{availableHistoryYears > 0 ? `约${availableHistoryYears}年` : `${historyPoints}个交易点（跨度${historyDays}天）`}，本次只回放真实覆盖区间。{shortReplay ? "历史不足1年，不生成多年年化或滚动区间。" : `${replayForDisplay.samples}条路径高度重叠；“排序中间”不是未来概率。`} 供应商复权行情已经包含产品运行中的费用影响；{replayForDisplay.median.feeRateKnown ? "费率拖累是反事实估算，不会从历史结果中再扣一次。" : "当前费率资料未核验，因此不显示虚假的0元拖累。"}</p></> : <NoAnalysis selected={selected} insight={insight} capability={capability} years={years} availableHistoryYears={availableHistoryYears} suggestedYears={suggestedYears} onYears={setYears} onQuick={chooseQuick}/>}
      </div></div>

      <CalendarCard calendar={calendar} market={market} frequency={frequency}/>

      <section className="chart-lab" id="charts">
        <div className="chart-heading"><div><span>DATA AT A GLANCE</span><h3>{selected ? `${selected.symbol} 的数据图` : "选择标的后生成数据图"}</h3></div><p>图表使用供应商日终前复权价格历史；账户图按所选汇率口径换算人民币。仍不包含税、点差和券商规则。</p></div>
        {historySeries&&representative ? <div className="chart-grid">
          {isEtfReplay&&<article className="chart-card wide"><div className="chart-card-head"><div><span>我的定投账户</span><strong>投入本金与账户价值</strong></div><div className="mini-tabs"><button className={!realChart?"active":""} onClick={()=>setRealChart(false)}>名义金额</button><button className={realChart?"active":""} onClick={()=>setRealChart(true)}>起点购买力</button></div></div><AccountChart path={representative.path??[]} real={realChart} proxyUntil={historySeries.proxyUntil}/><p>{shortReplay?`展示全部可用历史：${representative.start}—${representative.end}`:historyMode==="rolling"?`展示滚动样本中排序居中的路径：${representative.start}—${representative.end}`:`展示指定起点路径：${representative.start}—${representative.end}`} {historySeries.proxyLabel&&`虚线部分：${historySeries.proxyLabel}。`}</p></article>}
          {metrics ? <><article className="chart-card"><div className="chart-card-head"><div><span>产品本身</span><strong>100点增长到多少</strong></div></div><LineChart data={metrics.growth} tone="green" suffix="点"/><p>供应商复权价格变化，不代表你的定投账户。</p></article><article className="chart-card"><div className="chart-card-head"><div><span>风险过程</span><strong>距离历史高点有多远</strong></div></div><LineChart data={metrics.drawdowns} tone="red" suffix="%"/><p>最大回撤 {metrics.maxDrawdown.toFixed(1)}%，发生于 {metrics.drawdownWindow}。</p></article></> : shortReplay ? <article className="chart-card"><div className="chart-card-head"><div><span>短历史风险</span><strong>实际最大回撤 {shortReplay.productMaxDrawdown.toFixed(1)}%</strong></div></div><p>只有{historyPoints}个交易点（跨度{historyDays}天），暂不年化、不生成年度收益和多年滚动区间。</p></article> : null}
        </div> : <div className="chart-empty">当前标的没有可加载的复权历史，所以不画一条看似精确、实际不可追溯的曲线。</div>}
      </section>
    </section>

    <section className="history-section" id="history"><div className="section-heading"><div><p>HISTORICAL STRESS TEST</p><h2 aria-label={insight?.title ?? "ETF和个股，不能套用同一套长期结论"}>{historyTitleLines.map((line) => <span className="heading-line" key={line}>{line}</span>)}</h2></div><p>{insight?.summary ?? "ETF先研究指数覆盖、费用与跟踪；个股还要研究公司经营、退市和幸存者偏差。"}</p></div>
      {insight&&<div className="asset-lens"><div><span>它更适合怎样理解</span><strong>{insight.role}</strong></div><ul>{insight.risks.map((risk)=><li key={risk}>{risk}</li>)}</ul><a href={detail?.officialUrl} target="_blank" rel="noreferrer">查看发行方资料 →</a></div>}
      {metrics&&<><MetricPanel metrics={metrics} detail={detail}/><AnnualReturnChart data={metrics.annualReturns}/></>}
      <div className="history-controls"><div className="mini-tabs"><button className={historyMode==="rolling"?"active":""} onClick={()=>setHistoryMode("rolling")}>滚动全部起点</button><button className={historyMode==="specific"?"active":""} onClick={()=>setHistoryMode("specific")}>指定历史起点</button></div>{historyMode==="specific"&&historySeries&&<label><span>历史起点</span><input type="date" min={historySeries.firstDate} max={historySeries.lastDate} value={historyStart} onChange={(event)=>setHistoryStart(event.target.value)}/></label>}</div>
      {isEtfReplay&&historyMode==="rolling"&&replay ? <><div className={`replay-grid ${replay.limited?"limited":""}`}><ReplayCard label="过去最不利的实际起点" item={replay.worst}/>{!replay.limited&&<ReplayCard label="历史排序中间的起点" item={replay.median} featured/>}<ReplayCard label="过去最有利的实际起点" item={replay.best}/></div><div className="replay-summary"><div><span>完整滚动路径</span><strong>{replay.samples} 条</strong><p>每月取一个起点，相邻样本高度重叠。</p></div><div><span>期末低于投入本金</span><strong>{(replay.lossShare*100).toFixed(1)}%</strong><p>只是历史出现比例，不是未来亏损概率。</p></div><div><span>实际历史</span><strong>{replay.firstDate} 起</strong><p>最后交易日 {replay.lastDate}。</p></div></div></> : isEtfReplay&&historyMode==="rolling"&&shortReplay ? <div className="specific-result"><ReplayCard label="全部可用历史路径" item={shortReplay} featured/><div><span>为什么没有多年区间</span><strong>该ETF只有{historyPoints}个交易点（跨度{historyDays}天）</strong><p>仍可计算投入、期末价值和实际回撤，但不把短期涨跌年化成长期结论。</p></div></div> : isEtfReplay&&historyMode==="specific"&&specificReplay ? <div className="specific-result"><ReplayCard label="指定起点的真实路径" item={specificReplay} featured/><div><span>它回答什么</span><strong>如果当时开始执行同一套计划，实际经历了什么</strong><p>这是单条历史路径，不代表“最可能发生”的未来。换一个起点，结果可能明显不同。</p></div></div> : capability.mode === "stock-facts" ? <div className="facts-only-note"><strong>个股只展示事实统计</strong><p>上方指标和年度图描述这段价格/股息历史；不会把存续价格曲线包装成“最差、最好长期定投结论”。个股还需要结合公司经营、退市、业务变化和幸存者偏差。</p></div> : <HistoryEmpty/>}
      <div className="proxy-box"><label><input type="checkbox" checked={proxyEnabled} disabled={!availableProxySeries} onChange={(event)=>setProxyEnabled(event.target.checked)}/><span>允许使用代理历史（默认关闭）</span></label><p>{availableProxySeries ? (proxyEnabled ? `${availableProxySeries.proxyLabel}。代理与真实产品会分段标注，不作为“VOO实际存在了更久”。` : "关闭时只使用VOO成立后的真实复权历史。开启后可用SPY补足同一指数的更早阶段。") : "当前标的尚未接入满足来源、总回报和拼接口径要求的代理历史，因此不会悄悄延长。"}</p></div>
      <div className="stress-explainer"><div><span>滚动回放为什么仍有价值</span><strong>它让同一套计划从许多真实月份重新出发，看到起点不同带来的结果范围</strong></div><div><span>为什么不把百分位写成预测</span><strong>路径互相重叠，且未来市场环境可能不同；排序只描述历史分布</strong></div><a href={historySeries?.sourceUrl??"#sources"} target="_blank" rel="noreferrer">查看行情来源页面 →</a></div>
    </section>

    <section className="directory-section" id="directory"><div className="section-heading"><div><p>COMPARE ON COMMON HISTORY</p><h2><span className="heading-line">先看懂一只，</span><span className="heading-line">再把两只放到同一段历史里</span></h2></div><p>目录共 {money.format(directory.length)} 只：美股 {money.format(directoryCounts.US||0)}、A股 {money.format(directoryCounts.CN||0)}、港股 {money.format(directoryCounts.HK||0)}。目录覆盖不等于深度分析覆盖。{directoryError&&"目录加载失败，请刷新。"}</p></div>
      <div className="compare-workbench"><article><p>证券 A</p><SecuritySearch id="security-a" value={selected} market="ALL" directory={directory} historyLibrary={historyLibrary} packEntries={packEntries} onSelect={choose}/><SecurityCard security={selected} history={historySeries} metrics={metrics} packEntry={selectedPackEntry}/></article><article><p>证券 B</p><SecuritySearch id="security-b" value={compared} market="ALL" directory={directory} historyLibrary={historyLibrary} packEntries={packEntries} onSelect={setCompared}/><SecurityCard security={compared} history={comparedSeries} metrics={comparedMetrics} packEntry={comparedPackEntry}/></article><div className="compare-result"><p>共同历史口径</p>{selected&&compared&&common&&commonMetricsA&&commonMetricsB ? <><strong className="compare-period">{common.start} — {common.end}</strong><ComparisonRows a={selected.symbol} b={compared.symbol} first={commonMetricsA} second={commonMetricsB}/><DualGrowthChart first={common.first} second={common.second} firstLabel={selected.symbol} secondLabel={compared.symbol}/><small>两只产品只比较共同存在的日期，避免“历史更长”本身造成不公平。费用、指数覆盖与成立结构仍需分别看。</small></> : <div className="compare-placeholder"><strong>选择两只有可核验复权历史的ETF</strong><p>目录覆盖中美港大量证券；100只主流ETF会标明清单状态，只有当前快照同时具备复权历史的标的才生成共同历史比较。</p></div>}</div></div>
    </section>

    <section className="channels-section" id="channels"><div className="section-heading"><div><p>FUND COST VERIFIER</p><h2>产品费用和购买渠道，分开算</h2></div><p>ETF年费率已经体现在基金净值里；销售渠道可能影响申购费、佣金、汇兑与点差。支付宝和天天基金没有一个适用于所有产品的统一“默认费率”。</p></div>
      {detail&&replayForDisplay&&<div className="fee-impact"><article><span>{selected?.symbol} 官方当前年费率</span><strong>{detail.fee}%</strong><p>{detail.issuer}，截至 {detail.feeAsOf}</p></article><article><span>按当前费率估计的直接运营费</span><strong>{compactMoney(replayForDisplay.median.estimatedDirectFee)}</strong><p>把当前费率应用于整段持仓的近似值，不是账单</p></article><article><span>按当前费率估计的期末总拖累</span><strong>{compactMoney(replayForDisplay.median.feeDrag)}</strong><p>含失去的复利；不代表历史费率始终不变</p></article></div>}
      <div className="channel-controls"><div><span className="cost-step">正确比较顺序</span><strong>同一基金 → 同一份额 → 同一日期 → 各渠道购买页</strong></div><p>当前计划本金为 {money.format(principal)} 元。录入购买页当天真实费率后，工具会在同一条历史路径中逐笔减少可投资金额，再计算期末差额；没有原公告或购买页，就不填默认值。</p></div>
      <div className="channel-table-wrap"><table className="channel-table"><thead><tr><th>已录入排序 / 渠道</th><th>购买页费率</th><th>累计直接费用估算</th><th>含历史复利的期末影响</th><th>与最低已录入差额</th><th>证据要求</th></tr></thead><tbody>{channels.map((item) => <tr key={item.key}><td><span className="rank">{item.rank?`#${item.rank}`:"—"}</span><strong>{item.name}</strong></td><td><div className="rate-entry"><input aria-label={`${item.name}费率`} type="number" min="0" max="10" step=".01" placeholder="购买页费率" value={channelRates[item.key]??""} onChange={(event) => setChannelRates({...channelRates,[item.key]:event.target.value})}/><em>%</em></div></td><td>{item.paid==null?"待录入":`${money.format(item.paid)} 元`}</td><td>{item.opportunity==null?(replay?"待录入":"需先选择有完整历史的ETF"):`约 ${money.format(item.opportunity)} 元`}</td><td>{item.gap==null?"无法比较":`${money.format(item.gap)} 元`}</td><td><span className="source-needed">{item.evidence}</span></td></tr>)}</tbody></table></div>
      <div className="channel-explainer"><strong>为什么这里不能直接照搬第三方排行？</strong><p>渠道费会因基金、份额类别、用户活动和日期改变。聚合网站可以帮助发现产品，但最终对比仍要回到同一基金的招募说明书、费率公告和各渠道当日确认页。本表按“每笔投入都以录入费率减少可投资金额”做简化回放；若实际采用价内法、阶梯费率或佣金最低收费，仍应以确认页为准。</p></div>
    </section>

    <section className="sources-section" id="sources"><div className="section-heading"><div><p>DATA & METHOD</p><h2><span className="heading-line">每个数字，都说明</span><span className="heading-line">来源、日期和局限</span></h2></div><p>行情数据不是实时盘口。当前采用日终复权历史，适合长期研究；若自动更新失败，会保留最后成功日期，不把旧数据伪装成最新。</p></div><div className="source-list">
      <article><span>产品费率</span><h3>发行方官网与最新基金资料</h3><p>QQQ、VOO、SPY、VTI、VT、SCHX的费率、成立日与跟踪指数来自发行方页面，并显示核验日期。</p><a href={detail?.officialUrl??"https://www.sec.gov/search-filings"} target="_blank" rel="noreferrer">查看当前产品原始资料 →</a></article>
      <article><span>复权行情</span><h3>供应商日线前复权价格</h3><p>100只主流ETF优先采用东方财富fqt=1日线，网络限制时回退腾讯证券qfq日线；每只文件记录实际来源。它不是基金公司官方总回报序列，也不是实时行情；公开展示许可尚未确认。</p><a href={historySeries?.sourceUrl??"https://quote.eastmoney.com/"} target="_blank" rel="noreferrer">查看来源页面 →</a></article>
      <article><span>交易日历</span><h3>NYSE、上交所与港交所公告</h3><p>已公布年份逐日排除周末和休市；远期尚未公布的年份只按历史交易日数估算并明确标注。</p><div className="multi-links"><a href="https://www.nyse.com/trade/hours-calendars" target="_blank" rel="noreferrer">NYSE</a><a href="https://www.sse.com.cn/disclosure/dealinstruc/closed/" target="_blank" rel="noreferrer">上交所</a><a href="https://www.hkex.com.hk/Services/Trading-Hours-and-Severe-Weather-Arrangements/Trading-Hours/Securities-Market?sc_lang=zh-HK" target="_blank" rel="noreferrer">港交所</a></div></article>
      <article><span>人民币汇率</span><h3>国家外汇管理局中间价</h3><p>美股和港股回放逐笔使用公布日汇率；周末和休市日沿用最近值。中间价是统一研究口径，不是券商实际成交价。</p><a href="https://www.safe.gov.cn/safe/rmbhlzjj/" target="_blank" rel="noreferrer">查看外汇局原始数据 →</a></article>
      <article><span>购买力</span><h3>国家统计局居民消费价格指数</h3><p>历史路径按月度CPI指数换算为路径起点购买力；覆盖期外才使用用户填写的通胀情景，不改变名义账户余额。</p><a href="https://data.stats.gov.cn/easyquery.htm?cn=A01" target="_blank" rel="noreferrer">查看国家数据 →</a></article>
      <article><span>证券目录</span><h3>交易所与官方证券列表</h3><p>目录用来检索名称、代码与市场，不代表每只证券都有行情、基金资料或可作长期结论。</p><div className="multi-links"><a href="https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs" target="_blank" rel="noreferrer">Nasdaq</a><a href="https://www.szse.cn/market/product/stock/list/index.html" target="_blank" rel="noreferrer">深交所</a><a href="https://www.hkex.com.hk/Services/Trading/Securities/Securities-Lists?sc_lang=zh-HK" target="_blank" rel="noreferrer">港交所</a></div></article>
      <article><span>费用影响</span><h3>SEC Investor.gov费用说明</h3><p>基金运营费用从基金资产中扣除并降低净值回报；本工具不在复权回报上再次扣一次，而是做无费率反事实。</p><a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/mutual-fund-and-etf-fees-and-expenses-investor-bulletin" target="_blank" rel="noreferrer">查看SEC说明 →</a></article>
      <article><span>更新时间</span><h3>日终更新，而非盘中“实时”</h3><p>长期定投不需要秒级价格。当前页面只展示已核验快照；更新失败会明确保留旧日期，不悄悄写入残缺文件。</p><span className={`source-stamp ${dataAgeDays!=null&&dataAgeDays>7?"stale":""}`}>最后交易日 {historyLatest??"—"} · 抓取 {retrievedLatest??"—"}{dataAgeDays!=null&&dataAgeDays>7?` · 已滞后${dataAgeDays}天`:""}</span></article>
    </div><div className="method-note"><strong>仍然没有假装解决的事</strong><p>外汇中间价不等于券商实际换汇价；港股每手股数因证券而异；税、佣金、点差与碎股支持取决于券商；当前产品费率不等于全部历史年度费率；指数代理历史仍需可核验的总回报序列与拼接方法。尚未完整接入的信息只给可编辑假设和明确提示。</p></div></section>

    <section className="principles"><div><p>简投学堂的原则</p><h2>看懂不确定性，<br/>比背一个年化更重要。</h2></div><ul><li><strong>01</strong><span>投入金额、交易次数、名义结果与起点购买力分开显示。</span></li><li><strong>02</strong><span>产品回撤与个人账户浮亏分开，ETF与个股也分开分析。</span></li><li><strong>03</strong><span>历史回放用于理解风险，不承诺未来回报。</span></li></ul></section>
    <footer><a className="brand footer-brand" href={`${PUBLIC_BASE_PATH}/`}><span className="brand-mark"><i/><i/><i/></span><span>简投学堂</span></a><p>给普通人的长期投资研究工具</p><p>市场有风险，测算不构成投资建议。请以交易所、基金公司和购买确认页最新文件为准。</p><span>© 2026 简投学堂</span></footer>
  </main>;
}

function ScenarioCard({ label, replay }: { label: string; replay: Replay }) {
  return <article><span>{label}</span><strong>{compactMoney(replay.endValue)}</strong><em>投入 {compactMoney(replay.principal)}</em><small>{replay.start} 起</small></article>;
}

function ReplayCard({ label, item, featured = false }: { label: string; item: Replay; featured?: boolean }) {
  return <article className={featured ? "featured" : ""}><span>{label}</span><strong>{compactMoney(item.endValue)}</strong><p>{item.start} — {item.end}</p><dl><div><dt>实际投入</dt><dd>{compactMoney(item.principal)}</dd></div><div><dt>定投次数</dt><dd>{money.format(item.contributions)}次</dd></div><div><dt>产品最大回撤</dt><dd>{item.productMaxDrawdown.toFixed(1)}%</dd></div><div><dt>账户最低浮盈亏</dt><dd>{item.accountWorstReturn.toFixed(1)}%</dd></div><div><dt>按起点购买力</dt><dd>{compactMoney(item.realEndValue)}</dd></div><div><dt>当前费率拖累估算</dt><dd>{item.feeRateKnown ? compactMoney(item.feeDrag) : "未核验"}</dd></div></dl></article>;
}

function NoAnalysis({ selected, insight, capability, years, availableHistoryYears, suggestedYears, onYears, onQuick }: { selected: Security|null; insight?: Insight; capability: AnalysisCapability; years: number; availableHistoryYears: number; suggestedYears: number; onYears:(value:number)=>void; onQuick:(symbol:string, market?:Market)=>void }) {
  const title = !selected
    ? "先选择证券，再判断能否分析"
    : capability.mode === "stock-facts"
      ? "当前为个股事实统计模式"
      : insight && availableHistoryYears > 0
        ? `实际历史不足以回答“投入${years}年”`
        : "已找到证券，但暂无可核验历史";
  const explanation = !selected
    ? "你可以先算时间和本金；选中证券后，工具会判断资料层级。"
    : capability.mode === "stock-facts"
      ? "个股需要结合公司经营、退市、业务变化和幸存者偏差；本工具不会只凭存续价格曲线套用 ETF 式长期结论。"
      : insight && availableHistoryYears > 0
        ? `该产品约有${availableHistoryYears}年实际复权历史，无法形成完整的${years}年窗口。可以切换到最长可用窗口。`
        : capability.description;
  const quick = [
    ["QQQ", "US" as Market], ["VOO", "US" as Market], ["SCHX", "US" as Market],
    ["159919", "CN" as Market], ["512890", "CN" as Market], ["02800", "HK" as Market],
  ] as const;
  return <div className="no-analysis"><strong>{title}</strong><p>{explanation}</p><div className="quick-picks">{insight&&suggestedYears>0&&years>suggestedYears&&<button onClick={()=>onYears(suggestedYears)}>改为{suggestedYears}年</button>}{quick.map(([symbol, market])=><button key={`${market}:${symbol}`} onClick={()=>onQuick(symbol, market)}>{symbol}</button>)}</div></div>;
}

function CalendarCard({ calendar, market, frequency }: { calendar: CalendarAnalysis; market: Market; frequency: Frequency }) {
  return <div className="calendar-summary"><div className="calendar-head"><div><p>完整周期执行统计</p><strong>{calendar.start.toLocaleDateString("zh-CN")} — {calendar.end.toLocaleDateString("zh-CN")}</strong></div><span className={calendar.exact?"verified":"estimated"}>{calendar.exact?"全部为已公布官方日历":"已公布年份精算 + 远期估算"}</span></div><div className="calendar-grid">
    <article><span>总日历天数</span><strong>{money.format(calendar.totalDays)}</strong><em>天</em></article><article><span>预计交易日</span><strong>{money.format(calendar.tradingDays)}</strong><em>天</em></article><article><span>周末</span><strong>{money.format(calendar.weekends)}</strong><em>天</em></article><article><span>交易所休市</span><strong>{money.format(calendar.exactHolidays+calendar.estimatedHolidays)}</strong><em>天</em></article><article className="accent"><span>实际定投</span><strong>{money.format(calendar.contributions)}</strong><em>次</em></article><article><span>可交易但不投</span><strong>{money.format(calendar.tradableNonContribution)}</strong><em>天</em></article><article><span>不执行定投</span><strong>{money.format(calendar.nonContribution)}</strong><em>日历天</em></article>
  </div>{calendar.previewDates.length>0&&<div className="date-preview"><span>最先执行的日期</span><div>{calendar.previewDates.map((date)=><b key={date}>{date.slice(5)}</b>)}</div></div>}<p>{MARKET_META[market].source}。{calendar.estimatedYears.length ? `${calendar.estimatedYears[0]}—${calendar.estimatedYears.at(-1)}年尚无完整官方日历，按年均交易日估算。` : "区间均有已录入官方日历。"} {frequency!=="daily"&&"每月/每年以开始日对应日期为计划日，遇已知休市顺延到下一交易日。"}</p></div>;
}

function MetricPanel({ metrics, detail }: { metrics: ProductMetrics; detail?: FundDetail }) {
  const items = [
    { name:"存续期年化复权价格变化", value:`${metrics.cagr.toFixed(1)}%`, help:"把当前可用的供应商前复权价格变化折成年均速度。它不是基金公司官方总回报，也不是未来预期。" },
    { name:"年化波动率", value:`${metrics.volatility.toFixed(1)}%`, help:"日收益波动换算成年尺度，数字越大通常越颠簸；它不等于最大亏损。" },
    { name:"最大回撤", value:`${metrics.maxDrawdown.toFixed(1)}%`, help:"从历史高点跌到之后最低点的最大幅度，描述产品本身，不是定投账户。" },
    { name:"最差自然年", value:`${metrics.worstYear.value.toFixed(1)}%`, help:`${metrics.worstYear.year}年首尾复权值变化；自然年边界可能掩盖跨年下跌。` },
    { name:"滚动1年为正", value:`${metrics.positiveOneYear.toFixed(0)}%`, help:"历史上按月取样的一年窗口中，期末不低于期初的比例；不是未来胜率。" },
    { name:"历史恢复耗时", value:metrics.recovered?`约${money.format(metrics.recoveryDays)}天`:"截至数据日仍未恢复", help:metrics.recovered?"最大回撤低点后重新回到此前高点所需的日历天数。":`从最大回撤低点到最后数据日已过约${money.format(metrics.recoveryDays)}天，但仍未回到此前高点。` },
  ];
  return <div className="metric-section"><div className="metric-grid">{items.map((item)=><details key={item.name}><summary><span>{item.name}</span><strong>{item.value}</strong><em>这说明什么？</em></summary><p>{item.help}</p></details>)}</div>{detail&&<div className="official-facts"><span>发行方当前资料</span><p><b>{detail.fee}%</b> 年费率 · {detail.holdings?`${detail.holdings}只持仓 · `:""}{detail.yield?`${detail.yield}%收益率指标 · `:""}{detail.spread!=null?`${detail.spread}% 30日中位买卖价差 · `:""}{detail.turnover!=null?`${detail.turnover}%换手率`:""}</p><small>各指标日期不同，逐项以发行方页面为准；缺失项不补猜。</small></div>}</div>;
}

function SecurityCard({ security, history, metrics, packEntry }: { security: Security|null; history?: HistorySeries; metrics: ProductMetrics|null; packEntry?: EtfPackEntry }) {
  if (!security) return <div className="security-empty">输入名称或代码，查看市场、资料层级和可比较指标。</div>;
  const detail = FUND_DETAILS[security.id];
  const capability = capabilityFor(security, history, packEntry);
  return <div className="security-card"><div><h3>{security.symbol}<small>{security.name}</small></h3><StatusBadge security={security} history={history} packEntry={packEntry}/></div><dl><div><dt>市场 / 交易所</dt><dd>{MARKET_META[security.market].short} · {security.exchange}</dd></div><div><dt>资产类型</dt><dd>{security.assetType}</dd></div><div><dt>分析模式</dt><dd>{capability.label}</dd></div>{packEntry&&<div><dt>主流包类别</dt><dd>{packEntry.category}</dd></div>}<div><dt>费用率</dt><dd>{detail?`${detail.fee}%（${detail.feeAsOf}）`:"暂无可靠数据"}</dd></div>{detail&&<div><dt>跟踪指数</dt><dd>{detail.benchmark}</dd></div>}{history&&<div><dt>历史覆盖</dt><dd>{history.firstDate}—{history.lastDate}</dd></div>}{metrics&&<><div><dt>存续期年化复权价格变化</dt><dd>{metrics.cagr.toFixed(1)}%</dd></div><div><dt>最大回撤</dt><dd>{metrics.maxDrawdown.toFixed(1)}%</dd></div></>}</dl>{detail&&<a href={detail.officialUrl} target="_blank" rel="noreferrer">发行方原始资料 →</a>}<p className="security-boundary">{history ? capability.description : capability.mode === "stock-facts" ? "当前按个股事实统计逻辑处理，不生成 ETF 式长期收益范围。" : capability.description}</p></div>;
}

function ComparisonRows({ a, b, first, second }: { a:string; b:string; first:ProductMetrics; second:ProductMetrics }) {
  const rows = [
    ["存续期年化复权价格变化", `${first.cagr.toFixed(1)}%`, `${second.cagr.toFixed(1)}%`],
    ["年化波动率", `${first.volatility.toFixed(1)}%`, `${second.volatility.toFixed(1)}%`],
    ["最大回撤", `${first.maxDrawdown.toFixed(1)}%`, `${second.maxDrawdown.toFixed(1)}%`],
    ["最差自然年", `${first.worstYear.value.toFixed(1)}%`, `${second.worstYear.value.toFixed(1)}%`],
    ["滚动1年为正", `${first.positiveOneYear.toFixed(0)}%`, `${second.positiveOneYear.toFixed(0)}%`],
  ];
  return <div className="compare-table"><div><span>指标</span><b>{a}</b><b>{b}</b></div>{rows.map((row)=><div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b><b>{row[2]}</b></div>)}</div>;
}

function chartPoints(data: { value:number }[], width=600, height=210) {
  if (!data.length) return "";
  const values = data.map((item)=>item.value);
  const min = Math.min(...values), max = Math.max(...values), range = Math.max(1e-9,max-min);
  return data.map((item,index)=>`${(index/(Math.max(1,data.length-1))*width).toFixed(1)},${(height-(item.value-min)/range*height).toFixed(1)}`).join(" ");
}

function LineChart({ data, tone, suffix }: { data:{date:string;value:number}[]; tone:"green"|"red"; suffix:string }) {
  const values = data.map((item)=>item.value);
  return <div className={`line-chart ${tone}`}><div className="chart-scale"><span>{Math.max(...values).toFixed(1)}{suffix}</span><span>{Math.min(...values).toFixed(1)}{suffix}</span></div><svg viewBox="0 0 600 210" role="img" aria-label={`从${data[0]?.date}到${data.at(-1)?.date}的数据曲线`} preserveAspectRatio="none"><line x1="0" y1="105" x2="600" y2="105"/><polyline points={chartPoints(data)}/></svg><div className="chart-dates"><span>{data[0]?.date}</span><span>{data.at(-1)?.date}</span></div></div>;
}

function AccountChart({ path, real, proxyUntil }: { path:PathPoint[]; real:boolean; proxyUntil?:string }) {
  const valueData = path.map((item)=>({value:real?item.realValue:item.value}));
  const principalData = path.map((item)=>({value:real?item.realPrincipal:item.principal}));
  const all = [...valueData,...principalData].map((item)=>item.value);
  const max = Math.max(1,...all);
  const normalize = (data:{value:number}[], keep:(index:number)=>boolean=()=>true) => data.map((item,index)=>({item,index})).filter(({index})=>keep(index)).map(({item,index})=>`${(index/Math.max(1,data.length-1)*600).toFixed(1)},${(210-item.value/max*210).toFixed(1)}`).join(" ");
  const proxyEndIndex = proxyUntil ? path.findIndex((item)=>item.date>=proxyUntil) : -1;
  return <div className="account-chart"><svg viewBox="0 0 600 210" role="img" aria-label="账户价值与累计投入曲线" preserveAspectRatio="none"><polyline className="principal-line" points={normalize(principalData)}/>{proxyEndIndex>0&&<polyline className="proxy-value-line" points={normalize(valueData,(index)=>index<=proxyEndIndex)}/>}<polyline className="value-line" points={normalize(valueData,(index)=>proxyEndIndex<0||index>=proxyEndIndex)}/></svg><div className="chart-legend"><span><i className="value-dot"/>账户价值</span><span><i className="principal-dot"/>累计投入</span>{proxyEndIndex>0&&<span><i className="proxy-dot"/>代理历史</span>}</div></div>;
}

function DualGrowthChart({ first, second, firstLabel, secondLabel }: { first:HistorySeries; second:HistorySeries; firstLabel:string; secondLabel:string }) {
  const sample = (series:HistorySeries) => { const stride=Math.max(1,Math.floor(series.points.length/120)); const base=series.points[0][1]; return series.points.filter((_,index)=>index%stride===0||index===series.points.length-1).map(([,price])=>({value:price/base*100})); };
  const a=sample(first), b=sample(second); const max=Math.max(...a.map(x=>x.value),...b.map(x=>x.value));
  const normalize=(data:{value:number}[])=>data.map((item,index)=>`${(index/Math.max(1,data.length-1)*600).toFixed(1)},${(190-item.value/max*180).toFixed(1)}`).join(" ");
  return <div className="dual-chart"><svg viewBox="0 0 600 200" role="img" aria-label={`${firstLabel}和${secondLabel}共同历史增长曲线`} preserveAspectRatio="none"><polyline className="first-line" points={normalize(a)}/><polyline className="second-line" points={normalize(b)}/></svg><div><span><i/>{firstLabel}</span><span><i/>{secondLabel}</span></div></div>;
}

function AnnualReturnChart({ data }: { data:{year:string;value:number}[] }) {
  const shown = data.slice(-14);
  const max = Math.max(1,...shown.map((item)=>Math.abs(item.value)));
  return <div className="annual-chart"><div className="annual-head"><span>年度复权价格变化</span><strong>每一年都不一样</strong><p>供应商前复权价格的自然年变化；用来打破“每年稳定赚同一个百分比”的错觉。</p></div><div className="annual-bars">{shown.map((item)=><div key={item.year} className={item.value<0?"negative":"positive"}><em>{item.value.toFixed(1)}%</em><span><i style={{height:`${Math.max(5,Math.abs(item.value)/max*100)}%`}}/></span><b>{item.year.slice(2)}</b></div>)}</div></div>;
}

function HistoryEmpty(){ return <div className="history-empty"><div><span>01</span><strong>先确认资料层级</strong><p>目录覆盖很广，但只有具备可核验历史的 ETF 或指数才生成滚动回放。</p></div><div><span>02</span><strong>期限必须完整</strong><p>产品历史不足20年，就不拿较短窗口冒充20年。</p></div><div><span>03</span><strong>个股另用逻辑</strong><p>公司经营、退市和业务变化不能被一条存续价格曲线掩盖。</p></div></div>; }
