export const ETF_PACK_GROUPS = {
  CN: {
    "宽基": [
      "510050", "510300", "159919", "510500", "512100", "512020", "510210", "159901", "159915", "159949", "588000", "588030",
      "510140", "510180", "510310", "510330", "510510", "512050", "512500", "512510", "515130", "515800", "516300", "560010", "560050", "560100", "560110", "510290", "512150", "515810",
    ],
    "红利/低波/质量": [
      "510880", "512890", "515180", "515080", "515450", "515460", "515910", "561630", "561060", "563390",
      "510030", "510720", "512040", "512260", "512390", "560030", "515100", "515300", "515480", "515890", "560020", "560070", "560250", "561080", "563020",
    ],
    "成长科技": [
      "588080", "512760", "512480", "515000", "515030", "159995", "159998", "515070",
      "512720", "512930", "515050", "515120", "515230", "515400", "515580", "515700", "515750", "515880", "515980", "516000", "516060", "516080", "516350", "516510", "516630",
    ],
    "行业": [
      "512010", "512170", "512660", "512690", "512800", "512880", "515220", "512400",
      "510150", "510230", "510650", "510660", "512070", "512120", "512140", "512200", "512290", "512410", "516020", "512560", "512600", "512620", "512700", "512730", "512810", "512980", "515010", "515020", "515210", "516110",
    ],
    "跨境": [
      "159941", "513100", "513500", "513050", "513330", "513520",
      "510900", "513000", "513030", "513080", "513110", "513210", "513390", "513600", "513650", "513660", "513720", "513810", "513850", "513880",
    ],
    "债券/现金": [
      "511010", "511260", "511880", "511360", "511020", "511030", "511090", "511100", "511180", "511200", "511520", "511060",
    ],
    "黄金/商品/REIT": ["518880", "518800", "510170", "517400", "518660", "518850", "560470", "512940"],
  },
  US: {
    "宽基": [
      "VOO", "SPY", "VTI", "QQQ", "DIA", "IWM", "RSP", "SCHX", "IVV", "SPYM", "ITOT", "SCHB", "SPTM", "VV", "IJH", "IJR", "VB", "ONEQ",
    ],
    "红利/因子": [
      "SCHD", "VIG", "DGRO", "VTV", "VUG", "USMV", "QUAL", "DVY", "HDV", "SDY", "SPHD", "NOBL", "DGRW", "IWD", "IWF", "MTUM", "VLUE", "SIZE", "SPLV", "COWZ",
    ],
    "全球配置": [
      "VT", "VXUS", "VEA", "VWO", "ACWI", "IEFA", "IEMG", "EFA", "EEM", "SCHF", "SCHE", "IXUS", "VEU", "EWJ", "EWG",
    ],
    "行业/代表性主题": [
      "XLK", "XLF", "XLV", "XLE", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC", "SMH", "SOXX", "IBB", "XBI", "IYR", "ITB", "XHB", "KRE", "IHI", "IGV", "ICLN", "PAVE", "BOTZ",
    ],
    "债券/现金": [
      "BND", "AGG", "TLT", "LQD", "HYG", "BNDX", "VCIT", "VCSH", "VGIT", "VGSH", "IEF", "SHY", "MUB", "EMB", "SGOV", "BIL", "GOVT", "USHY",
    ],
    "黄金/商品/REIT/抗通胀": ["GLD", "IAU", "VNQ", "TIP", "SCHH", "REET", "PDBC", "DBC", "SLV", "COMT"],
  },
  HK: {
    "宽基": ["02800", "02828", "03115", "03037", "02801", "02825", "03012", "03040", "03064", "03104"],
    "科技成长": ["03033", "03067", "02814", "02807", "02826", "02837", "03032", "03088"],
    "红利因子": ["03110", "03070", "03031", "03116", "03145", "03190", "02838"],
    "中国资产/跨境": ["02823", "02846", "02822", "02827", "02832", "02839", "03101", "03133"],
    "行业": ["02806", "02820", "02841", "02845", "03069", "03191"],
    "债券/现金/黄金/REIT": ["02819", "02821", "02840", "02817", "02829", "03187"],
  },
};

export const INDEX_PACK = [
  { id: "INDEX:CN:SSE", symbol: "000001", name: "上证综指", market: "CN", category: "主要指数", quoteId: "1.000001", relatedEtfIds: ["CN:510210"], sourceUrl: "https://www.csindex.com.cn/#/indices/family/detail?indexCode=000001" },
  { id: "INDEX:CN:SSE50", symbol: "000016", name: "上证50", market: "CN", category: "主要指数", quoteId: "1.000016", relatedEtfIds: ["CN:510050", "CN:510180"], sourceUrl: "https://www.csindex.com.cn/#/indices/family/detail?indexCode=000016" },
  { id: "INDEX:CN:CSI300", symbol: "000300", name: "沪深300", market: "CN", category: "主要指数", quoteId: "1.000300", relatedEtfIds: ["CN:510300", "CN:159919"], sourceUrl: "https://www.csindex.com.cn/#/indices/family/detail?indexCode=000300" },
  { id: "INDEX:CN:CSI500", symbol: "000905", name: "中证500", market: "CN", category: "主要指数", quoteId: "1.000905", relatedEtfIds: ["CN:510500", "CN:512500"], sourceUrl: "https://www.csindex.com.cn/#/indices/family/detail?indexCode=000905" },
  { id: "INDEX:CN:CSI1000", symbol: "000852", name: "中证1000", market: "CN", category: "主要指数", quoteId: "1.000852", relatedEtfIds: ["CN:512100"], sourceUrl: "https://www.csindex.com.cn/#/indices/family/detail?indexCode=000852" },
  { id: "INDEX:CN:CHINEXT", symbol: "399006", name: "创业板指", market: "CN", category: "主要指数", quoteId: "0.399006", relatedEtfIds: ["CN:159915"], sourceUrl: "https://www.cnindex.com.cn/module/index-detail.html?act_menu=1&indexCode=399006" },
  { id: "INDEX:CN:STAR50", symbol: "000688", name: "科创50", market: "CN", category: "主要指数", quoteId: "1.000688", relatedEtfIds: ["CN:588000", "CN:588080"], sourceUrl: "https://www.csindex.com.cn/#/indices/family/detail?indexCode=000688" },
  { id: "INDEX:US:SPX", symbol: "SPX", name: "标普500", market: "US", category: "主要指数", quoteId: "100.SPX", relatedEtfIds: ["US:VOO", "US:SPY"], sourceUrl: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/" },
  { id: "INDEX:US:NDX100", symbol: "NDX100", name: "纳斯达克100", market: "US", category: "主要指数", quoteId: "100.NDX100", relatedEtfIds: ["US:QQQ"], sourceUrl: "https://indexes.nasdaqomx.com/Index/Overview/NDX" },
  { id: "INDEX:US:IXIC", symbol: "IXIC", name: "纳斯达克综合指数", market: "US", category: "主要指数", quoteId: "100.NDX", relatedEtfIds: ["US:ONEQ"], sourceUrl: "https://indexes.nasdaqomx.com/Index/Overview/COMP" },
  { id: "INDEX:US:DJIA", symbol: "DJIA", name: "道琼斯工业平均指数", market: "US", category: "主要指数", quoteId: "100.DJIA", relatedEtfIds: ["US:DIA"], sourceUrl: "https://www.spglobal.com/spdji/en/indices/equity/dow-jones-industrial-average/" },
  { id: "INDEX:US:RUT", symbol: "RUT", name: "罗素2000", market: "US", category: "主要指数", quoteId: null, relatedEtfIds: ["US:IWM"], sourceUrl: "https://www.lseg.com/en/ftse-russell/indices/russell-us" },
  { id: "INDEX:HK:HSI", symbol: "HSI", name: "恒生指数", market: "HK", category: "主要指数", quoteId: "100.HSI", relatedEtfIds: ["HK:02800"], sourceUrl: "https://www.hsi.com.hk/eng/indexes/all-indexes/hsi" },
  { id: "INDEX:HK:HSCEI", symbol: "HSCEI", name: "恒生中国企业指数", market: "HK", category: "主要指数", quoteId: "100.HSCEI", relatedEtfIds: ["HK:02828"], sourceUrl: "https://www.hsi.com.hk/eng/indexes/all-indexes/hscei" },
  { id: "INDEX:HK:HSTECH", symbol: "HSTECH", name: "恒生科技指数", market: "HK", category: "主要指数", quoteId: "124.HSTECH", relatedEtfIds: ["HK:03033", "HK:03067"], sourceUrl: "https://www.hsi.com.hk/eng/indexes/all-indexes/hstech" },
];

export const ETF_PACK_EXPECTED = { CN: 150, US: 105, HK: 45 };
export const INDEX_PACK_EXPECTED = { total: 15, CN: 7, US: 5, HK: 3 };
export const LEGACY_HISTORY_SYMBOLS = new Set(["QQQ", "VOO", "SPY", "VTI", "VT", "SCHX"]);

export function staticEastmoneyQuoteId(market, symbol) {
  if (market === "CN") return `${symbol.startsWith("159") ? "0" : "1"}.${symbol}`;
  if (market === "HK") return `116.${symbol}`;
  return null;
}

export function eastmoneySourceUrl(market, symbol) {
  if (market === "CN") return `https://quote.eastmoney.com/${symbol.startsWith("159") ? "sz" : "sh"}${symbol}.html`;
  if (market === "HK") return `https://quote.eastmoney.com/hk/${symbol}.html`;
  return `https://quote.eastmoney.com/us/${symbol}.html`;
}

export function officialListingUrl(market, symbol) {
  if (market === "CN") {
    if (symbol.startsWith("159")) return `https://www.szse.cn/market/product/list/etf/index.html?code=${symbol}`;
    return `https://www.sse.com.cn/assortment/fund/etf/detail/index.shtml?FUNDID=${symbol}`;
  }
  if (market === "HK") return `https://www.hkex.com.hk/Market-Data/Securities-Prices/Exchange-Traded-Products/Exchange-Traded-Products?sc_lang=zh-HK&sym=${Number(symbol)}`;
  return `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(symbol)}&category=custom&forms=N-1A%252C485APOS%252C485BPOS`;
}
