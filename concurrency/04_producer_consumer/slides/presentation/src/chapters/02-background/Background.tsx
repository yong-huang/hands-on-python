import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** step 0 · 四条线程都直接读写同一份容器（读写标签来自 article §Background L15）。 */
const THREADS = [
  { name: "线程 A", act: "读" },
  { name: "线程 B", act: "写" },
  { name: "线程 C", act: "读" },
  { name: "线程 D", act: "写" },
];

/** step 1 · 碰数据的代码点 —— 读写处处都要锁。 */
const TOUCHPOINTS = [
  { code: "items.append(x)", act: "写" },
  { code: "items.pop()", act: "写" },
  { code: "if not items:", act: "读" },
  { code: "items[0]", act: "读" },
  { code: "len(items)", act: "读" },
];

/** step 3 · Queue 打包清单（article §Background L22：锁、等待通知、回执、限流）。 */
const PACKS = ["容器", "锁", "等待通知", "回执", "限流"];

/** step 4 · 三道工序（article §When to Use L56：下载 → 解析 → 落盘）。 */
const STAGES = [
  { ord: "01", name: "下载", en: "download" },
  { ord: "02", name: "读取", en: "parse" },
  { ord: "03", name: "存盘", en: "save" },
];

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — 老方案：线程箭头全部指向同一份共享容器，一把大锁压在上面 */
  if (step === 0) {
    return (
      <div className="scene-pad bg-scene bg0-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">老方案 · 共享状态 ＋ 一把锁</span>
        </div>
        <div className="bg0-diagram">
          <div className="bg0-lanes">
            {THREADS.map((t, i) => (
              <div className="bg0-lane" key={t.name}>
                <span className="bg0-thread bg-rise" style={delay(400 + i * 220)}>
                  <span className="mono">{t.name}</span>
                  <span className="bg0-act mono">{t.act}</span>
                </span>
                <span className="bg0-wire" style={delay(1500 + i * 280)} aria-hidden />
              </div>
            ))}
          </div>
          <div className="bg0-boxwrap bg-rise" style={delay(700)}>
            <span className="bg0-lock" style={delay(3400)}>
              <span className="bg0-lockglyph" aria-hidden />
              一把大锁 · 一次只放一个
            </span>
            <div className="bg0-box">
              <div className="label-mono">共享容器 · 同一份 list</div>
              <div className="bg0-cells">
                <span className="bg0-cell mono">t-001</span>
                <span className="bg0-cell mono">t-002</span>
                <span className="bg0-cell mono">t-003</span>
                <span className="bg0-cell mono">t-004</span>
              </div>
              <div className="bg0-box-note mono">读也好 · 写也好，都要先过这把锁</div>
            </div>
          </div>
        </div>
        <div className="bg0-notes">
          <div className="bg-note bg-rise" style={delay(4500)}>
            <span className="bg-note-tag mono">白话</span>
            数据摆在明面上 —— 谁都能来一手
          </div>
          <div className="bg-note bg-note--dim bg-rise" style={delay(5000)}>
            <span className="bg-note-tag mono">自觉</span>
            何时能碰 · 何时收尾 —— 边界全靠自己记
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 共享面的负担：碰数据的地方越多，锁越多 */
  if (step === 1) {
    return (
      <div className="scene-pad bg-scene bg1-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">老方案 · 代价</span>
        </div>
        <h1 className="bg1-hero bg-rise" style={delay(250)}>
          能跑。但碰数据的地方越多，
          <br />
          <b className="bg-accent">要锁的地方越多</b>
        </h1>
        <div className="bg1-strip">
          {TOUCHPOINTS.map((t, i) => (
            <div className="bg1-point" key={t.code}>
              <span className="bg1-lockchip bg-pop" style={delay(1200 + i * 300)}>
                <span className="bg0-lockglyph bg0-lockglyph--sm" aria-hidden />
                <span className="mono">lock</span>
              </span>
              <span className="bg1-code mono bg-rise" style={delay(1350 + i * 300)}>
                {t.code}
              </span>
              <span className="bg1-act mono bg-rise" style={delay(1550 + i * 300)}>
                {t.act}
              </span>
            </div>
          ))}
        </div>
        <div className="bg1-caption bg-rise" style={delay(3700)}>
          每一处，都得亲自盯着 —— <span className="bg-accent">锁的边界 ＝ 你自己画的</span>
        </div>
        <div className="bg-term bg-rise" style={delay(4400)}>
          <span className="bg-note-tag mono">名词</span>
          <b>共享面</b>＝同一份数据上，有多少处代码在读写
        </div>
      </div>
    );
  }

  /* step 2 — 范式翻转：左「共享＋锁」灰化，右「各管各的＋一条队列」亮起 */
  if (step === 2) {
    return (
      <div className="scene-pad bg-scene bg2-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">范式翻转 · 共享＋锁 → 消息传递</span>
        </div>
        <div className="bg2-panels">
          <div className="bg2-left bg-rise" style={delay(300)}>
            <div className="bg2-leftinner">
              <div className="bg2-tag mono">旧 · 共享容器 ＋ 到处加锁</div>
              <div className="bg2-mini">
                <div className="bg2-mini-threads">
                  <span className="bg2-mini-thread mono">线程 A</span>
                  <span className="bg2-mini-thread mono">线程 B</span>
                </div>
                <span className="bg2-mini-wire" aria-hidden />
                <div className="bg2-mini-box">
                  <span className="mono">共享容器</span>
                  <span className="bg2-mini-lock mono">
                    <span className="bg0-lockglyph bg0-lockglyph--sm" aria-hidden />
                    锁
                  </span>
                </div>
              </div>
              <div className="bg2-leftcap mono">数据摆明面上 · 处处要锁</div>
            </div>
          </div>
          <div className="bg2-mid" aria-hidden>
            <span className="bg2-flip bg-pop" style={delay(2000)}>反着来</span>
          </div>
          <div className="bg2-right">
            <div className="bg2-tag bg2-tag--on mono bg-rise" style={delay(1200)}>
              新 · 消息传递
            </div>
            <div className="bg2-workers">
              <span className="bg2-worker bg-rise" style={delay(1500)}>
                <b className="mono">线程 A</b>只管生成
              </span>
              <span className="bg2-worker bg-rise" style={delay(1780)}>
                <b className="mono">线程 B</b>只管处理
              </span>
              <span className="bg2-worker bg-rise" style={delay(2060)}>
                <b className="mono">线程 C</b>只管存盘
              </span>
            </div>
            <div className="bg2-fall" aria-hidden>
              <span className="bg2-fallarrow bg-rise" style={delay(2300)}>↓</span>
              <span className="bg2-fallarrow bg-rise" style={delay(2540)}>↓</span>
              <span className="bg2-fallarrow bg-rise" style={delay(2780)}>↓</span>
            </div>
            <div className="bg2-queue bg-rise" style={delay(2700)}>
              <div className="bg2-queue-head">
                <span className="label-mono">同一条队列</span>
                <span className="bg2-fifo mono">FIFO · 先进先出</span>
              </div>
              <div className="bg2-slots">
                {[1, 2, 3, 4].map((n, i) => (
                  <span className="bg2-slotcell" key={n}>
                    <span
                      className={`bg2-item mono bg-pop${n === 1 ? " bg2-item--head" : ""}`}
                      style={delay(3600 + i * 420)}
                    >
                      {n}
                    </span>
                  </span>
                ))}
              </div>
              <div className="bg2-ends">
                <span className="bg2-endhead mono bg-rise" style={delay(5100)}>← 队头 · 先来的先办</span>
                <span className="bg2-endtail mono bg-rise" style={delay(5300)}>队尾 · 后到</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-term bg-rise" style={delay(6200)}>
          <span className="bg-note-tag mono">白话</span>
          <b>队列</b>＝排队的队 —— 先来的先办
        </div>
      </div>
    );
  }

  /* step 3 — 收束：queue.Queue hero 卡 ＋ 「等待通知」睡→醒微演示 */
  if (step === 3) {
    return (
      <div className="scene-pad bg-scene bg3-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">收束 · 标准库把这套做法打包成一个类</span>
        </div>
        <div className="bg3-hero" aria-label="queue.Queue">
          {"queue.Queue".split("").map((ch, i) => (
            <span className="bg3-letter mono" style={delay(i * 60)} key={i}>
              {ch}
            </span>
          ))}
        </div>
        <div className="bg3-packs">
          {PACKS.map((p, i) => (
            <span
              className={`bg3-pack mono bg-pop${p === "等待通知" ? " bg3-pack--on" : ""}`}
              style={delay(1800 + i * 180)}
              key={p}
            >
              {p}
            </span>
          ))}
        </div>
        <div className="bg3-demo bg-rise" style={delay(3000)}>
          <div className="bg3-side">
            <span className="bg3-who mono">消费者</span>
            <span className="bg3-status">
              <span className="bg3-status-a mono">没货 · 睡着</span>
              <span className="bg3-status-b mono">来货 · 被叫醒</span>
            </span>
          </div>
          <span className="bg3-dir mono">取 ←</span>
          <span className="bg3-slotbox">
            <span className="bg3-item mono" style={delay(4100)}>t-009</span>
          </span>
          <span className="bg3-dir mono">放 →</span>
          <div className="bg3-side">
            <span className="bg3-who mono">生产者</span>
            <span className="bg3-sidecap mono">只管往里放</span>
          </div>
        </div>
        <div className="bg3-sub bg-rise" style={delay(5900)}>
          等待通知也内置了 —— 你只管<b className="bg-accent">往里放</b>、<b className="bg-accent">从里取</b>
        </div>
      </div>
    );
  }

  /* step 4 — 场景一：三道工序流水线，队列递活 */
  if (step === 4) {
    return (
      <div className="scene-pad bg-scene bg4-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">场景 · 什么时候值得搭流水线</span>
        </div>
        <h1 className="bg4-question bg-rise" style={delay(250)}>
          一批活，要过<b className="bg-accent">好几道工序</b>
        </h1>
        <div className="bg4-pipeline">
          {STAGES.map((s, i) => (
            <Fragment key={s.ord}>
              <div className="bg4-stage bg-rise" style={delay(800 + i * 650)}>
                <div className="bg4-stage-top">
                  <span className="bg4-ord mono">{s.ord}</span>
                  <span className="bg4-name">{s.name}</span>
                </div>
                <span className="bg4-en mono">{s.en}</span>
                <span className="bg4-crew mono">一道工序 · 一组线程</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="bg4-link bg-rise" style={delay(1150 + i * 650)}>
                  <span className="bg4-linklabel mono">队列递活</span>
                  <span className={`bg4-flow${i === 1 ? " bg4-flow--b" : ""}`} aria-hidden />
                </div>
              )}
            </Fragment>
          ))}
        </div>
        <div className="bg4-tagline bg-rise" style={delay(5800)}>
          快道，<span className="bg-accent">不用等慢道</span>
        </div>
        <div className="bg4-corner mono bg-rise" style={delay(6200)}>
          完整实例 · 15_downloader（同一仓库）
        </div>
      </div>
    );
  }

  /* step 5 — 场景二三：任务分发 × 上游过载，队列满压力反传 */
  if (step === 5) {
    return (
      <div className="scene-pad bg-scene bg5-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">场景 · 任务分发 × 上游过载</span>
        </div>
        <div className="bg5-revrow" aria-hidden>
          <span className="bg5-revlabel mono bg-rise" style={delay(6800)}>压力反传</span>
          <span className="bg5-revwire" style={delay(6500)} />
        </div>
        <div className="bg5-chain">
          <div className="bg5-end bg-rise" style={delay(400)}>
            <span className="bg5-endname">上游</span>
            <span className="bg5-endsub mono">＝发货的那头 · 生产者</span>
            <span className="bg5-state mono bg-rise" style={delay(5900)}>被按住 · 等空位</span>
          </div>
          <div className="bg5-tryzone">
            <span className="bg5-try mono" style={delay(4700)}>第 5 件</span>
            <span className="bg5-trynote mono bg-rise" style={delay(5500)}>塞不进去了</span>
          </div>
          <div className="bg5-queue bg-rise" style={delay(800)}>
            <div className="bg5-queue-head">
              <span className="label-mono">同一条队列</span>
              <span className="bg5-max mono">maxsize ＝ 容量上限</span>
            </div>
            <div className="bg5-slots">
              {[1, 2, 3, 4].map((n, i) => (
                <span className="bg5-slotcell" key={n}>
                  <span className="bg5-item mono bg-pop" style={delay(2400 + i * 400)}>
                    {n}
                  </span>
                </span>
              ))}
            </div>
            <span className="bg5-full mono" style={delay(4300)}>满</span>
          </div>
          <div className="bg5-end bg-rise" style={delay(550)}>
            <span className="bg5-endname">下游</span>
            <span className="bg5-endsub mono">＝接货那头 · 消费者</span>
            <span className="bg5-state bg5-state--slow mono bg-rise" style={delay(2000)}>来不及取 · 慢</span>
          </div>
        </div>
        <div className="bg-note bg-rise" style={delay(7700)}>
          <span className="bg-note-tag mono">白话</span>
          下游来不及取 → 队列写满 → 压力反传回上游
        </div>
      </div>
    );
  }

  /* step 6 — 边界：三种情况不要折腾（按口播分句逐卡落）＋ 同类方案角标 */
  return (
    <div className="scene-pad bg-scene bg6-scene">
      <div className="bg-head bg-rise">
        <span className="label-mono">边界 · 三种情况，不要折腾</span>
      </div>
      <div className="bg6-cards">
        <div className="bg6-card bg-pop" style={delay(1400)}>
          <span className="bg6-ord mono">01</span>
          <div className="bg6-title">活儿很小</div>
          <div className="bg6-bars" aria-hidden>
            <div className="bg6-barow">
              <span className="mono">活儿本身</span>
              <span className="bg6-track"><span className="bg6-bar bg6-bar--work" /></span>
            </div>
            <div className="bg6-barow">
              <span className="mono">收尾协议</span>
              <span className="bg6-track"><span className="bg6-bar bg6-bar--proto" /></span>
            </div>
          </div>
          <div className="bg6-verdict">
            几百毫秒跑完的活，收尾协议 ＝ <b className="bg-accent">多余的复杂度</b>
          </div>
        </div>
        <div className="bg6-card bg-pop" style={delay(4200)}>
          <span className="bg6-ord mono">02</span>
          <div className="bg6-title">一把扔出去 · 收齐结果</div>
          <div className="bg6-flow" aria-hidden>
            <span className="bg6-flowchip mono bg-rise" style={delay(4900)}>批量扔出</span>
            <span className="bg6-flowarrow bg-rise" style={delay(5150)}>→</span>
            <span className="bg6-flowchip bg6-flowchip--on mono bg-rise" style={delay(5400)}>线程池 · 反复用</span>
            <span className="bg6-flowarrow bg-rise" style={delay(5650)}>→</span>
            <span className="bg6-flowchip mono bg-rise" style={delay(5900)}>收齐结果</span>
          </div>
          <div className="bg6-verdict">
            用 <b className="bg-accent mono">concurrent.futures</b> 更省事 —— 预先雇好一批线程，反复用
          </div>
        </div>
        <div className="bg6-card bg-pop" style={delay(9600)}>
          <span className="bg6-ord mono">03</span>
          <div className="bg6-title">要按扔进去的顺序返回结果</div>
          <div className="bg6-order" aria-hidden>
            <div className="bg6-orderow">
              <span className="bg6-orderlabel mono">扔进去</span>
              <span className="bg6-ochip mono">1</span>
              <span className="bg6-ochip mono">2</span>
              <span className="bg6-ochip mono">3</span>
            </div>
            <div className="bg6-orderow">
              <span className="bg6-orderlabel mono">干完的</span>
              <span className="bg6-ochip bg6-ochip--out mono bg-pop" style={delay(10400)}>2</span>
              <span className="bg6-ochip bg6-ochip--out mono bg-pop" style={delay(10660)}>3</span>
              <span className="bg6-ochip bg6-ochip--out mono bg-pop" style={delay(10920)}>1</span>
            </div>
          </div>
          <div className="bg6-verdict">
            多个消费者<b className="bg-accent">保证不了</b> —— 要有序，单消费者或自行重排
          </div>
        </div>
      </div>
      <div className="bg6-siblings bg-rise" style={delay(13200)}>
        <span className="label-mono">同类方案</span>
        <span className="bg6-sib mono">multiprocessing.Queue · 跨进程版</span>
        <span className="bg6-sib mono">asyncio.Queue · 协程版</span>
        <span className="bg6-sibtalk mono">各有讲次，轮到再说</span>
      </div>
    </div>
  );
}
