import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

/**
 * ch01 · hook — 片头标题页 + 一个 with 治「忘了还」（4 steps）
 *
 * step 0  片头标题页
 * step 1  打开 → 读取 → 关闭，正常路径逐段点亮
 * step 2  异常腰斩：close 永远执行不到
 * step 3  with 登场，点名「上下文管理器」
 */

const FLOW = [
  {
    ord: "01",
    verb: "打开",
    en: "open",
    code: 'f = open("data.txt")',
  },
  {
    ord: "02",
    verb: "读取",
    en: "read",
    code: "data = f.read()",
  },
  {
    ord: "03",
    verb: "关闭",
    en: "close",
    code: "f.close()",
  },
];

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · Context Manager</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            <span className="hk-title-em">出场</span>动作
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            Python 上下文管理器 · 是什么 · 为什么需要它
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "1000ms" }}>
          <div className="hk-tb-row">
            <span>Subj</span>
            <b>context-manager</b>
          </div>
          <div className="hk-tb-row">
            <span>Repo</span>
            <b>hands-on-python</b>
          </div>
          <div className="hk-tb-row">
            <span>Lab</span>
            <b>core / 02</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 正常路径：三步流水线逐段点亮 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-flow-scene">
        <div className="hk-flow-head hk-rise">
          <span className="hk-flow-dot" />
          file_io.py — 一段再正常不过的代码
        </div>

        <div className="hk-flow">
          {FLOW.map((f, i) => (
            <div key={f.ord} className="hk-flow-unit">
              {i > 0 && (
                <span
                  className="hk-flow-arrow"
                  style={{ animationDelay: `${500 + i * 800}ms` }}
                >
                  →
                </span>
              )}
              <div className="hk-stepcard hk-rise" style={{ animationDelay: `${120 + i * 60}ms` }}>
                <div className="hk-stepcard-bar">
                  <span className="hk-stepcard-ord">{f.ord}</span>
                  {f.verb} · <span className="hk-stepcard-en">{f.en}</span>
                </div>
                <pre className="hk-stepcard-code">{f.code}</pre>
                <span className="hk-stepcard-ok" style={{ animationDelay: `${700 + i * 800}ms` }}>
                  OK
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hk-flow-foot hk-rise" style={{ animationDelay: "2900ms" }}>
          三步，<b>天经地义</b>
        </div>
      </div>
    );
  }

  /* step 2 — 异常腰斩：close 永远执行不到 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-flow-scene hk-crash-scene">
        <div className="hk-flow-head hk-rise">
          <span className="hk-flow-dot hk-flow-dot-alarm" />
          file_io.py — 运行中
        </div>

        <div className="hk-flow">
          <div className="hk-flow-unit">
            <div className="hk-stepcard hk-stepcard-done hk-rise" style={{ animationDelay: "100ms" }}>
              <div className="hk-stepcard-bar">
                <span className="hk-stepcard-ord">01</span>
                打开 · <span className="hk-stepcard-en">open</span>
              </div>
              <pre className="hk-stepcard-code">{FLOW[0]!.code}</pre>
              <span className="hk-stepcard-ok hk-ok-now">OK</span>
            </div>
          </div>

          <span className="hk-flow-arrow hk-arrow-now">→</span>

          <div className="hk-flow-unit">
            <div className="hk-stepcard hk-stepcard-done hk-rise" style={{ animationDelay: "220ms" }}>
              <div className="hk-stepcard-bar">
                <span className="hk-stepcard-ord">02</span>
                读取 · <span className="hk-stepcard-en">read</span>
              </div>
              <pre className="hk-stepcard-code">{FLOW[1]!.code}</pre>
              <span className="hk-stepcard-ok hk-ok-now">OK</span>
            </div>
          </div>

          <span className="hk-flow-break hk-rise" style={{ animationDelay: "700ms" }}>
            ✕
          </span>

          <div className="hk-flow-unit">
            <div className="hk-stepcard hk-stepcard-dead hk-rise" style={{ animationDelay: "300ms" }}>
              <div className="hk-stepcard-bar">
                <span className="hk-stepcard-ord">03</span>
                关闭 · <span className="hk-stepcard-en">close</span>
              </div>
              <pre className="hk-stepcard-code">{FLOW[2]!.code}</pre>
              <div className="hk-dead-stamp hk-stamp-in" style={{ animationDelay: "1500ms" }}>
                永远执行不到
              </div>
            </div>
          </div>
        </div>

        <div className="hk-trace hk-pop" style={{ animationDelay: "1000ms" }}>
          <div className="hk-trace-bar">Traceback (most recent call last)</div>
          <pre className="hk-trace-code">{`  File "file_io.py", line 2, in <module>
ValueError: invalid data`}</pre>
        </div>

        <div className="hk-flow-foot hk-rise" style={{ animationDelay: "2100ms" }}>
          函数当场中断，<b>写在最后的 close 成了摆设</b>
        </div>
      </div>
    );
  }

  /* step 3 — with 登场 */
  return (
    <div className="scene-pad hk-scene hk-with-scene">
      <div className="hk-with-box">
        <span className="hk-corner hk-corner-nw" />
        <span className="hk-corner hk-corner-ne" />
        <span className="hk-corner hk-corner-sw" />
        <span className="hk-corner hk-corner-se" />
        <span className="hk-with-sym">with</span>
      </div>
      <div className="hk-with-copy">
        <div className="kicker hk-rise">治这个的，是一个关键字</div>
        <div className="hk-with-big hk-rise" style={{ animationDelay: "400ms" }}>
          一个 <span className="hk-with-em">with</span>
        </div>
        <div className="hk-with-plate hk-rise" style={{ animationDelay: "1600ms" }}>
          它背后的机制，叫<b>上下文管理器</b>
        </div>
      </div>
    </div>
  );
}
