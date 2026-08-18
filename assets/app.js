const locale = document.body.dataset.locale || "zh-hans";
const copy = {
  "zh-hans": {
    brand:"简投学堂", beta:"安全公开测试版", banner:"市场历史暂未开放：我们正在确认公开展示授权，不用未经许可的数据凑答案。",
    nav1:"投入计算",nav2:"四件事",nav3:"数据边界",eyebrow:"给第一次认真看待投资的你",hero:"先算清会投入多少，<br>再谈未来<em>可能怎样。</em>",
    lede:"从一个能坚持的小计划开始。这里先计算真实投入次数和本金，不用一个看似稳定的年化替你预测未来。",cta:"算算我的投入",t1:"不要求先懂术语",t2:"不承诺未来收益",t3:"不出售个人数据",
    cardTag:"这一版先回答",cardTitle:"我到底会投入多少钱？",cardBody:"选择市场、频率、金额和期限。已公布的交易日历用于精确计算；尚未公布的年份会明确标成估算。",steps:["识别周末与已公布休市日","计算实际或估算投入次数","把初始资金与分期投入分开"],
    calcKicker:"CONTRIBUTION PLANNER",calcTitle:"把计划算清楚",calcDesc:"每日是每个交易日，不是每个自然日；未来交易所尚未公布的休市安排不会假装成精确答案。",
    market:"交易市场",start:"开始日期",frequency:"投入频率",amount:"每次投入",years:"投入年限",initial:"初始资金",currency:"显示货币",daily:"每日（交易日）",monthly:"每月",yearly:"每年",us:"美股",cn:"A股",hk:"港股",
    total:"计划期内总投入",count:"投入次数",calendar:"日历天数",closed:"非投入日",initialOut:"初始资金",installments:"分期投入",exact:"当前范围均使用已公布交易日历。",estimated:"部分年份的交易所日历尚未公布，未来交易日按长期平均估算。",preview:"首批执行日期",noPreview:"所选范围暂无可列出的已公布执行日期。",
    lessonKicker:"FOUR THINGS THAT MATTER",lessonTitle:"先学会问对问题",lessonDesc:"工具不是替你选择产品，而是把时间、风险、费用和不确定性摆到同一张桌面。",
    lessons:[["01","这笔钱能放多久？","期限影响你可能遇到的市场阶段，也决定这笔钱是否适合承担波动。"],["02","实际会投入多少次？","每日、每月和每年必须按交易日理解，不能把一个月当成30个交易日。"],["03","下跌时能否继续？","未来接入合规历史后，我们会展示回撤和恢复时间，而不是只展示最终收益。"],["04","费用拿走了什么？","产品费、交易费、渠道费和通胀需要分开算，并标注来源与日期。"]],
    boundaryKicker:"DATA BOUNDARY",boundaryTitle:"缺少授权时，宁可暂时不显示",boundaryDesc:"公开测试版没有Yahoo行情、没有实时价格，也不会把模拟数据包装成真实历史。",
    boundaries:[["现在可以用","投入日历与本金计算","不依赖证券价格，适合先检查计划规模。"],["等待授权","ETF历史回放与图表","取得书面展示许可后再接入日终复权数据。"],["不会提供","个性化买卖建议","教育工具不能替代持牌专业人士或你的独立判断。"]],
    nextTitle:"下一阶段：合规的每日更新",nextBody:"获得数据商书面许可后，再上线ETF图表、滚动回放、回撤与费用拖累。",nextLink:"查看Twelve Data授权说明 ↗",
    footer:"给普通人的长期投资研究工具",risk:"仅供教育和研究，不构成投资、税务或法律建议。",privacy:"本版不设账户、不上传输入、不使用广告追踪。",copyright:"© 2026 简投学堂"
  },
  "zh-hant": {
    brand:"簡投學堂", beta:"安全公開測試版", banner:"市場歷史暫未開放：我們正在確認公開展示授權，不用未經許可的資料湊答案。",
    nav1:"投入計算",nav2:"四件事",nav3:"資料邊界",eyebrow:"給第一次認真看待投資的你",hero:"先算清會投入多少，<br>再談未來<em>可能怎樣。</em>",
    lede:"從一個能堅持的小計畫開始。這裡先計算實際投入次數與本金，不用一個看似穩定的年化替你預測未來。",cta:"算算我的投入",t1:"不要求先懂術語",t2:"不承諾未來收益",t3:"不出售個人資料",
    cardTag:"這一版先回答",cardTitle:"我到底會投入多少錢？",cardBody:"選擇市場、頻率、金額和期限。已公布的交易日曆用於精確計算；尚未公布的年份會明確標成估算。",steps:["識別週末與已公布休市日","計算實際或估算投入次數","把初始資金與分期投入分開"],
    calcKicker:"CONTRIBUTION PLANNER",calcTitle:"把計畫算清楚",calcDesc:"每日是每個交易日，不是每個自然日；未來交易所尚未公布的休市安排不會假裝成精確答案。",
    market:"交易市場",start:"開始日期",frequency:"投入頻率",amount:"每次投入",years:"投入年限",initial:"初始資金",currency:"顯示貨幣",daily:"每日（交易日）",monthly:"每月",yearly:"每年",us:"美股",cn:"A股",hk:"港股",
    total:"計畫期內總投入",count:"投入次數",calendar:"日曆天數",closed:"非投入日",initialOut:"初始資金",installments:"分期投入",exact:"目前範圍均使用已公布交易日曆。",estimated:"部分年份的交易所日曆尚未公布，未來交易日按長期平均估算。",preview:"首批執行日期",noPreview:"所選範圍暫無可列出的已公布執行日期。",
    lessonKicker:"FOUR THINGS THAT MATTER",lessonTitle:"先學會問對問題",lessonDesc:"工具不是替你選擇產品，而是把時間、風險、費用與不確定性放在同一張桌面。",
    lessons:[["01","這筆錢能放多久？","期限影響你可能遇到的市場階段，也決定這筆錢是否適合承擔波動。"],["02","實際會投入多少次？","每日、每月和每年必須按交易日理解，不能把一個月當成30個交易日。"],["03","下跌時能否繼續？","未來接入合規歷史後，我們會展示回撤與恢復時間，而不是只展示最終收益。"],["04","費用拿走了什麼？","產品費、交易費、通路費與通膨需要分開計算，並標示來源與日期。"]],
    boundaryKicker:"DATA BOUNDARY",boundaryTitle:"缺少授權時，寧可暫時不顯示",boundaryDesc:"公開測試版沒有Yahoo行情、沒有即時價格，也不會把模擬資料包裝成真實歷史。",
    boundaries:[["現在可以使用","投入日曆與本金計算","不依賴證券價格，適合先檢查計畫規模。"],["等待授權","ETF歷史回放與圖表","取得書面展示許可後再接入日終復權資料。"],["不會提供","個人化買賣建議","教育工具不能取代持牌專業人士或你的獨立判斷。"]],
    nextTitle:"下一階段：合規的每日更新",nextBody:"獲得資料商書面許可後，再上線ETF圖表、滾動回放、回撤與費用拖累。",nextLink:"查看Twelve Data授權說明 ↗",
    footer:"給普通人的長期投資研究工具",risk:"僅供教育與研究，不構成投資、稅務或法律建議。",privacy:"本版不設帳戶、不上傳輸入、不使用廣告追蹤。",copyright:"© 2026 簡投學堂"
  },
  en: {
    brand:"Jiantou Academy", beta:"Safe public beta", banner:"Market history is temporarily unavailable while we verify public-display rights. We will not fill the gap with unlicensed data.",
    nav1:"Planner",nav2:"Four questions",nav3:"Data boundary",eyebrow:"For people taking investing seriously for the first time",hero:"Know what you will contribute<br>before guessing what it <em>might become.</em>",
    lede:"Start with a plan you can sustain. This version calculates contribution counts and principal without turning one smooth annual-return assumption into a promise.",cta:"Calculate my plan",t1:"No jargon required",t2:"No return promises",t3:"No sale of personal data",
    cardTag:"This beta answers one thing first",cardTitle:"How much will I actually contribute?",cardBody:"Choose a market, frequency, amount and horizon. Published exchange calendars are counted exactly; future unpublished years are clearly estimated.",steps:["Identify weekends and published closures","Count exact or estimated contributions","Separate initial capital from later contributions"],
    calcKicker:"CONTRIBUTION PLANNER",calcTitle:"Make the plan concrete",calcDesc:"Daily means each trading day, not every calendar day. Future exchange closures are estimated when official calendars have not yet been published.",
    market:"Market",start:"Start date",frequency:"Frequency",amount:"Amount each time",years:"Years",initial:"Initial capital",currency:"Display currency",daily:"Daily (trading days)",monthly:"Monthly",yearly:"Yearly",us:"US stocks",cn:"Mainland China A-shares",hk:"Hong Kong stocks",
    total:"Total planned contributions",count:"Contribution count",calendar:"Calendar days",closed:"Non-contribution days",initialOut:"Initial capital",installments:"Scheduled contributions",exact:"The selected range uses published exchange calendars throughout.",estimated:"Some future exchange calendars are not yet published. Trading days in those years use long-run estimates.",preview:"First execution dates",noPreview:"No published execution dates are available to list for this range.",
    lessonKicker:"FOUR THINGS THAT MATTER",lessonTitle:"Ask better questions first",lessonDesc:"The tool does not choose a product for you. It puts time, risk, cost and uncertainty on the same page.",
    lessons:[["01","How long can the money stay invested?","Your horizon shapes the market environments you may face and whether the money can tolerate volatility."],["02","How many times will you contribute?","Daily, monthly and yearly plans must follow trading days. A month does not contain 30 trading days."],["03","Could you continue through a decline?","Once licensed history is available, we will show drawdowns and recovery time—not only ending wealth."],["04","What do costs take away?","Fund expenses, trading costs, distribution charges and inflation need separate calculations with dated sources."]],
    boundaryKicker:"DATA BOUNDARY",boundaryTitle:"If we lack permission, we leave it out",boundaryDesc:"This public beta contains no Yahoo market history, no live prices and no simulated series presented as real history.",
    boundaries:[["Available now","Calendar and principal planning","Works without security prices and helps you understand the size of your commitment."],["Pending permission","ETF history and charts","Adjusted end-of-day history will be added only after written public-display permission."],["Not provided","Personalized buy or sell advice","An educational tool cannot replace a licensed professional or your own judgment."]],
    nextTitle:"Next: licensed daily updates",nextBody:"After written permission, we can add ETF charts, rolling backtests, drawdowns and fee drag.",nextLink:"Read Twelve Data's licensing guidance ↗",
    footer:"Long-term investing research for ordinary people",risk:"For education and research only. Not investment, tax or legal advice.",privacy:"No account, no upload of your inputs and no advertising trackers in this beta.",copyright:"© 2026 Jiantou Academy"
  }
}[locale];

const marketMeta={US:{days:252,known:new Set([2026,2027,2028]),holidays:new Set(["2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25","2026-06-19","2026-07-03","2026-09-07","2026-11-26","2026-12-25","2027-01-01","2027-01-18","2027-02-15","2027-03-26","2027-05-31","2027-06-18","2027-07-05","2027-09-06","2027-11-25","2027-12-24","2028-01-17","2028-02-21","2028-04-14","2028-05-29","2028-06-19","2028-07-04","2028-09-04","2028-11-23","2028-12-25"])},CN:{days:242,known:new Set([2026]),holidays:new Set(["2026-01-01","2026-01-02","2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20","2026-02-23","2026-04-06","2026-05-01","2026-05-04","2026-05-05","2026-06-19","2026-09-25","2026-10-01","2026-10-02","2026-10-05","2026-10-06","2026-10-07"])},HK:{days:250,known:new Set([2026]),holidays:new Set(["2026-01-01","2026-02-17","2026-02-18","2026-02-19","2026-04-03","2026-04-06","2026-04-07","2026-05-01","2026-05-25","2026-06-19","2026-07-01","2026-10-01","2026-10-19","2026-12-25"])}};

const languageLinks=`<nav class="language-switch" aria-label="Language"><a href="../zh-hans/" data-lang="zh-hans">简</a><a href="../zh-hant/" data-lang="zh-hant">繁</a><a href="../en/" data-lang="en">EN</a></nav>`;
document.getElementById("app").innerHTML=`
<header class="site-header"><a class="brand" href="#top"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>${copy.brand}</span></a><nav class="header-nav"><a href="#planner">${copy.nav1}</a><a href="#questions">${copy.nav2}</a><a href="#boundary">${copy.nav3}</a></nav>${languageLinks}</header>
<div class="beta-banner"><strong>${copy.beta}</strong><span>${copy.banner}</span></div>
<main id="top"><section class="hero"><div><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.hero}</h1><p class="lede">${copy.lede}</p><a class="primary" href="#planner">${copy.cta}<span>→</span></a><ul class="trust"><li>${copy.t1}</li><li>${copy.t2}</li><li>${copy.t3}</li></ul></div><aside class="hero-card"><span>${copy.cardTag}</span><h2>${copy.cardTitle}</h2><p>${copy.cardBody}</p><ol>${copy.steps.map(v=>`<li>${v}</li>`).join("")}</ol></aside></section>
<section class="section planner" id="planner"><div class="section-head"><div><small>${copy.calcKicker}</small><h2>${copy.calcTitle}</h2></div><p>${copy.calcDesc}</p></div><div class="planner-shell"><form class="form-panel" id="planner-form"><div class="form-grid">
<label class="field"><span>${copy.market}</span><select id="market"><option value="US">${copy.us}</option><option value="CN">${copy.cn}</option><option value="HK">${copy.hk}</option></select></label>
<label class="field"><span>${copy.start}</span><input id="start" type="date"></label>
<label class="field"><span>${copy.frequency}</span><select id="frequency"><option value="daily">${copy.daily}</option><option value="monthly">${copy.monthly}</option><option value="yearly">${copy.yearly}</option></select></label>
<label class="field"><span>${copy.amount}</span><input id="amount" type="number" min="0" step="1" value="10"></label>
<label class="field"><span>${copy.years}</span><input id="years" type="number" min="1" max="50" step="1" value="20"></label>
<label class="field"><span>${copy.initial}</span><input id="initial" type="number" min="0" step="100" value="0"></label>
<label class="field full"><span>${copy.currency}</span><select id="currency"><option value="CNY">CNY · ¥</option><option value="USD">USD · $</option><option value="HKD">HKD · HK$</option></select></label>
</div></form><section class="result-panel" aria-live="polite"><span class="result-label">${copy.total}</span><strong class="principal" id="total">—</strong><div class="result-grid"><article><span>${copy.count}</span><strong id="count">—</strong></article><article><span>${copy.calendar}</span><strong id="calendar">—</strong></article><article><span>${copy.closed}</span><strong id="closed">—</strong></article><article><span>${copy.installments}</span><strong id="installments">—</strong></article></div><p class="precision" id="precision"></p><span class="result-label">${copy.preview}</span><div class="preview" id="preview"></div></section></div></section>
<section class="section" id="questions"><div class="section-head"><div><small>${copy.lessonKicker}</small><h2>${copy.lessonTitle}</h2></div><p>${copy.lessonDesc}</p></div><div class="lesson-grid">${copy.lessons.map(v=>`<article class="lesson"><span>${v[0]}</span><h3>${v[1]}</h3><p>${v[2]}</p></article>`).join("")}</div></section>
<section class="section boundary" id="boundary"><div class="section-head"><div><small>${copy.boundaryKicker}</small><h2>${copy.boundaryTitle}</h2></div><p>${copy.boundaryDesc}</p></div><div class="boundary-grid">${copy.boundaries.map(v=>`<article><span>${v[0]}</span><h3>${v[1]}</h3><p>${v[2]}</p></article>`).join("")}</div><div class="next-box"><div><strong>${copy.nextTitle}</strong><p>${copy.nextBody}</p></div><a href="https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage" target="_blank" rel="noreferrer">${copy.nextLink}</a></div></section></main>
<footer><div><a class="brand" href="#top"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>${copy.brand}</span></a><p>${copy.footer}</p><p>${copy.risk}</p></div><div class="footer-links"><span>${copy.privacy}</span><span>${copy.copyright}</span></div></footer>`;

document.querySelector(`[data-lang="${locale}"]`)?.classList.add("active");
document.querySelectorAll("[data-lang]").forEach(link=>link.addEventListener("click",()=>localStorage.setItem("jiantou-language",link.dataset.lang)));

const $=id=>document.getElementById(id);const startInput=$("start");const localToday=new Date();startInput.value=`${localToday.getFullYear()}-${String(localToday.getMonth()+1).padStart(2,"0")}-${String(localToday.getDate()).padStart(2,"0")}`;$("currency").value=locale==="en"?"USD":"CNY";
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const addDays=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r};
const addYears=(d,n)=>{const r=new Date(d);r.setFullYear(r.getFullYear()+n);return r};
const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
const addMonthsClamped=(d,n)=>{const index=d.getMonth()+n,y=d.getFullYear()+Math.floor(index/12),m=((index%12)+12)%12;return new Date(y,m,Math.min(d.getDate(),daysInMonth(y,m)),12)};
const addYearsClamped=(d,n)=>new Date(d.getFullYear()+n,d.getMonth(),Math.min(d.getDate(),daysInMonth(d.getFullYear()+n,d.getMonth())),12);
const daysInYear=y=>new Date(y,1,29).getMonth()===1?366:365;
function exactState(d,market){const meta=marketMeta[market];if(!meta.known.has(d.getFullYear()))return null;if(d.getDay()===0||d.getDay()===6)return false;return !meta.holidays.has(dayKey(d))}
function nextTradingDate(d,market){let cursor=new Date(d);for(let i=0;i<14;i++,cursor=addDays(cursor,1)){const state=exactState(cursor,market);if(state===null)return null;if(state)return cursor}return null}
function analyze(startValue,years,market,frequency){const start=new Date(`${startValue}T12:00:00`),endExclusive=addYears(start,years);let totalDays=0,weekends=0,exactHolidays=0,exactTrading=0;const unknown=new Map(),tradingDates=[];
  for(let d=new Date(start);d<endExclusive;d=addDays(d,1)){totalDays++;if(d.getDay()===0||d.getDay()===6){weekends++;continue}const state=exactState(d,market);if(state===true){exactTrading++;tradingDates.push(new Date(d))}else if(state===false)exactHolidays++;else{const item=unknown.get(d.getFullYear())||{weekdays:0,calendar:0};item.weekdays++;unknown.set(d.getFullYear(),item)}}
  for(const [year,item] of unknown){const a=year===start.getFullYear()?start:new Date(year,0,1,12),b=year===endExclusive.getFullYear()?endExclusive:new Date(year+1,0,1,12);item.calendar=Math.round((b-a)/86400000)}
  const estimatedTrading=[...unknown].reduce((sum,[year,item])=>sum+Math.round(marketMeta[market].days*item.calendar/daysInYear(year)),0);const tradingDays=exactTrading+estimatedTrading;let contributions=0;const preview=[];
  if(frequency==="daily"){contributions=tradingDays;preview.push(...tradingDates.slice(0,8).map(dayKey))}else{const periods=frequency==="monthly"?years*12:years;contributions=periods;for(let i=0;i<periods&&preview.length<8;i++){const planned=frequency==="monthly"?addMonthsClamped(start,i):addYearsClamped(start,i);const shifted=nextTradingDate(planned,market);if(shifted&&shifted<endExclusive)preview.push(dayKey(shifted))}}
  return{totalDays,contributions,nonContribution:totalDays-contributions,exact:unknown.size===0,preview};
}
function number(v){return new Intl.NumberFormat(locale==="en"?"en-US":locale==="zh-hant"?"zh-Hant":"zh-Hans",{maximumFractionDigits:0}).format(v)}
function money(v,currency){return new Intl.NumberFormat(locale==="en"?"en-US":locale==="zh-hant"?"zh-Hant":"zh-Hans",{style:"currency",currency,maximumFractionDigits:0}).format(v)}
function update(){const market=$("market").value,frequency=$("frequency").value,years=Math.max(1,Math.min(50,Number($("years").value)||1)),amount=Math.max(0,Number($("amount").value)||0),initial=Math.max(0,Number($("initial").value)||0),currency=$("currency").value;const result=analyze(startInput.value,years,market,frequency),installments=result.contributions*amount;
  $("total").textContent=money(initial+installments,currency);$("count").textContent=number(result.contributions);$("calendar").textContent=number(result.totalDays);$("closed").textContent=number(result.nonContribution);$("installments").textContent=money(installments,currency);$("precision").textContent=result.exact?copy.exact:copy.estimated;$("precision").classList.toggle("warn",!result.exact);$("preview").innerHTML=result.preview.length?result.preview.map(v=>`<span>${v}</span>`).join(""):`<span>${copy.noPreview}</span>`}
document.querySelectorAll("#planner-form input,#planner-form select").forEach(el=>el.addEventListener("input",update));update();
