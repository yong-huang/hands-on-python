import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* 终端窗口（steps 0~4 共用同一骨架，位置钉死） */
function Terminal({
  lines,
}: {
  lines: { text: string; state: "dim" | "hot"; sub?: string }[];
}) {
  return (
    <div className="ld-term">
      <div className="ld-term-bar">
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="ld-term-title mono">127.0.0.1 — async_fetcher.py</span>
      </div>
      <div className="ld-term-body mono">
        <div className="ld-term-prompt">
          <span className="ld-term-dollar">$</span> python3 async_fetcher.py
        </div>
        {lines.map((l) => (
          <div key={l.text} className={`ld-term-line ld-term-line--${l.state}`}>
            {l.text}
            {l.sub && <span className="ld-term-sub">{l.sub}</span>}
          </div>
        ))}
        <div className="ld-term-line ld-term-line--dim">……</div>
      </div>
    </div>
  );
}

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 跑实验 */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Terminal lines={[]} />
        <div className="ld-run-note ld-rise" style={delay(1400)}>
          一行命令 · <b className="ld-accent hero-num">5</b> 秒出结果
        </div>
      </div>
    );
  }

  /* step 1 — 服务端内置说明（终端 + 四枚注记） */
  if (step === 1) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Terminal lines={[]} />
        <div className="ld-badges">
          <span className="ld-badge ld-pop" style={delay(500)}>
            服务端内置
          </span>
          <span className="ld-badge ld-pop" style={delay(1100)}>
            50 个接口
          </span>
          <span className="ld-badge ld-pop" style={delay(1700)}>
            延迟 30-80ms
          </span>
          <span className="ld-badge ld-badge--key ld-pop" style={delay(2300)}>
            全程本地 · 断网能跑
          </span>
        </div>
      </div>
    );
  }

  /* step 2 — 串行行 */
  if (step === 2) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Terminal
          lines={[
            {
              text: "串行:   50/50 成功，65 次请求，3.60s",
              state: "hot",
            },
          ]}
        />
        <div className="ld-line-note ld-rise" style={delay(1500)}>
          <span className="label-mono">串行</span>
          一笔一笔抓 —— <b className="ld-accent">3.60 秒</b>
        </div>
      </div>
    );
  }

  /* step 3 — 线程池行 */
  if (step === 3) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Terminal
          lines={[
            { text: "串行:   50/50 成功，65 次请求，3.60s", state: "dim" },
            { text: "线程池: 50/50 成功，0.43s", state: "hot" },
          ]}
        />
        <div className="ld-line-note ld-rise" style={delay(1200)}>
          <span className="label-mono">线程池</span>
          10 路并发 —— <b className="ld-accent">0.43 秒</b>
        </div>
      </div>
    );
  }

  /* step 4 — 异步行 */
  if (step === 4) {
    return (
      <div className="scene-pad ld-scene ld-run-scene">
        <Terminal
          lines={[
            { text: "串行:   50/50 成功，65 次请求，3.60s", state: "dim" },
            { text: "线程池: 50/50 成功，0.43s", state: "dim" },
            {
              text: "异步:   50/50 成功，65 次请求，0.42s",
              state: "hot",
              sub: "（首次失败 15 个，重试全部成功）",
            },
          ]}
        />
        <div className="ld-line-note ld-rise" style={delay(2400)}>
          <span className="label-mono">异步</span>
          单线程 —— <b className="ld-accent">0.42 秒</b>，还不占线程
        </div>
      </div>
    );
  }

  /* step 5 — 65 之账 */
  if (step === 5) {
    return (
      <div className="scene-pad ld-scene ld-account-scene">
        <div className="ld-account-title ld-rise">串行为什么也打了 65 次请求？</div>
        <div className="ld-account-eq">
          <span className="ld-account-num hero-num ld-pop" style={delay(600)}>
            65
          </span>
          <span className="ld-account-op ld-rise" style={delay(1400)}>
            =
          </span>
          <span className="ld-account-part ld-pop" style={delay(1900)}>
            <b className="hero-num">50</b>
            <i>正常请求</i>
          </span>
          <span className="ld-account-op ld-rise" style={delay(2600)}>
            +
          </span>
          <span className="ld-account-part ld-account-part--retry ld-pop" style={delay(3100)}>
            <b className="hero-num">15</b>
            <i>首败重试</i>
          </span>
        </div>
        <div className="ld-account-note ld-rise" style={delay(4200)}>
          15 个不稳定端点在它手里失败过 —— 它也老老实实重试了
        </div>
      </div>
    );
  }

  /* step 6 — 恢复率 100% */
  if (step === 6) {
    return (
      <div className="scene-pad ld-scene ld-recover-scene">
        <div className="ld-recover-hero">
          <span className="ld-recover-num hero-num ld-pop" style={delay(300)}>
            100%
          </span>
          <span className="ld-recover-label ld-rise" style={delay(1000)}>
            重试恢复率
          </span>
        </div>
        <div className="ld-recover-strip">
          {Array.from({ length: 15 }, (_, i) => (
            <span key={i} className="ld-recover-cell ld-pop" style={delay(1600 + i * 110)}>
              {"✓\uFE0E"}
            </span>
          ))}
        </div>
        <div className="ld-recover-note ld-rise" style={delay(3400)}>
          15 个不稳定端点 —— <b className="ld-accent">一个没丢</b>
        </div>
      </div>
    );
  }

  /* step 7 — 打平解释（fallthrough 收尾） */
  return (
    <div className="scene-pad ld-scene ld-tie-scene">
      <div className="ld-tie-headline ld-rise">
        只快 <b className="hero-num">0.01s</b> —— 10 个并发，拉不开差距
      </div>
      <div className="ld-tie-verdict ld-pop" style={delay(1800)}>
        几百甚至几千路 —— 才见真章
      </div>
      <div className="ld-tie-row">
        <div className="ld-tie-card ld-pop" style={delay(3400)}>
          <div className="ld-tie-card-tag mono">对串行</div>
          <div className="ld-tie-card-text">
            <b className="ld-accent hero-num">8.6 倍</b> 快
          </div>
        </div>
        <div className="ld-tie-card ld-tie-card--thread ld-pop" style={delay(4500)}>
          <div className="ld-tie-card-tag mono">对线程池</div>
          <div className="ld-tie-card-text">同速 —— 但只有<b className="ld-accent">一个线程</b></div>
        </div>
      </div>
    </div>
  );
}
