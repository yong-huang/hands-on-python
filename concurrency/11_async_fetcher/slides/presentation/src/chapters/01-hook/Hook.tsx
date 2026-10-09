import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* 50 格端点带：15 个不稳定位的下标（首败必恢复） */
const UNSTABLE = new Set([6, 9, 13, 18, 21, 24, 29, 31, 35, 38, 41, 44, 46, 48, 49]);

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hf-scene hf-title-scene">
        <div className="hf-kicker label-mono hf-rise">
          hands-on-python · concurrency 11 · aiohttp
        </div>
        <h1 className="hf-title hf-rise" style={delay(250)}>
          异步批量抓取器
        </h1>
        <div className="hf-rule rule-grow in" style={delay(700)} />
        <div className="hf-subtitle hf-rise" style={delay(900)}>
          一批接口，怎么抓得又快又稳
        </div>
        <div className="hf-def hf-rise" style={delay(1500)}>
          抓取器 —— 拿着一份网址清单、<b className="hf-accent">挨个把内容拉回来</b>的程序
        </div>
        <div className="hf-examples hf-rise" style={delay(2300)}>
          <span className="label-mono hf-ex-label">抓的都是</span>
          <span className="hf-chip">商品价格</span>
          <span className="hf-chip">天气数据</span>
          <span className="hf-chip">文章列表</span>
        </div>
      </div>
    );
  }

  /* step 1 — 任务卡：50 个接口 × 1 请求 */
  if (step === 1) {
    return (
      <div className="scene-pad hf-scene hf-task-scene">
        <div className="hf-task-top">
          <div className="hf-listcard hf-pop" style={delay(200)}>
            <div className="hf-listcard-head mono">FETCH LIST · 50</div>
            <div className="hf-listcard-row mono">/api/data/01</div>
            <div className="hf-listcard-row mono">/api/data/02</div>
            <div className="hf-listcard-row mono">/api/data/03</div>
            <div className="hf-listcard-dots mono">……</div>
            <div className="hf-listcard-row mono">/api/data/50</div>
          </div>
          <div className="hf-flow">
            <div className="hf-node hf-node--you hf-rise" style={delay(700)}>
              <div className="hf-node-tag mono">你的程序</div>
              <div className="hf-node-name">抓取器</div>
            </div>
            <div className="hf-arrows">
              <div className="hf-arrow hf-rise" style={delay(1300)}>
                <span className="hf-arrow-line" />
                <span className="hf-arrow-label mono">请求 × 50</span>
              </div>
              <div className="hf-arrow hf-arrow--back hf-rise" style={delay(1900)}>
                <span className="hf-arrow-line" />
                <span className="hf-arrow-label mono">数据 × 50</span>
              </div>
            </div>
            <div className="hf-node hf-node--api hf-rise" style={delay(1000)}>
              <div className="hf-node-tag mono">50 个数据接口</div>
              <div className="hf-node-name">
                发个请求
                <br />
                回一份数据
              </div>
            </div>
          </div>
        </div>
        <div className="hf-task-bottom hf-rise" style={delay(2600)}>
          <span className="hf-task-hero">
            任务：每接口发<b className="hf-accent">一个请求</b>，50 份全收回
          </span>
          <span className="hf-task-q">—— 怎么能抓得又快又稳？</span>
        </div>
      </div>
    );
  }

  /* step 2 — 实测数字榜（条长 = 耗时） */
  if (step === 2) {
    return (
      <div className="scene-pad hf-scene hf-board-scene">
        <div className="hf-board-title hf-rise">同样抓这 50 个接口</div>
        <div className="hf-board">
          <div className="hf-board-row">
            <span className="hf-board-name mono">串行</span>
            <span className="hf-board-track">
              <span className="hf-board-bar hf-board-bar--slow hf-grow" style={delay(400)} />
            </span>
            <span className="hf-board-val hero-num hf-rise" style={delay(600)}>
              3.60s
            </span>
          </div>
          <div className="hf-board-row">
            <span className="hf-board-name mono">线程池</span>
            <span className="hf-board-track">
              <span className="hf-board-bar hf-board-bar--fast hf-grow" style={delay(1400)} />
            </span>
            <span className="hf-board-val hero-num hf-rise" style={delay(1600)}>
              0.43s
            </span>
          </div>
          <div className="hf-board-row hf-board-row--best">
            <span className="hf-board-name mono">异步</span>
            <span className="hf-board-track">
              <span className="hf-board-bar hf-board-bar--fast hf-grow" style={delay(2200)} />
            </span>
            <span className="hf-board-val hero-num hf-rise" style={delay(2400)}>
              0.42s
            </span>
          </div>
        </div>
        <div className="hf-board-note hf-rise" style={delay(3200)}>
          最快的写法，快了 <b className="hf-board-times hero-num">8.6 倍</b>
        </div>
      </div>
    );
  }

  /* step 3 — 快只是一部分：抖动让整批报错 */
  if (step === 3) {
    return (
      <div className="scene-pad hf-scene hf-jitter-scene">
        <div className="hf-jitter-headline hf-rise">
          快，<b className="hf-accent">只是一部分</b>
        </div>
        <div className="hf-jitter-sub hf-rise" style={delay(500)}>
          真实网络会抖动
        </div>
        <div className="hf-jitter-tags">
          <span className="hf-jitter-tag hf-pop" style={delay(1100)}>
            偶发服务器错误
          </span>
          <span className="hf-jitter-tag hf-pop" style={delay(1700)}>
            慢接口
          </span>
          <span className="hf-jitter-tag hf-pop" style={delay(2300)}>
            瞬时失败
          </span>
        </div>
        <div className="hf-crash">
          <div className="hf-crash-strip">
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                className={`hf-cell hf-rise${i === 17 ? " hf-cell--bad" : ""}`}
                style={delay(2800 + i * 35)}
              >
                {i === 17 ? "✗\uFE0E" : ""}
              </span>
            ))}
          </div>
          <div className="hf-crash-verdict hf-rise" style={delay(4300)}>
            <span className="label-mono">裸写的客户端</span>
            一遇抖动 → <b className="hf-accent">整批报错</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 引用卡 */
  if (step === 4) {
    return (
      <div className="scene-pad hf-scene hf-quote-scene">
        <div className="hf-quote-text hf-rise" style={delay(300)}>
          服务器偶发一个报错，
          <br />
          我<b className="hf-accent">整批全挂</b>了。
        </div>
        <div className="hf-quote-attrib hf-rise" style={delay(1200)}>
          —— 做过抓取的人，多半说过这句话
        </div>
        <div className="hf-quote-note hf-rise" style={delay(2200)}>
          失败处理散落各处，全是零散的条件判断
        </div>
      </div>
    );
  }

  /* step 5 — 15 个不稳定端点 */
  if (step === 5) {
    return (
      <div className="scene-pad hf-scene hf-grid-scene">
        <div className="hf-grid-top">
          <div className="hf-grid-board">
            {Array.from({ length: 50 }, (_, i) => (
              <span
                key={i}
                className={`hf-grid-cell hf-pop${UNSTABLE.has(i) ? " hf-grid-cell--unstable" : ""}`}
                style={delay(200 + i * 28)}
              />
            ))}
          </div>
          <div className="hf-grid-legend hf-rise" style={delay(2200)}>
            <span className="hf-legend-item">
              <span className="hf-grid-cell hf-legend-cell" /> 常规端点 × 35
            </span>
            <span className="hf-legend-item">
              <span className="hf-grid-cell hf-grid-cell--unstable hf-legend-cell" />
              不稳定端点 × 15 —— 第一次必失败 · 之后才恢复
            </span>
          </div>
        </div>
        <div className="hf-grid-question hf-rise" style={delay(3000)}>
          谁能把它们<b className="hf-accent">全部救回来</b>？
        </div>
      </div>
    );
  }

  /* step 6 — 答案：三件套（fallthrough 收尾） */
  return (
    <div className="scene-pad hf-scene hf-answer-scene">
      <div className="hf-answer-kicker hf-rise">答案是三件套</div>
      <div className="hf-answer-row">
        <div className="hf-answer-card hf-pop" style={delay(400)}>
          <div className="hf-answer-en mono">RATE LIMIT</div>
          <div className="hf-answer-name">限流</div>
          <div className="hf-answer-note">别一拳打死对方</div>
        </div>
        <div className="hf-answer-card hf-pop" style={delay(1200)}>
          <div className="hf-answer-en mono">TIMEOUT</div>
          <div className="hf-answer-name">超时</div>
          <div className="hf-answer-note">不等不会回话的</div>
        </div>
        <div className="hf-answer-card hf-pop" style={delay(2000)}>
          <div className="hf-answer-en mono">RETRY</div>
          <div className="hf-answer-name">重试</div>
          <div className="hf-answer-note">抖过的再捞一遍</div>
        </div>
      </div>
      <div className="hf-answer-foot hf-rise" style={delay(3000)}>
        认真上线的异步客户端 · 的标配 —— 我们挨个分析
      </div>
    </div>
  );
}
