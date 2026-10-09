import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — Q1：等待成本为零（时间表对照） */
  if (step === 0) {
    return (
      <div className="scene-pad qa-scene qa-zero-scene">
        <div className="qa-question qa-rise">
          异步到底快在哪？—— <b className="qa-accent">等待成本为零</b>
        </div>
        <div className="qa-zero-rows">
          <div className="qa-zero-row">
            <span className="qa-zero-tag mono">串行 · 累加</span>
            <span className="qa-zero-track">
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} className="qa-zero-seg qa-grow" style={delay(700 + i * 45)} />
              ))}
            </span>
            <span className="qa-zero-val hero-num qa-rise" style={delay(2200)}>
              3.6s
            </span>
          </div>
          <div className="qa-zero-row">
            <span className="qa-zero-tag mono">异步 · 重叠</span>
            <span className="qa-zero-track">
              <span className="qa-zero-bar qa-grow" style={delay(3200)} />
            </span>
            <span className="qa-zero-val qa-zero-val--win hero-num qa-rise" style={delay(3900)}>
              0.4s
            </span>
          </div>
        </div>
        <div className="qa-zero-note qa-rise" style={delay(4700)}>
          50 段等待叠在<b className="qa-accent">同一张时间表</b>上 —— CPU 的计算，一分钱也省不了
        </div>
      </div>
    );
  }

  /* step 1 — 比线程快吗 */
  if (step === 1) {
    return (
      <div className="scene-pad qa-scene qa-thread-scene">
        <div className="qa-thread-q qa-rise">比线程快吗？—— 同样并发下，<b className="qa-accent">打平</b></div>
        <div className="qa-thread-row">
          <div className="qa-thread-card qa-pop" style={delay(1300)}>
            <div className="qa-thread-num hero-num">上万</div>
            <div className="qa-thread-name">协程</div>
          </div>
          <div className="qa-thread-vs mono qa-rise" style={delay(2200)}>
            vs
          </div>
          <div className="qa-thread-card qa-pop" style={delay(2700)}>
            <div className="qa-thread-num hero-num">几十</div>
            <div className="qa-thread-name">线程 · 到顶</div>
          </div>
        </div>
        <div className="qa-thread-verdict qa-rise" style={delay(3800)}>
          优势不在快，在<b className="qa-accent">便宜</b>
        </div>
      </div>
    );
  }

  /* step 2 — Q2：连接池 vs 信号量 */
  if (step === 2) {
    return (
      <div className="scene-pad qa-scene qa-pool-scene">
        <div className="qa-pool-question qa-rise">
          <span className="mono qa-pool-name">aiohttp</span> 自带连接池 —— 为什么还要信号量？
        </div>
        <div className="qa-pool-row">
          <div className="qa-pool-card qa-pop" style={delay(900)}>
            <div className="qa-pool-card-tag mono">连接池</div>
            <div className="qa-pool-card-line">手里备几条通道 · 反复用</div>
            <div className="qa-pool-card-sub">只管「备货」</div>
          </div>
          <div className="qa-pool-card qa-pool-card--key qa-pop" style={delay(2400)}>
            <div className="qa-pool-card-tag mono">信号量</div>
            <div className="qa-pool-card-line">同时几件活在路上</div>
            <div className="qa-pool-card-sub">建通道 · 发数据 · 等回话，全程算</div>
          </div>
        </div>
        <div className="qa-pool-verdict qa-rise" style={delay(4300)}>
          服务器怕的是<b className="qa-accent">后者</b> —— 限流是主动保护，连接池只是省自己的资源
        </div>
      </div>
    );
  }

  /* step 3 — Q3：为什么指数退避 */
  if (step === 3) {
    return (
      <div className="scene-pad qa-scene qa-backoff-scene">
        <div className="qa-question qa-rise">
          重试为什么用<b className="qa-accent">指数退避</b>，不立即重试？
        </div>
        <div className="qa-backoff-line">
          <span className="qa-backoff-marker qa-pop" style={delay(900)}>
            服务刚抖动
          </span>
          <span className="qa-backoff-track qa-grow" style={delay(1400)} />
        </div>
        <div className="qa-backoff-row">
          <div className="qa-backoff-card qa-backoff-card--bad qa-pop" style={delay(2300)}>
            <div className="qa-backoff-tag mono">立即重试</div>
            <div className="qa-backoff-text">火上浇油 → 重试风暴</div>
          </div>
          <div className="qa-backoff-card qa-pop" style={delay(3600)}>
            <div className="qa-backoff-tag mono">退避几十毫秒</div>
            <div className="qa-backoff-text">给服务留<b className="qa-accent">恢复窗口</b></div>
          </div>
        </div>
        <div className="qa-backoff-note qa-rise" style={delay(5400)}>
          本实验一次就够 —— 退避，是为真实世界<b className="qa-accent">反复抖</b>的服务准备的
        </div>
      </div>
    );
  }

  /* step 4 — 收尾（fallthrough） */
  return (
    <div className="scene-pad qa-scene qa-end-scene">
      <div className="qa-end-repo mono qa-rise">
        hands-on-python / concurrency / 11_async_fetcher
      </div>
      <div className="qa-end-note qa-rise" style={delay(1200)}>
        完整代码在仓库 —— 装一个 <span className="mono qa-end-lib">aiohttp</span> 就能跑
      </div>
      <div className="qa-end-rule rule-grow in" style={delay(2200)} />
      <div className="qa-end-bye qa-rise" style={delay(2800)}>
        链接在评论区 · 下期见
      </div>
    </div>
  );
}
