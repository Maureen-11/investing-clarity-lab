"use client";

import { useRouter } from "next/navigation";

const lessons = [
  {
    number: "01",
    title: "我会真正投入多少钱？",
    body: "每天、每月和每年不是同一回事。我们按所选市场的真实交易日，算出次数和本金。",
  },
  {
    number: "02",
    title: "过去不同起点发生过什么？",
    body: "不猜一个稳定年化。把历史上每个可用月份都当作起点，看看最不利、中间和最有利的实际经历。",
  },
  {
    number: "03",
    title: "中途最难熬的阶段有多长？",
    body: "最终赚钱不代表一路平稳。回撤、恢复时间和亏损窗口，会比一个平均数更接近真实体验。",
  },
  {
    number: "04",
    title: "费用和通胀拿走了什么？",
    body: "产品费、交易费、销售渠道费和通胀分开计算；没有可靠公开数据，就明确留空。",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="welcome-page">
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark"><i/><i/><i/></span>
          <span>简投学堂</span>
        </a>
        <nav>
          <a href="#start">从哪里开始</a>
          <a href="#questions">先看四件事</a>
          <a href="#promise">我们不做什么</a>
        </nav>
        <span className="no-ads"><i/> 零广告 · 只讲证据</span>
      </header>

      <section className="welcome-hero" id="top">
        <div className="welcome-copy">
          <p className="eyebrow"><span/> 给第一次认真看待投资的你</p>
          <h1><span className="opening-line">从每天10元开始，</span><br/><span className="title-line">看懂你的第一笔</span><br/><em>长期投资。</em></h1>
          <p className="welcome-lede">不急着猜收益，先算清会投入多少、可能经历什么。投资不是为了赢过谁，而是让未来多一点选择。</p>
          <div className="welcome-actions">
            <button className="primary-button" onClick={() => router.push("/plan")}>帮我算一笔 <span>→</span></button>
            <a href="#start">我还没选产品</a>
          </div>
          <ul className="trust-list">
            <li><span>✓</span> 不要求先懂术语</li>
            <li><span>✓</span> 不承诺未来收益</li>
            <li><span>✓</span> 不用广告替你做决定</li>
          </ul>
        </div>

        <aside className="welcome-note" aria-label="给新手的一封短信">
          <span className="note-label">先别急着买</span>
          <p>你不需要先找到“最好的产品”。</p>
          <p>先知道这笔钱能放多久，市场下跌时你可能看到什么，以及费用会慢慢拿走多少。</p>
          <strong><span className="note-claim">工具给你的不是答案，</span> <span className="note-method">而是一套更清醒的判断方法。</span></strong>
          <div className="note-signature">简投学堂 · 写给普通投资者</div>
        </aside>
      </section>

      <section className="start-paths" id="start">
        <div className="section-heading">
          <div><p>CHOOSE YOUR START</p><h2>你现在知道多少，都可以开始</h2></div>
          <p>不用为了使用工具，假装自己已经懂得年化、波动率或基金费用。</p>
        </div>
        <div className="path-grid">
          <button onClick={() => router.push("/plan?mode=learn")}><span>还没选产品</span><strong>先用3分钟看懂投资</strong><em>从时间、风险和费用开始 →</em></button>
          <button className="featured" onClick={() => router.push("/plan")}><span>已经有一个想法</span><strong>测算我的投入计划</strong><em>支持每日、每月与每年 →</em></button>
          <button onClick={() => router.push("/plan#directory")}><span>已经知道代码</span><strong>分析一只ETF或指数基金</strong><em>先看QQQ、VOO、SCHX等 →</em></button>
        </div>
      </section>

      <section className="beginner-questions" id="questions">
        <div className="section-heading">
          <div><p>FOUR THINGS THAT MATTER</p><h2>不是让你填四个答案，<br/>而是由工具替你查清四件事</h2></div>
          <p>你只需要提供知道的部分。交易日、历史路径、回撤和费用证据，由工具继续完成。</p>
        </div>
        <div className="lesson-grid">
          {lessons.map((lesson) => <article key={lesson.number}><span>{lesson.number}</span><h3>{lesson.title}</h3><p>{lesson.body}</p></article>)}
        </div>
      </section>

      <section className="welcome-promise" id="promise">
        <div>
          <p>我们的边界</p>
          <h2>诚实地说“不知道”，<br/>也是理财教育的一部分。</h2>
        </div>
        <ul>
          <li><strong>不猜</strong><span>没有可核验的复权历史，就不生成收益范围。</span></li>
          <li><strong>不混</strong><span>ETF、指数基金和个股采用不同的分析逻辑。</span></li>
          <li><strong>不劝</strong><span>历史回放用于理解风险，不构成买入或卖出建议。</span></li>
        </ul>
      </section>

      <section className="welcome-cta">
        <p>准备好了，就从一笔小计划开始。</p>
        <h2>先看清，再决定。</h2>
        <button className="primary-button" onClick={() => router.push("/plan")}>进入定投研究工具 <span>→</span></button>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><i/><i/><i/></span><span>简投学堂</span></a>
        <p>给普通人的长期投资研究工具</p>
        <p>市场有风险，历史测算不构成投资建议。</p>
        <span>© 2026 简投学堂</span>
      </footer>
    </main>
  );
}
