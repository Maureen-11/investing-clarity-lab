import csv
import json
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "work" / "market-data"
OUT = ROOT / "public" / "data" / "securities.json"


def clean(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


records = []


def add(symbol, name, market, exchange, asset_type, source, aliases="", updated="2026-07-20"):
    symbol = clean(symbol).upper()
    name = clean(name)
    if not symbol or not name:
        return
    records.append({
        "id": f"{market}:{symbol}",
        "symbol": symbol,
        "name": name,
        "market": market,
        "exchange": exchange,
        "assetType": asset_type,
        "aliases": clean(aliases),
        "source": source,
        "updated": updated,
    })


# Nasdaq Trader publishes current Nasdaq- and other-exchange-listed directories.
with (RAW / "nasdaqlisted.txt").open("r", encoding="utf-8-sig", newline="") as handle:
    for row in csv.DictReader(handle, delimiter="|"):
        if row.get("Test Issue") != "N" or not row.get("Symbol") or row.get("Symbol", "").startswith("File Creation"):
            continue
        add(row["Symbol"], row["Security Name"], "US", "NASDAQ", "ETF" if row.get("ETF") == "Y" else "股票", "Nasdaq Trader")

exchange_names = {"N": "NYSE", "A": "NYSE American", "P": "NYSE Arca", "Z": "Cboe", "V": "IEX"}
with (RAW / "otherlisted.txt").open("r", encoding="utf-8-sig", newline="") as handle:
    for row in csv.DictReader(handle, delimiter="|"):
        if row.get("Test Issue") != "N" or not row.get("ACT Symbol") or row.get("ACT Symbol", "").startswith("File Creation"):
            continue
        add(row["ACT Symbol"], row["Security Name"], "US", exchange_names.get(row.get("Exchange", ""), row.get("Exchange", "US")), "ETF" if row.get("ETF") == "Y" else "股票", "Nasdaq Trader")


# Shanghai Stock Exchange current Main Board, STAR Market and B-share downloads.
for filename, board in [("sse-main.xls", "上交所"), ("sse-star.xls", "上交所科创板"), ("sse-b.xls", "上交所B股")]:
    frame = pd.read_csv(RAW / filename, sep="\t", dtype=str, encoding="gb18030")
    for _, row in frame.iterrows():
        code = clean(row.get("代码"))
        name = clean(row.get("简称"))
        if code:
            add(code.zfill(6), name, "CN", board, "股票", "上海证券交易所")


# Shenzhen Stock Exchange current listed-company spreadsheet (A and B shares).
szse = pd.read_excel(RAW / "szse.xlsx", dtype=str)
for _, row in szse.iterrows():
    a_code = clean(row.get("A股代码"))
    if a_code and a_code.lower() != "nan":
        add(a_code.split(".")[0].zfill(6), clean(row.get("A股简称")) or clean(row.get("公司简称")), "CN", "深交所", "股票", "深圳证券交易所", clean(row.get("英文名称")))
    b_code = clean(row.get("B股代码"))
    if b_code and b_code.lower() != "nan":
        add(b_code.split(".")[0].zfill(6), clean(row.get("B股 简 称")), "CN", "深交所B股", "股票", "深圳证券交易所", clean(row.get("英文名称")))


# SSE's official search-suggestion file includes listed exchange funds and REITs.
fund_text = (RAW / "sse-funds.js").read_text(encoding="utf-8")
for code, name, pinyin in re.findall(r'_t\.push\(\{val:"([^"]+)",val2:"([^"]+)",val3:"([^"]*)"\}\);', fund_text):
    kind = "REITs" if code.startswith(("508", "180")) or "REIT" in name.upper() else "ETF/基金"
    add(code, name, "CN", "上交所", kind, "上海证券交易所", pinyin, "2026-07-17")


# Frequently used Shenzhen ETFs, kept as a clearly labelled initial fund subset.
for code, name in [
    ("159901", "深证100ETF"), ("159915", "创业板ETF"), ("159919", "沪深300ETF"),
    ("159941", "纳指ETF"), ("159949", "创业板50ETF"), ("159967", "创成长ETF"),
    ("159995", "芯片ETF"), ("159996", "家电ETF"), ("159998", "计算机ETF"),
]:
    add(code, name, "CN", "深交所", "ETF", "深圳证券交易所")


# HKEX full official list: equities, investment companies, ETFs and L&I products.
hk = pd.read_excel(RAW / "hkex.xlsx", header=2, dtype=str)
for _, row in hk.iterrows():
    category = clean(row.get("Category"))
    subcategory = clean(row.get("Sub-Category"))
    if category == "Equity":
        asset_type = "股票"
    elif category == "Exchange Traded Products" and subcategory == "Exchange Traded Funds":
        asset_type = "ETF"
    elif category == "Exchange Traded Products" and subcategory == "Leveraged and Inverse":
        asset_type = "杠杆/反向产品"
    else:
        continue
    code = clean(row.get("Stock Code"))
    if code and code.lower() != "nan":
        add(code.zfill(5), clean(row.get("Name of Securities")), "HK", "香港交易所", asset_type, "香港交易所", updated="2026-07-20")


# Search aliases for the most common cross-language queries. These do not alter issuer data.
alias_map = {
    "HK:01810": "小米 小米集团 Xiaomi",
    "HK:00700": "腾讯 腾讯控股 Tencent",
    "HK:09988": "阿里巴巴 Alibaba",
    "HK:03690": "美团 Meituan",
    "US:AAPL": "苹果 Apple",
    "US:MSFT": "微软 Microsoft",
    "US:TSLA": "特斯拉 Tesla",
    "US:NVDA": "英伟达 NVIDIA",
    "US:GOOGL": "谷歌 Alphabet",
}

deduped = {}
for item in records:
    if item["id"] in alias_map:
        item["aliases"] = f'{item["aliases"]} {alias_map[item["id"]]}'.strip()
    deduped[item["id"]] = item

payload = sorted(deduped.values(), key=lambda item: (item["market"], item["symbol"]))
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

counts = {}
for item in payload:
    counts[item["market"]] = counts.get(item["market"], 0) + 1
print(json.dumps({"total": len(payload), "counts": counts, "output": str(OUT)}, ensure_ascii=False))
