import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./DemoLimits.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** article §Quick Start 真实输出 §2 / §3 节选（屏幕写原样标识符）。 */
const S2_TITLE = "[2. Semaphore(10)：50 个任务同时在飞的峰值]";
const S2_LINE = "50 个任务全部完成，在飞峰值 = 10（≤ 许可数 10）";
const S3_TITLE = "[3. 背压对比：无界 vs maxsize=64（慢消费）]";
const S3_L1 = "无界队列:   峰值长度 = 4,749（生产一路狂奔，任务堆积在内存里）";
const S3_L2 = "maxsize=64:  峰值长度 = 64（生产者被按住，内存恒定）";

/** 事件循环内的计数器演示（step 1，确定性依次点亮）。 */
const COUNTER_TICKS = ["10", "9", "8", "…", "1", "0", "归还"] as const;

/** 诚实预期三条（step 3）。 */
const HONEST = [
  {
    ord: "01",
    claim: "每秒 200 万条任务",
    fact: "任务是纯内存记账；换真实网络 IO，吞吐由网络决定",
    at: 400,
  },
  {
    ord: "02",
    claim: "无界峰值 4700~5000",
    fact: "随生产/消费相对速度浮动，每次运行不同",
    at: 3200,
  },
  {
    ord: "03",
    claim: "自动核对只锁一条",
    fact: "无界至少比有界高 5 倍",
    at: 5800,
  },
] as const;

export default function DemoLimitsChapter({ step }: ChapterStepProps) {
  /* step 0 — §2：在飞峰值 = 10（水位计） */
  if (step === 0) {
    return (
      <div className="scene-pad dl-scene">
        <div className="dl-term dl-rise" style={delay(150)}>
          <div className="dl-term-bar">
            <span className="dl-term-dot" />
            <span className="dl-term-dot" />
            <span className="dl-term-dot" />
            <span className="dl-term-title mono">§2 · 限流实测</span>
          </div>
          <div className="dl-term-body">
            <div className="dl-term-line dl-term-line--dim mono">{S2_TITLE}</div>
            <div className="dl-term-line dl-term-line--hot mono">{S2_LINE}</div>
          </div>
        </div>
        <div className="dl-gauge-row">
          <div className="dl-gauge dl-rise" style={delay(1600)}>
            <div className="dl-gauge-mark mono" style={delay(3400)}>10 ← 峰值水位</div>
            <div className="dl-gauge-tube">
              <div className="dl-gauge-fill dl-gauge-fillup" style={delay(2200)} />
              <div className="dl-gauge-cap" />
            </div>
            <div className="dl-gauge-base mono">Semaphore(10) · 许可上限</div>
          </div>
          <div className="dl-gauge-side">
            <div className="dl-gauge-big dl-num-row">
              <span className="hero-num dl-gauge-num dl-pop" style={delay(3800)}>10</span>
              <span className="dl-gauge-unit">/ 50 个任务</span>
            </div>
            <div className="dl-gauge-note dl-rise" style={delay(4300)}>
              50 个全部完成 · 在飞从没超过 10
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 许可就是计数器 */
  if (step === 1) {
    return (
      <div className="scene-pad dl-scene">
        <div className="dl-head dl-rise">
          <span className="label-mono">许可 · 就是事件循环里的一个计数器</span>
        </div>
        <div className="dl-counter">
          {COUNTER_TICKS.map((t, i) => (
            <span
              key={t}
              className={`dl-tick mono dl-tick-pop${t === "归还" ? " dl-tick--back" : ""}`}
              style={delay(600 + i * 420)}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="dl-counter-note dl-rise" style={delay(3800)}>
          拿到许可才放行 · 退出一段才归还
        </div>
        <div className="dl-verdicts">
          <span className="dl-verdict dl-pop" style={delay(4400)}>不占线程</span>
          <span className="dl-verdict dl-pop" style={delay(4900)}>零竞态</span>
          <span className="dl-verdict dl-verdict--acc dl-pop" style={delay(5400)}>
            比线程版更确定
          </span>
        </div>
      </div>
    );
  }

  /* step 2 — §3：无界 vs maxsize=64 容器对比 */
  if (step === 2) {
    return (
      <div className="scene-pad dl-scene">
        <div className="dl-term dl-term--slim dl-rise" style={delay(150)}>
          <div className="dl-term-bar">
            <span className="dl-term-dot" />
            <span className="dl-term-dot" />
            <span className="dl-term-dot" />
            <span className="dl-term-title mono">§3 · 背压对比（慢消费）</span>
          </div>
          <div className="dl-term-body">
            <div className="dl-term-line dl-term-line--dim mono">{S3_TITLE}</div>
            <div className="dl-term-line mono">{S3_L1}</div>
            <div className="dl-term-line mono">{S3_L2}</div>
          </div>
        </div>
        <div className="dl-boxes">
          <div className="dl-box-col dl-rise" style={delay(2200)}>
            <div className="dl-box dl-box--wild">
              <div className="dl-box-dots">
                {Array.from({ length: 48 }, (_, i) => (
                  <span key={i} className="dl-box-dot dl-box-dot-enter" style={delay(2600 + i * 26)} />
                ))}
              </div>
            </div>
            <div className="dl-box-label mono">无界 · 峰值 4,749 · 漫出来</div>
          </div>
          <div className="dl-box-col dl-rise" style={delay(3200)}>
            <div className="dl-box dl-box--capped">
              <div className="dl-box-dots dl-box-dots--grid">
                {Array.from({ length: 64 }, (_, i) => (
                  <span key={i} className="dl-box-dot dl-box-dot--fill dl-box-dot-enter" style={delay(3600 + i * 18)} />
                ))}
              </div>
              <div className="dl-box-cap mono">maxsize = 64</div>
            </div>
            <div className="dl-box-label dl-box-label--acc mono">有界 · 峰值恰好 64 · 恒定</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 诚实预期 */
  return (
    <div className="scene-pad dl-scene">
      <div className="dl-head dl-rise">
        <span className="label-mono">诚实预期 · 先说清楚</span>
      </div>
      <div className="dl-honest">
        {HONEST.map((h) => (
          <div className="dl-honest-row dl-rise" style={delay(h.at)} key={h.ord}>
            <span className="dl-honest-ord mono">{h.ord}</span>
            <span className="dl-honest-claim">{h.claim}</span>
            <span className="dl-honest-fact">{h.fact}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
