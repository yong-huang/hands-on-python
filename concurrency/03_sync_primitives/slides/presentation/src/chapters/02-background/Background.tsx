import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const PRODUCERS = ["T1", "T2", "T3"];
const CONSUMERS = ["T4", "T5", "T6"];

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — 线程版流水线结构 */
  if (step === 0) {
    return (
      <div className="scene-pad bg-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">老做法 · 多线程流水线</span>
        </div>
        <div className="bg-pipeline">
          <div className="bg-col bg-rise" style={delay(200)}>
            {PRODUCERS.map((t, i) => (
              <div className="bg-thread bg-rise" style={delay(350 + i * 160)} key={t}>
                <span className="bg-thread-ord mono">{t}</span>
                <span>生产者线程</span>
              </div>
            ))}
          </div>
          <div className="bg-arrow bg-rise" style={delay(900)}>→</div>
          <div className="bg-queue bg-pop" style={delay(1100)}>
            <div className="bg-queue-code mono">queue.Queue</div>
            <div className="bg-queue-note">线程安全队列</div>
          </div>
          <div className="bg-arrow bg-rise" style={delay(1500)}>→</div>
          <div className="bg-col bg-rise" style={delay(1650)}>
            {CONSUMERS.map((t, i) => (
              <div className="bg-thread bg-rise" style={delay(1800 + i * 160)} key={t}>
                <span className="bg-thread-ord mono">{t}</span>
                <span>消费者线程</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-foot bg-rise" style={delay(2600)}>
          围着一条队列转 · 想并发抓 1 万个 URL，就开一批线程
        </div>
      </div>
    );
  }

  /* step 1 — 痛点：每次存取的锁竞争与线程切换 */
  if (step === 1) {
    return (
      <div className="scene-pad bg-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">痛点 · 在线程本身</span>
        </div>
        <div className="bg-pipeline bg-pipeline--mute">
          <div className="bg-col">
            {PRODUCERS.map((t) => (
              <div className="bg-thread" key={t}>
                <span className="bg-thread-ord mono">{t}</span>
                <span>生产者线程</span>
              </div>
            ))}
          </div>
          <div className="bg-queue">
            <div className="bg-queue-code mono">queue.Queue</div>
            <div className="bg-queue-note">每一次 put / get</div>
          </div>
          <div className="bg-col">
            {CONSUMERS.map((t) => (
              <div className="bg-thread" key={t}>
                <span className="bg-thread-ord mono">{t}</span>
                <span>消费者线程</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-tags">
          <div className="bg-tag bg-pop" style={delay(700)}>锁竞争</div>
          <div className="bg-tag bg-pop" style={delay(1300)}>线程切换</div>
          <div className="bg-tag bg-tag--wide bg-rise" style={delay(2200)}>
            线程一多 → 内存 + 切换开销跟着涨
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 计数字典加锁防竞态；千级万级被调度成本拖垮 */
  if (step === 2) {
    return (
      <div className="scene-pad bg-scene">
        <div className="bg-dict-row">
          <div className="bg-dict bg-rise" style={delay(150)}>
            <div className="bg-dict-title mono">counts = {}</div>
            <div className="bg-dict-note">多个消费者 · 同时更新</div>
          </div>
          <div className="bg-lock bg-pop" style={delay(1000)}>
            <div className="bg-lock-shackle" />
            <div className="bg-lock-body" />
            <div className="bg-lock-label mono">再加一把锁</div>
          </div>
          <div className="bg-race bg-rise" style={delay(1800)}>
            <div className="bg-race-term">竞态</div>
            <div className="bg-race-note">结果取决于执行时序的缺陷</div>
          </div>
        </div>
        <hr className="rule bg-rise" style={delay(2400)} />
        <div className="bg-load">
          <div className="bg-load-scale">
            <span className="bg-load-mark bg-rise" style={delay(2800)}>百级 · 还行</span>
            <span className="bg-load-mark bg-rise" style={delay(3400)}>千级 · 吃力</span>
            <span className="bg-load-mark bg-load-mark--dead bg-rise" style={delay(4000)}>
              万级 · 被调度成本拖垮
            </span>
          </div>
          <div className="bg-load-bar-wrap bg-rise" style={delay(2800)}>
            <div className="bg-load-bar bg-load-grow" style={delay(3200)} />
          </div>
          <div className="bg-load-axis mono bg-rise" style={delay(4400)}>
            <span>并发目标</span>
            <span>调度成本 ↑↑</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — asyncio 换路宣言 */
  if (step === 3) {
    return (
      <div className="scene-pad bg-scene bg-swap-scene">
        <div className="bg-head bg-rise">
          <span className="label-mono">asyncio · 换了一条路</span>
        </div>
        <div className="bg-swap">
          <div className="bg-swap-cell bg-swap-cell--no bg-rise" style={delay(400)}>
            <div className="bg-swap-kicker label-mono">不靠</div>
            <div className="bg-swap-word">
              更多线程
              <span className="bg-swap-strike" />
            </div>
            <div className="bg-swap-talk">线程越多，成本越高</div>
          </div>
          <div className="bg-swap-divider bg-rise" style={delay(900)}>／</div>
          <div className="bg-swap-cell bg-swap-cell--yes bg-rise" style={delay(1200)}>
            <div className="bg-swap-kicker label-mono">靠</div>
            <div className="bg-swap-word bg-swap-word--acc">单线程内的协作式调度</div>
            <div className="bg-swap-talk">协程在 await 点主动让出</div>
          </div>
        </div>
        <div className="bg-swap-lead bg-rise" style={delay(2200)}>
          两个新词，先说清楚
        </div>
      </div>
    );
  }

  /* step 4 — 两个新词：协程 / 事件循环 */
  if (step === 4) {
    return (
      <div className="scene-pad bg-scene">
        <div className="bg-defs">
          <div className="bg-def bg-rise" style={delay(150)}>
            <div className="bg-def-head">
              <span className="bg-def-name">协程</span>
              <span className="bg-def-en mono">coroutine</span>
            </div>
            <div className="bg-def-code mono">
              async <span className="bg-def-kw">def</span> task(): …
            </div>
            <div className="bg-def-line bg-def-line--pause">
              <span className="bg-def-dot bg-pop" style={delay(1100)} />
              <span className="bg-def-talk">在 <b>await 点暂停</b>，也能从暂停点恢复</span>
            </div>
          </div>
          <div className="bg-def bg-rise" style={delay(2200)}>
            <div className="bg-def-head">
              <span className="bg-def-name">事件循环</span>
              <span className="bg-def-en mono">event loop</span>
            </div>
            <div className="bg-def-loop">
              <span className="bg-def-node mono bg-pop" style={delay(2900)}>A</span>
              <span className="bg-def-node mono bg-pop" style={delay(3100)}>B</span>
              <span className="bg-def-node mono bg-pop" style={delay(3300)}>C</span>
            </div>
            <div className="bg-def-talk bg-def-talk--center">
              单线程里的<b>调度引擎</b>，在协程之间来回切换
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 5 — 同构迁移：零件重写，调度成本降到函数调用级 */
  return (
    <div className="scene-pad bg-scene">
      <div className="bg-head bg-rise">
        <span className="label-mono">同样的结构 · 搬进单线程世界</span>
      </div>
      <div className="bg-migrate">
        <div className="bg-mig-row bg-rise" style={delay(200)}>
          <span className="bg-mig-tag mono">线程版</span>
          <div className="bg-mig-flow bg-mig-flow--old">
            <span className="bg-mig-cell">生产者线程</span>
            <span className="bg-mig-arrow">→</span>
            <span className="bg-mig-cell mono">queue.Queue</span>
            <span className="bg-mig-arrow">→</span>
            <span className="bg-mig-cell">消费者线程</span>
          </div>
        </div>
        <div className="bg-mig-swap bg-rise" style={delay(1200)}>
          <span className="bg-mig-swap-line" />
          <span className="bg-mig-swap-word">零件重写成协程感知的版本</span>
          <span className="bg-mig-swap-line" />
        </div>
        <div className="bg-mig-row bg-rise" style={delay(1800)}>
          <span className="bg-mig-tag bg-mig-tag--acc mono">异步版</span>
          <div className="bg-mig-flow">
            <span className="bg-mig-cell bg-mig-cell--acc">生产者协程</span>
            <span className="bg-mig-arrow bg-mig-arrow--acc">→</span>
            <span className="bg-mig-cell bg-mig-cell--acc bg-mig-cell--code mono">asyncio.Queue</span>
            <span className="bg-mig-arrow bg-mig-arrow--acc">→</span>
            <span className="bg-mig-cell bg-mig-cell--acc">消费者协程</span>
          </div>
        </div>
      </div>
      <div className="bg-mig-cost bg-rise" style={delay(2800)}>
        <span className="label-mono">调度成本</span>
        <span className="bg-mig-cost-arrow">→</span>
        <span className="bg-mig-cost-val">函数调用级</span>
      </div>
    </div>
  );
}
