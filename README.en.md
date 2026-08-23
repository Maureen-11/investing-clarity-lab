# Investing Clarity Lab / 简投学堂

[中文版](./README.md) · [English](./README.en.md)

> Evidence-first long-term investing research for beginners. Calculate what you will actually contribute, then place the plan in real historical paths.

[Use the app](https://maureen-11.github.io/investing-clarity-lab/) · [Data sources](./DATA_SOURCES.md) · [Security policy](./SECURITY.md)

## What problem does this solve?

Many recurring-investment calculators ask users to enter an “expected annual return” and then assume that the same number will arrive every year. That can cause beginners to overlook:

- Daily, monthly, and annual plans have different numbers of contributions; weekends and exchange holidays are not trading days.
- Historical average returns do not mean that markets rise steadily every year. A profitable ending balance can still include severe drawdowns.
- Fund expenses, distribution-channel charges, RMB exchange rates, and inflation affect different parts of the result.
- ETFs, index funds, and individual stocks should not receive the same long-term conclusion.
- When the available data is incomplete or cannot be checked, the tool should leave the result blank instead of inventing a range.

Investing Clarity Lab separates planned principal, historical paths, risk experience, fees, and purchasing power. It explains what the data can and cannot answer. It does not predict the future or provide buy/sell advice.

## Main features

- Broad US, mainland China, and Hong Kong directory search: Search exchange directory entries across the three markets; the market selection follows the chosen security, but a searchable instrument does not automatically have long-term history.
- Curated 100-ETF history pack: 50 mainland China, 35 US, and 15 Hong Kong ETFs, each with a lazily loaded adjusted-price history across broad market, dividend/low volatility, growth, sectors, bonds, cash, gold, and REITs.
- Contribution calendar: Supports daily, monthly, and annual contributions. Published years use exchange holiday calendars; periods beyond the available calendar are clearly marked as estimates.
- Principal accounting: Calculates calendar days, trading days, actual contribution count, installment principal, initial capital, and total contributions.
- Layered analysis: The 100 ETFs replay the longest period their own history can support. Histories shorter than one year show cumulative contributions and observed drawdown without manufacturing annualized or multi-year conclusions. Individual stocks remain facts-only.
- Fees and purchasing power: Separates product expense impact, historical RMB exchange conversion, CPI purchasing power, and fixed scenarios.
- Charts: Shows account value versus contributions, 100-point product growth, drawdowns, calendar-year returns, and recovery time.
- Evidence boundaries: Being searchable in the security directory does not mean that a security has enough history. Individual stocks do not receive an ETF-style long-term conclusion from a surviving price series alone.
- Free beta API: An optional read-only CloudBase adapter serves the same directory and verified snapshots; without it, the GitHub Pages build falls back to repository snapshots.

## Installation

### Requirements

- Node.js `>= 22.13.0`
- npm (included with Node.js)
- Git

### Run locally

```bash
git clone https://github.com/Maureen-11/investing-clarity-lab.git
cd investing-clarity-lab
npm ci
npm run dev
```

The terminal will show the local URL, usually `http://localhost:3000/`.

### Verify and build

```bash
npm run lint
npm test
npm run build:pages
```

- `npm test` builds the app first and then runs tests for trading days, FX, CPI, historical replay, security capability states, and page boundaries.
- `npm run build:pages` creates static files in `out/` for the GitHub Pages subpath `/investing-clarity-lab`.
- To create a static build without a subpath, run `npm run build:mainland`.

The local Sites hosting configuration is not part of the repository. If needed, copy `.openai/hosting.example.json` to `.openai/hosting.json` and fill in your own project configuration; never commit that file.

### CloudBase free beta

The default build uses the static files under `public/data/`. After deploying `cloudbase/functions/market-api/`, set the API origin so the browser tries CloudBase first:

```powershell
$env:NEXT_PUBLIC_MARKET_API_URL = "https://your-cloudbase-api.example"
npm run dev
```

The adapter serves the directory, verified snapshots and capability states only. It does not contain provider keys or fabricate missing history. CloudBase's default domain is for development testing; a custom domain and mainland filing are later-stage decisions.

## How to use it

1. Open “定投研究工具” from the home page.
2. Search an ETF, index fund, or stock by ticker or name. The market follows the selected US, mainland China, or Hong Kong security.
3. Set the plan start date, daily/monthly/annual frequency, contribution amount, initial capital, and investment horizon.
4. Choose historical or fixed FX, historical CPI or a fixed inflation scenario, and fractional-share or whole-share/board-lot treatment.
5. Read “total contributions” and “contribution count” before reviewing the historically least favorable, middle-ranked, and most favorable starting paths.
6. Use drawdown, recovery time, purchasing power, and fee impact to interpret the result. Do not treat a historical rank as a forecast probability.

## Input and output example

The following example is generated by the current calculation engine and repository data; it is not manually estimated.

### Input

| Parameter | Value |
|---|---:|
| Security | VOO |
| Plan start date | 2011-01-03 |
| Frequency | Monthly |
| Contribution per period | ¥1,000 |
| Initial capital | ¥10,000 |
| Horizon | 15 years |
| Product expense ratio | 0.03% |
| FX / inflation | Historical USD/CNY / historical CPI |
| Trading unit | Theoretical fractional shares |

### Output

| Result | Value |
|---|---:|
| Contributions / total principal | 180 / ¥190,000 |
| Calendar days / estimated trading days | 5,479 / 3,780 |
| Least favorable historical ending value | ¥661,464 |
| Middle-ranked historical ending value | ¥723,872 |
| Most favorable historical ending value | ¥741,597 |
| Starting purchasing power of the middle-ranked path | ¥563,336 |
| Estimated fee drag on the middle-ranked path | ¥2,275 |
| Maximum drawdown in the VOO sample | -33.99% |

The example is generated from the current VOO, FX, and CPI files with `node --experimental-strip-types scripts/compute_readme_example.mjs`; the present snapshot contains 12 monthly starts that can complete a 15-year replay. The page reports retrieval date separately from the most recent completed trading date, so a weekend retrieval is never presented as a trading session.

## Data, privacy, and licensing boundaries

- The default GitHub Pages build uses static end-of-day histories for all 100 ETFs. A weekly job runs at 10:00 Monday Asia/Shanghai and updates only when all 100 downloads, validations, tests, and the Pages build succeed.
- All 100 ETFs can be replayed only across their own actual histories. A 20-year request on an eight-year-old product is shown as “20 years requested / 8 years available”; histories shorter than one year do not receive annualized or multi-year conclusions.
- Histories prefer Eastmoney forward-adjusted daily prices and fall back to Tencent Securities qfq data when the primary endpoint is unavailable; each file records the provider actually used. Legacy Yahoo snapshots remain only for failure auditing. This repository does not claim that it has obtained public-display or redistribution permission. Attribution and warnings do not replace a license.
- Sources and dates for the security directory, FX, CPI, and fund materials are listed in [DATA_SOURCES.md](./DATA_SOURCES.md).
- The public site has no account system, advertising, or analytics tracking. Calculations run in the browser and user inputs are not uploaded.
- This project is for education and research only. It is not investment, tax, insurance, or legal advice.

## License

Application source code is provided under the [MIT License](./LICENSE). Third-party data, names, trademarks, and materials are not relicensed by the source-code license; their rights remain with their respective owners.
