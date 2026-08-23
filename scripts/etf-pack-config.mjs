export const ETF_PACK_GROUPS = {
  CN: {
    "宽基": ["510050", "510300", "159919", "510500", "512100", "512020", "510210", "159901", "159915", "159949", "588000", "588030"],
    "红利/低波/质量": ["510880", "512890", "515180", "515080", "515450", "515460", "515910", "561630", "561060", "563390"],
    "成长科技": ["588080", "512760", "512480", "515000", "515030", "159995", "159998", "515070"],
    "行业": ["512010", "512170", "512660", "512690", "512800", "512880", "515220", "512400"],
    "跨境": ["159941", "513100", "513500", "513050", "513330", "513520"],
    "债券/现金": ["511010", "511260", "511880", "511360"],
    "黄金": ["518880", "518800"],
  },
  US: {
    "宽基": ["VOO", "SPY", "VTI", "QQQ", "DIA", "IWM", "RSP", "SCHX"],
    "红利/风格": ["SCHD", "VIG", "DGRO", "VTV", "VUG", "USMV", "QUAL"],
    "全球配置": ["VT", "VXUS", "VEA", "VWO", "ACWI"],
    "行业": ["XLK", "XLF", "XLV", "XLE", "XLI", "XLY"],
    "债券": ["BND", "AGG", "TLT", "LQD", "HYG"],
    "黄金/房地产/抗通胀": ["GLD", "IAU", "VNQ", "TIP"],
  },
  HK: {
    "宽基": ["02800", "02828", "03115", "03037"],
    "科技": ["03033", "03067", "02814"],
    "红利": ["03110", "03070", "03031"],
    "A股/中国资产": ["02823", "02846"],
    "债券/黄金": ["02819", "02821", "02840"],
  },
};

export const ETF_PACK_EXPECTED = { CN: 50, US: 35, HK: 15 };
export const LEGACY_HISTORY_SYMBOLS = new Set(["QQQ", "VOO", "SPY", "VTI", "VT", "SCHX"]);

// Fixed provider identifiers prevent ambiguous symbol search results such as
// XLF (which can otherwise be mistaken for an A-share security name).
export const EASTMONEY_US_QUOTE_IDS = {
  VOO: "107.VOO", SPY: "107.SPY", VTI: "107.VTI", QQQ: "105.QQQ",
  DIA: "107.DIA", IWM: "107.IWM", RSP: "107.RSP", SCHX: "107.SCHX",
  SCHD: "107.SCHD", VIG: "107.VIG", DGRO: "107.DGRO", VTV: "107.VTV",
  VUG: "107.VUG", USMV: "107.USMV", QUAL: "107.QUAL", VT: "107.VT",
  VXUS: "105.VXUS", VEA: "107.VEA", VWO: "107.VWO", ACWI: "105.ACWI",
  XLK: "107.XLK", XLF: "107.XLF", XLV: "107.XLV", XLE: "107.XLE",
  XLI: "107.XLI", XLY: "107.XLY", BND: "105.BND", AGG: "107.AGG",
  TLT: "107.TLT", LQD: "107.LQD", HYG: "107.HYG", GLD: "107.GLD",
  IAU: "107.IAU", VNQ: "107.VNQ", TIP: "107.TIP",
};

export function eastmoneyQuoteId(market, symbol) {
  if (market === "CN") return `${symbol.startsWith("159") ? "0" : "1"}.${symbol}`;
  if (market === "HK") return `116.${symbol}`;
  const quoteId = EASTMONEY_US_QUOTE_IDS[symbol];
  if (!quoteId) throw new Error(`Missing Eastmoney provider id for US:${symbol}`);
  return quoteId;
}

export function eastmoneySourceUrl(market, symbol) {
  if (market === "CN") return `https://quote.eastmoney.com/${symbol.startsWith("159") ? "sz" : "sh"}${symbol}.html`;
  if (market === "HK") return `https://quote.eastmoney.com/hk/${symbol}.html`;
  return `https://quote.eastmoney.com/us/${symbol}.html`;
}
