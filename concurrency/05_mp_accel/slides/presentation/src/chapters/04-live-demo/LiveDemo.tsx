import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 终端窗口外壳（本章复用）。 */
function Term({ children, title = "mp_accel.py" }: { children: ReactNode; title?: string }) {
  return (
    <div className="ld-term">
      <div className="ld-term-head">
        <span className="ld-dot" />
        <span className="ld-dot" />
        <span className="ld-dot" />
        <span className="ld-term-title mono">{title}</span>
      </div>
      <div className="ld-term-body">{children}</div>
    </div>
  );
}

/** 三跑法时间条数据（宽按 0.660 归一）。 */
const BARS = [
  { label: "串行 4 连跑", sec: "0.492s", w: 74, tone: "dim" },
  { label: "Pool(4)", sec: "0.197s", w: 30, tone: "best" },
  { label: "threading(4)", sec: "0.660s", w: 100, tone: "worst" },
] as const;

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 命令 + 小节目录 */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene">
        <Term>
          <div className="ld-line ld-cmd ld-rise">
            <span className="ld-prompt mono">$</span> python3 mp_accel.py
          </div>
          <div className="ld-sections">
            {[
              ["[1]", "环境探测"],
              ["[2]", "CPU 密集加速比：串行 vs Pool(4)"],
              ["[3]", "spawn 的 __main__ 保护"],
              ["[4]", "pool.map 保序验证"],
            ].map(([n, t], i) => (
              <div className="ld-line ld-section ld-rise" style={delay(400 + i * 380)} key={n}>
                <span className="mono ld-sec-no">{n}</span> {t}
              </div>
            ))}
          </div>
        </Term>
        <div className="ld-note ld-rise" style={delay(2000)}>
          <span className="label-mono">说明</span>
          四个小节 + 全部断言，跑完自动核对结果
        </div>
      </div>
    );
  }

  /* step 1~3 — [2] 加速比：串行条先落，每步新增一根，旧条灰化保留 */
  if (step === 1 || step === 2 || step === 3) {
    const shown = BARS.slice(0, step);
    const active = step - 1;
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-kicker ld-rise">
          <span className="label-mono">[2] CPU 密集加速比 · 150,000 素数 × 4 任务</span>
        </div>
        <Term>
          {shown.map((b, i) => {
            const isNew = i === active;
            return (
              <div className={`ld-bench${isNew ? " ld-bench--on" : " ld-bench--old"}`} key={b.label}>
                <div className={`ld-bench-line${isNew ? " ld-rise" : ""}`}>
                  <span className="mono ld-bench-name">{b.label}</span>
                  <span className="mono ld-bench-sec">{b.sec}</span>
                  {i === 1 && (
                    <span className={`ld-bench-mult${isNew ? " ld-rise" : ""}`} style={delay(isNew ? 600 : 0)}>
                      2.50× 加速
                    </span>
                  )}
                  {i === 2 && (
                    <span
                      className={`ld-bench-mult ld-bench-mult--bad${isNew ? " ld-rise" : ""}`}
                      style={delay(isNew ? 600 : 0)}
                    >
                      0.75×，不加速
                    </span>
                  )}
                </div>
                <div className="ld-bench-track">
                  <div
                    className={`ld-bench-bar ld-bench-bar--${b.tone}${isNew ? " ld-grow" : ""}`}
                    style={{ ...delay(isNew ? (i === 0 ? 300 : 900) : 0), width: `${b.w}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Term>
        {step === 2 && (
          <div className="ld-note ld-rise" style={delay(1700)}>
            <span className="label-mono">白话</span>
            4 个核真的同时干活了
          </div>
        )}
      </div>
    );
  }

  /* step 4 — 结论行 + 迷你回顾 */
  if (step === 4) {
    return (
      <div className="scene-pad ld-scene ld-concl-scene">
        <div className="ld-concl-kicker ld-rise">
          <span className="label-mono">结论</span>
        </div>
        <h1 className="ld-concl ld-rise" style={delay(300)}>
          每个进程一把<em>独立 GIL</em>，字节码<em>真并行</em>
        </h1>
        <div className="ld-mini">
          {BARS.map((b, i) => (
            <div className="ld-mini-row" key={b.label}>
              <span className="ld-mini-name mono ld-rise" style={delay(900 + i * 300)}>{b.label}</span>
              <div className="ld-mini-track">
                <div
                  className={`ld-mini-bar ld-mini-bar--${b.tone} ld-grow`}
                  style={{ ...delay(1000 + i * 300), width: `${b.w}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 5 — [3] main 保护定义 + 现象首行 */
  if (step === 5) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-kicker ld-rise">
          <span className="label-mono">[3] spawn 的 __main__ 保护 · 违反会怎样</span>
        </div>
        <Term>
          <div className="ld-line ld-cmd ld-rise" style={delay(300)}>
            <span className="ld-prompt mono">$</span> 故意漏写 main 保护，跑一下
          </div>
        </Term>
        <div className="ld-defcard ld-rise" style={delay(900)}>
          <div className="ld-defcard-name mono">if __name__ == &apos;__main__&apos;</div>
          <div className="ld-defcard-gloss">
            main 保护 ＝ 只有<em>主程序本人</em>，才执行启动代码
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 表面一切正常 */
  if (step === 6) {
    return (
      <div className="scene-pad ld-scene">
        <Term>
          <div className="ld-line ld-rise">
            <span className="ld-prompt mono">$</span> 父进程退出码 0
          </div>
          <div className="ld-line ld-okline ld-rise" style={delay(500)}>
            stdout = <span className="ld-ok">&apos;OK 1&apos;</span>
          </div>
        </Term>
        <div className="ld-fine ld-rise" style={delay(1300)}>
          ← 看起来<em>一切正常</em>！
        </div>
      </div>
    );
  }

  /* step 7 — stderr 真相层 */
  if (step === 7) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-kicker ld-rise">
          <span className="label-mono">真相在另一路输出 · stderr</span>
        </div>
        <Term title="stderr">
          <div className="ld-err ld-rise">
            RuntimeError: ...before the current process has finished
            <br />its <b>bootstrapping phase</b>...
          </div>
          <div className="ld-line ld-rise" style={delay(900)}>
            子进程启动 → 重新加载主文件 → <em>启动代码又执行了一遍</em>
          </div>
          <div className="ld-line ld-errline ld-rise" style={delay(1700)}>
            子进程 exitcode = 1，带伤退场
          </div>
        </Term>
      </div>
    );
  }

  /* step 8 — 标语：崩溃会喊，静默失败不喊 */
  if (step === 8) {
    return (
      <div className="scene-pad ld-scene ld-slogan-scene">
        <h1 className="ld-slogan ld-rise">
          崩溃会<em>喊</em>，静默失败<em>不喊</em>
        </h1>
        <div className="ld-slogan-sub ld-rise" style={delay(800)}>
          worker 的结果悄悄丢了——父进程毫不知情
        </div>
      </div>
    );
  }

  /* step 9~10 — [4] 保序验证 */
  const ORDER = ["0.3", "0.1", "0.2", "0.05"];
  if (step === 9) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-kicker ld-rise">
          <span className="label-mono">[4] pool.map 保序 · 最慢的任务排第一个</span>
        </div>
        <div className="ld-order">
          <div className="ld-order-row">
            <div className="ld-order-label ld-rise">输入</div>
            {ORDER.map((s, i) => (
              <div
                className={`ld-order-chip${i === 0 ? " ld-order-chip--slow" : ""} ld-pop`}
                style={delay(300 + i * 260)}
                key={i}
              >
                <span className="mono ld-order-sec">{s}s</span>
                {i === 0 && <span className="ld-order-slow">最慢</span>}
              </div>
            ))}
          </div>
          <div className="ld-order-map ld-rise" style={delay(1500)}>
            <span className="mono">pool.map</span> ↓
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="scene-pad ld-scene">
      <div className="ld-order">
        <div className="ld-order-row">
          <div className="ld-order-label ld-rise">返回</div>
          {ORDER.map((s, i) => (
            <div className="ld-order-chip ld-order-chip--back ld-pop" style={delay(200 + i * 300)} key={i}>
              <span className="mono ld-order-sec">{s}s</span>
            </div>
          ))}
        </div>
        <div className="ld-order-same ld-rise" style={delay(1500)}>
          跟输入<em>一模一样</em>
        </div>
        <hr className="rule ld-order-rule ld-rise" style={delay(1900)} />
        <div className="ld-order-time ld-rise" style={delay(2100)}>
          总耗时 <span className="mono">0.35s</span> ≈ 最慢那一个 <span className="mono">0.3s</span>
        </div>
      </div>
      <div className="ld-slogan ld-order-tagline ld-rise" style={delay(2600)}>
        真并行，<em>不是排队</em>
      </div>
    </div>
  );
}
