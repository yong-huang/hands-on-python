import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* ── 真实终端输出（article §Quick Start 逐字，禁止改写）── */
const CMD = "python3 producer_consumer.py";
const SECTIONS = [
  "[1. 流水线：3 生产者 × 2 消费者 × 1000 条任务]",
  "[2. 背压：maxsize=10，快生产、慢消费（每件 3ms）]",
  "[3. 反面教材：不发毒丸，消费者就永远等在 get() 上]",
];
const OUT_TOTAL = "处理总数 = 1000，每条恰好一次（计数 dict 全为 1）";
const OUT_OWNERS = "各生产者归属: {'p0': 334, 'p1': 333, 'p2': 333}";
const OUT_EXIT = "毒丸发出后 0ms 内全部消费者退出（< 2s）";
const OUT_SAMPLE = "采样 1498 次，队列长度峰值 = 10（= maxsize，生产者被按在门外）";
const OUT_BACKPRESSURE =
  "背压下依然 1000 条全部恰好处理一次 —— 丢任务与背压无关，与无锁共享有关";
const OUT_ALIVE =
  "任务处理完、q.join() 也返回了，但消费者 Thread-12 (consume_forever) 还活着（阻塞在 get()）";
const OUT_SHUTDOWN = "若它是非 daemon 线程，主进程退出时会被 threading._shutdown 无限等待";
const PASS_LINE = "全部断言通过（约 2 秒）";

/* ── 队列长度采样曲线（场景二：冲顶 maxsize=10 → 平台期 → 收尾放空）── */
const CURVE_D =
  "M70,380 L105,316 L139,252 L173,188 L208,156 L243,92 L277,60 L1284,60 L1326,124 L1367,220 L1409,316 L1450,380";
const SAMP_X = [346, 462, 578, 694, 810, 926, 1042, 1158, 1274];

/* 模拟终端窗框（step0 / step5 复用同一扇窗，叙事连续） */
function Term({
  children,
  style,
  wide,
}: {
  children: ReactNode;
  style?: CSSProperties;
  wide?: boolean;
}) {
  return (
    <div className={`ld-term ld-rise${wide ? " ld-term--wide" : ""}`} style={style}>
      <div className="ld-term-bar">
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="ld-term-title mono">producer_consumer.py</span>
      </div>
      <div className="ld-term-body mono">{children}</div>
    </div>
  );
}

/* 白话图例行：裸记号（get() / maxsize / Thread-12 …）同屏必配白话 */
function Legend({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="ld-legend ld-rise" style={style}>
      <span className="label-mono">{label}</span>
      <span className="ld-legend-text">{children}</span>
    </div>
  );
}

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 一行命令，三个场景（打字机 + 清单逐条） */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene ld-cmd-scene">
        <Term style={delay(200)}>
          <div className="ld-term-line">
            <span className="ld-prompt">$</span>
            <span className="ld-typed">{CMD}</span>
            <span className="ld-caret" />
          </div>
          {SECTIONS.map((s, i) => (
            <div className="ld-term-line ld-term-section ld-rise" style={delay(2100 + i * 400)} key={s}>
              {s}
            </div>
          ))}
          <div className="ld-term-line ld-term-hit ld-rise" style={delay(3800)}>
            {PASS_LINE}
          </div>
        </Term>
        <div className="ld-legend-row">
          <Legend label="断言" style={delay(4800)}>
            程序自己核对结果对不对
          </Legend>
          <Legend label="maxsize" style={delay(5100)}>
            容量上限——队列最多堆几件
          </Legend>
          <Legend label="get()" style={delay(5400)}>
            从队列取一件，没货就在那行等
          </Legend>
        </div>
      </div>
    );
  }

  /* step 1 — 场景一：1000/1000 + 账本格子全 1（hero 定格 + 逐格点亮） */
  if (step === 1) {
    const cells = Array.from({ length: 100 }, (_, i) => i);
    return (
      <div className="scene-pad ld-scene ld-total-scene">
        <div className="ld-total-left">
          <div className="ld-kicker ld-rise" style={delay(200)}>
            <span className="label-mono">场景一 · SCENE 01</span>
          </div>
          <div className="ld-kicker-sub mono ld-rise" style={delay(400)}>
            {SECTIONS[0]}
          </div>
          <div className="hero-num ld-total-hero ld-pop" style={delay(500)}>
            1000<span className="ld-total-slash">/</span>1000
          </div>
          <div className="ld-total-sub ld-rise" style={delay(1300)}>
            处理总数 <i>/</i> 投入任务
          </div>
          <div className="ld-total-tagline ld-rise" style={delay(6200)}>
            不丢、不重，<span className="ld-accent">每条恰好一次</span>
          </div>
          <div className="ld-cite mono ld-rise" style={delay(7000)}>
            {OUT_TOTAL}
          </div>
        </div>
        <div className="ld-total-right">
          <div className="ld-ledger">
            {cells.map((i) => (
              <span className="ld-ledger-cell mono ld-pop" style={delay(1500 + i * 24)} key={i}>
                1
              </span>
            ))}
          </div>
          <div className="ld-ledger-cap ld-rise" style={delay(4700)}>
            计数账本 · 每处理一件记一笔（示意 100 格）—— <b className="ld-accent">每一格都是 1</b>
          </div>
          <Legend label="dict" style={delay(5200)}>
            键值账本：任务号 → 处理次数
          </Legend>
        </div>
      </div>
    );
  }

  /* step 2 — 场景一归属：三条归属条按口播节拍生长（1 + 2） */
  if (step === 2) {
    const rows = [
      { name: "p0", count: 334, pct: 100, at: 1500 },
      { name: "p1", count: 333, pct: 99.7, at: 3600 },
      { name: "p2", count: 333, pct: 99.7, at: 3600 },
    ];
    return (
      <div className="scene-pad ld-scene ld-own-scene">
        <div className="ld-kicker ld-rise" style={delay(250)}>
          <span className="label-mono">场景一 · 归属清点</span>
        </div>
        <div className="ld-cite ld-cite--hit mono ld-rise" style={delay(500)}>
          {OUT_OWNERS}
        </div>
        <div className="ld-own-rows">
          {rows.map((r) => (
            <div className="ld-own-row" key={r.name}>
              <span className="ld-own-name mono">{r.name}</span>
              <div className="ld-own-track">
                <div
                  className="ld-own-fill"
                  style={{ width: `${r.pct}%`, ...delay(r.at) }}
                />
              </div>
              <span className="ld-own-count mono ld-pop" style={delay(r.at + 950)}>
                {r.count}
                <i> 条</i>
              </span>
            </div>
          ))}
        </div>
        <Legend label="p0 · p1 · p2" style={delay(2400)}>
          三个生产者的名字（第 0 / 1 / 2 号）
        </Legend>
        <div className="ld-own-sum mono ld-rise" style={delay(5600)}>
          334 + 333 + 333 = <b className="ld-accent">1000</b>
          <span className="ld-own-sum-note">—— 一条不少</span>
        </div>
        <div className="ld-own-tagline ld-rise" style={delay(7600)}>
          出货只按<span className="ld-accent">先来后到</span>，不认是谁生的
        </div>
      </div>
    );
  }

  /* step 3 — 场景一收尾：事件迹线 + 计时读数定格 */
  if (step === 3) {
    return (
      <div className="scene-pad ld-scene ld-exit-scene">
        <div className="ld-kicker ld-rise" style={delay(150)}>
          <span className="label-mono">场景一 · 收尾 —— 毒丸计时</span>
        </div>
        <div className="ld-exit-main">
          <div className="ld-trace">
            <div className="ld-trace-row ld-pop" style={delay(400)}>
              <span className="ld-trace-ord mono">01</span>
              <span className="ld-trace-text">
                两个消费者 —— 本就等在 <b className="mono">get()</b> 那行
              </span>
            </div>
            <div className="ld-trace-row ld-trace-row--pill ld-pop" style={delay(1200)}>
              <span className="ld-trace-ord mono">02</span>
              <span className="ld-trace-text">毒丸入队 —— 「该退了」的暗号到了</span>
            </div>
            <div className="ld-trace-row ld-pop" style={delay(2000)}>
              <span className="ld-trace-ord mono">03</span>
              <span className="ld-trace-text">
                两个消费者 <b className="mono ld-accent">return</b> —— 立刻退场
              </span>
            </div>
          </div>
          <div className="ld-exit-hero">
            <div className="hero-num ld-exit-num ld-pop" style={delay(2300)}>
              {"< 1 ms"}
            </div>
            <div className="ld-exit-cap ld-rise" style={delay(2800)}>
              毒丸发出 → 全部消费者退出 · 耗时
            </div>
          </div>
        </div>
        <div className="ld-cite ld-cite--hit mono ld-rise" style={delay(3400)}>
          {OUT_EXIT}
        </div>
        <div className="ld-legend-row">
          <Legend label="get()" style={delay(4200)}>
            从队列取一件，没货就在那行等
          </Legend>
          <Legend label="毒丸" style={delay(4500)}>
            「该退了」的暗号，真任务绝不会认成它
          </Legend>
        </div>
      </div>
    );
  }

  /* step 4 — 场景二全程：采样曲线描画，顶到 maxsize=10 横线（16 秒长拍） */
  if (step === 4) {
    return (
      <div className="scene-pad ld-scene ld-bp-scene">
        <div className="ld-kicker ld-rise" style={delay(250)}>
          <span className="label-mono">场景二 · 背压</span>
          <span className="ld-kicker-sub mono">{SECTIONS[1]}</span>
        </div>
        <div className="ld-chips">
          <span className="ld-chip mono ld-chip--accent ld-rise" style={delay(600)}>
            maxsize = 10
          </span>
          <span className="ld-chip mono ld-rise" style={delay(760)}>
            生产：飞快
          </span>
          <span className="ld-chip mono ld-rise" style={delay(920)}>
            消费：每件 3 ms
          </span>
        </div>
        <div className="ld-chart card ld-rise" style={delay(500)}>
          <svg className="ld-chart-svg" viewBox="0 0 1500 440" role="img" aria-label="队列长度采样曲线：冲顶 10 后被按住，收尾放空">
            <text className="ld-ax" x={56} y={385} textAnchor="end">0</text>
            <text className="ld-ax" x={56} y={225} textAnchor="end">5</text>
            <text className="ld-ax" x={56} y={65} textAnchor="end">10</text>
            <line className="ld-axis" x1={70} y1={380} x2={1450} y2={380} />
            <line className="ld-cap" x1={70} y1={60} x2={1450} y2={60} />
            <text className="ld-cap-label" x={86} y={40}>
              maxsize = 10 —— 容量上限（最多堆 10 件）
            </text>
            <path className="ld-curve" d={CURVE_D} pathLength={1} />
            {SAMP_X.map((x, i) => (
              <circle className="ld-samp" key={x} cx={x} cy={60} r={5} style={delay(8100 + i * 90)} />
            ))}
            <g className="ld-rise" style={delay(5000)}>
              <line className="ld-peak-tick" x1={760} y1={60} x2={760} y2={24} />
              <text className="ld-peak-label" x={774} y={38}>
                峰值 = 10 —— 生产者被按在门外
              </text>
            </g>
          </svg>
        </div>
        <div className="ld-bp-caption">
          <span className="ld-cite mono ld-rise" style={delay(9400)}>
            {OUT_SAMPLE}
          </span>
          <Legend label="背压" style={delay(10200)}>
            下游来不及取，压力反传回上游
          </Legend>
        </div>
        <div className="ld-bp-guarantees">
          <div className="ld-guarantee card ld-rise" style={delay(11400)}>
            <span className="ld-guarantee-mark mono">{"✓\uFE0E"}</span>
            1000 条依然全部恰好一次
          </div>
          <div className="ld-guarantee card ld-rise" style={delay(12200)}>
            <span className="ld-guarantee-mark mono">{"✓\uFE0E"}</span>
            内存不再涨个没完
          </div>
        </div>
      </div>
    );
  }

  /* step 5 — 归因卡 + 场景三开场：检查单两项通过、Thread-12 卡住 */
  if (step === 5) {
    return (
      <div className="scene-pad ld-scene ld-blame-scene">
        <div className="ld-blame-left card ld-pop" style={delay(600)}>
          <div className="ld-blame-kicker">
            <span className="label-mono">归因 · 账要算对</span>
          </div>
          <div className="ld-blame-line ld-rise" style={delay(1100)}>
            「丢任务」——
          </div>
          <div className="ld-blame-line ld-rise" style={delay(1700)}>
            跟<span className="ld-blame-mute">背压</span>没关系
          </div>
          <div className="ld-blame-line ld-rise" style={delay(2400)}>
            跟「<span className="ld-accent">没锁还硬共享</span>」
            <span className="ld-accent">才有关系</span>
          </div>
          <div className="ld-cite mono ld-rise" style={delay(3200)}>
            {OUT_BACKPRESSURE}
          </div>
        </div>
        <div className="ld-blame-right">
          <Term wide style={delay(1000)}>
            <div className="ld-term-line ld-term-section">{SECTIONS[2]}</div>
            <div className="ld-term-line ld-term-hit ld-wrap">{OUT_ALIVE}</div>
          </Term>
          <div className="ld-check">
            <div className="ld-check-row ld-rise" style={delay(4000)}>
              <span className="ld-check-mark mono">{"✓\uFE0E"}</span>任务处理完
            </div>
            <div className="ld-check-row ld-rise" style={delay(4800)}>
              <span className="ld-check-mark mono">{"✓\uFE0E"}</span>
              <span>
                <b className="mono">join()</b> 清点通过 —— 回执收齐了
              </span>
            </div>
            <div className="ld-check-row ld-check-row--stuck">
              <span className="ld-check-mark mono ld-accent">!</span>
              <span>
                <b className="mono">Thread-12</b> 还活着 —— 永远等在{" "}
                <b className="mono">get()</b>
              </span>
            </div>
          </div>
          <div className="ld-legend-row ld-legend-row--col">
            <Legend label="Thread-12" style={delay(8000)}>
              线程的名字——编号是前面场景攒出来的
            </Legend>
            <Legend label="阻塞" style={delay(8600)}>
              卡在那行不动，等不到就不往下走
            </Legend>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — daemon 两栏对照 + 一发毒丸干净退出 */
  if (step === 6) {
    return (
      <div className="scene-pad ld-scene ld-daemon-scene">
        <div className="ld-kicker ld-rise" style={delay(300)}>
          <span className="label-mono">线程的两种「关门态度」</span>
        </div>
        <div className="ld-dm-cards">
          <div className="ld-dm-card card ld-rise" style={delay(800)}>
            <div className="ld-dm-title">
              普通线程<span className="ld-dm-en mono">default</span>
            </div>
            <div className="ld-dm-row ld-rise" style={delay(1600)}>
              <span className="label-mono">关门时</span>必须等它干完
            </div>
            <div className="ld-dm-row ld-rise" style={delay(2000)}>
              <span className="label-mono">等不到</span>程序永远关不了门
            </div>
          </div>
          <div className="ld-dm-card ld-dm-card--accent card ld-rise" style={delay(1200)}>
            <div className="ld-dm-title">
              daemon<span className="ld-dm-en mono">后台线程</span>
            </div>
            <div className="ld-dm-row ld-rise" style={delay(2400)}>
              <span className="label-mono">标记</span>「不用等它」
            </div>
            <div className="ld-dm-row ld-rise" style={delay(2800)}>
              <span className="label-mono">关门</span>直接不等，先走
            </div>
          </div>
        </div>
        <div className="ld-dm-warning ld-rise" style={delay(4800)}>
          刚才这位要是普通线程——<span className="ld-accent">退不出去，还没有任何报错</span>
        </div>
        <div className="ld-cite mono ld-rise" style={delay(5800)}>
          {OUT_SHUTDOWN}
        </div>
        <Legend label="threading._shutdown" style={delay(6800)}>
          Python 关门前点名等线程的那道手续
        </Legend>
        <div className="ld-rescue">
          <span className="ld-rescue-pill mono ld-pop" style={delay(9300)}>
            一发毒丸
          </span>
          <span className="ld-rescue-arrow ld-rise" style={delay(9700)}>
            →
          </span>
          <span className="ld-rescue-stamp mono ld-pop" style={delay(10200)}>
            干净退出
          </span>
        </div>
      </div>
    );
  }

  /* step 7 — 实踩：120 秒事故时间线 + 教训（末步，默认返回） */
  return (
    <div className="scene-pad ld-scene ld-war-scene">
      <div className="ld-kicker ld-rise" style={delay(250)}>
        <span className="label-mono">实踩 · 这个坑开发时真踩过</span>
      </div>
      <div className="ld-tl">
        <div className="ld-tl-blocks">
          <div className="ld-tl-a ld-pop" style={delay(700)} />
          <div className="ld-tl-b" style={delay(1200)} />
          <div className="ld-tl-c ld-pop" style={delay(3800)} />
        </div>
        <div className="ld-tl-labels">
          <div className="ld-tl-label ld-rise" style={delay(1000)}>
            <b>演示跑完</b>
            <span className="mono">0 s</span>
          </div>
          <div className="ld-tl-label ld-tl-label--stuck ld-rise" style={delay(2500)}>
            <b>忘做收尾 —— 进程挂起</b>
            <span className="mono ld-accent">120 s</span>
          </div>
          <div className="ld-tl-label ld-rise" style={delay(4200)}>
            <b>改写演示</b>
            <span>「先展示卡死，再毒丸救援」</span>
          </div>
        </div>
      </div>
      <div className="ld-war-tagline ld-rise" style={delay(5400)}>
        收尾协议要<span className="ld-accent">从设计时</span>就写进去——不是等卡住了再补
      </div>
      <div className="ld-war-note ld-rise" style={delay(6400)}>
        <span className="label-mono">补一刀</span>
        挂足 120 秒的全程里，一条报错都没有
      </div>
    </div>
  );
}
