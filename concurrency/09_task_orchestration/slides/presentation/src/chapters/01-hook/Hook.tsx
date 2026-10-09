import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三个坑（递进列表；talk 行来自 script.md 对应拍）。 */
const PITS = [
  { ord: "01", name: "失败静默", talk: "出了错，没人知道" },
  { ord: "02", name: "卡死无人取消", talk: "一个任务卡住，没人叫停" },
  { ord: "03", name: "退出留孤儿", talk: "任务被销毁了，可它还没跑完" },
] as const;

/** 十个并发请求（第 3 个引爆）。 */
const URLS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad ho-scene ho-title-scene">
        <div className="ho-title-center">
          <div className="label-mono ho-rise">PYTHON · CONCURRENCY 09</div>
          <hr className="rule ho-title-rule ho-rise" style={delay(160)} />
          <h1 className="ho-title-main ho-rise" style={delay(300)}>
            任务<span className="ho-title-accent">编排</span>
          </h1>
          <div className="ho-title-en ho-rise" style={delay(560)}>
            Task Orchestration
          </div>
          <div className="ho-title-sub ho-rise" style={delay(760)}>
            挂出去的并发任务，谁来管它们的生死
          </div>
        </div>
        <div className="ho-titleblock ho-rise" style={delay(1000)}>
          <div className="ho-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="ho-tb-row"><span>Lab</span><b>concurrency / 09</b></div>
          <div className="ho-tb-row"><span>API</span><b>TaskGroup · wait_for · gather</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 背景一句：create_task 挂上事件循环 + 遗留问题 */
  if (step === 1) {
    return (
      <div className="scene-pad ho-scene">
        <div className="ho-head ho-rise">
          <span className="label-mono">背景 · 基础动作</span>
          <span className="mono ho-head-code">create_task</span>
        </div>
        <div className="ho-loop-wrap">
          <div className="ho-loop-stage ho-rise" style={delay(220)}>
            <svg className="ho-loop-ring" viewBox="0 0 520 380" aria-hidden>
              <ellipse cx="260" cy="190" rx="230" ry="150" fill="none" stroke="var(--rule)" strokeWidth="1.5" strokeDasharray="7 9" />
              <text x="260" y="200" textAnchor="middle" className="ho-loop-label">事件循环</text>
              <text x="260" y="228" textAnchor="middle" className="ho-loop-sub">单线程 · 调度所有协程的管家</text>
            </svg>
            <div className="ho-task-chip ho-chip-a ho-rise" style={delay(700)}><b>任务 A</b><span>抓取</span></div>
            <div className="ho-task-chip ho-chip-b ho-rise" style={delay(900)}><b>任务 B</b><span>抓取</span></div>
            <div className="ho-task-chip ho-chip-c ho-rise" style={delay(1100)}><b>任务 C</b><span>抓取</span></div>
          </div>
          <div className="ho-question ho-rise" style={delay(1500)}>
            万一<b>跑丢了一个</b>，怎么办？
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 糟心的事：10 个网址并发，第 3 个抛异常 */
  if (step === 2) {
    return (
      <div className="scene-pad ho-scene">
        <div className="ho-head ho-rise">
          <span className="label-mono">现场 · 批量抓取</span>
          <span className="mono ho-head-code">10 个网址 · 并发</span>
        </div>
        <div className="ho-url-grid">
          {URLS.map((n) => (
            <div
              key={n}
              className={`ho-url-card ho-rise ${n === 3 ? "ho-url-bad" : ""}`}
              style={delay(160 + n * 70)}
            >
              <span className="ho-url-num mono">{String(n).padStart(2, "0")}</span>
              {n === 3 ? (
                <span className="ho-url-state ho-stamp">✕ 报错</span>
              ) : (
                <span className="ho-url-state">等待中…</span>
              )}
            </div>
          ))}
        </div>
        <div className="ho-waste ho-rise" style={delay(1350)}>
          剩下 9 个还没返回——<b>白白浪费好几秒</b>
        </div>
      </div>
    );
  }

  /* step 3 — 错误去向：安静躺在任务对象里，日志什么都没有 */
  if (step === 3) {
    return (
      <div className="scene-pad ho-scene">
        <div className="ho-head ho-rise">
          <span className="label-mono">现场 · 错误去哪了</span>
        </div>
        <div className="ho-lost-wrap">
          <div className="ho-taskcard ho-rise" style={delay(220)}>
            <div className="ho-taskcard-head mono">Task #3</div>
            <div className="ho-taskcard-body">
              <div className="ho-exc-badge ho-stamp mono">ValueError</div>
              <div className="ho-taskcard-note">异常安静地躺在里面</div>
            </div>
            <div className="ho-taskcard-foot">没人 await 它 · 没人来收</div>
          </div>
          <div className="ho-logcard ho-rise" style={delay(520)}>
            <div className="ho-log-head mono">终端日志</div>
            <div className="ho-log-body mono">
              <div>$ python3 crawl.py</div>
              <div className="ho-log-line"> </div>
              <div className="ho-log-line"> </div>
              <div className="ho-log-empty">（空）</div>
            </div>
            <div className="ho-taskcard-foot">程序看不出来 · 日志什么都没有</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4~6 — 三坑递进列表：1 项 = 1 step，前行灰化保留 */
  if (step === 4 || step === 5 || step === 6) {
    const active = step - 4;
    return (
      <div className="scene-pad ho-scene">
        <div className="ho-head ho-rise">
          <span className="label-mono">三个坑 · 常见</span>
          <span className="mono ho-head-ord">{PITS[active].ord} / 03</span>
        </div>
        <div className="ho-pit-list">
          {PITS.map((p, i) => (
            <div
              key={p.ord}
              className={`ho-pit-row ${i === active ? "is-active ho-rise" : i < active ? "is-past ho-pit-past" : "is-future"}`}
              style={i === active ? delay(200) : undefined}
            >
              <span className="mono ho-pit-ord">{p.ord}</span>
              <span className="ho-pit-name">{p.name}</span>
              <span className="ho-pit-talk">{p.talk}</span>
              {i === 2 && i === active && (
                <span className="badge-mono ho-pit-warn mono">Task was destroyed but it is pending</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 7 — 收束：三个坑同一个根 */
  return (
    <div className="scene-pad ho-scene ho-root-scene">
      <div className="label-mono ho-rise">三个坑 · 同一个根</div>
      <hr className="rule ho-root-rule ho-rise" style={delay(160)} />
      <div className="ho-root-hero ho-rise" style={delay(340)}>
        任务的<span className="ho-title-accent">生命周期</span>，没人负责
      </div>
      <div className="ho-root-sub ho-rise" style={delay(900)}>
        挂出去之后全靠自己管。管，又没有章法。
      </div>
      <div className="ho-root-pits ho-rise" style={delay(1200)}>
        <span>失败静默</span>
        <span>卡死无人取消</span>
        <span>退出留孤儿</span>
      </div>
    </div>
  );
}
