import { Fragment, type CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Legb.css";

/* inline animation-delay helper（毫秒） */
const at = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;
/* letter-stagger 序号 */
const letterAt = (i: number) => ({ "--i": i }) as CSSProperties;

/* ── LEGB 四格数据（article §What L10：Local → Enclosing → Global → Built-in） ── */
const CELLS = [
  { letter: "L", word: "Local" },
  { letter: "E", word: "Enclosing" },
  { letter: "G", word: "Global" },
  { letter: "B", word: "Built-in" },
] as const;

type CellState = "ghost" | "visited" | "lit";

/* legb_demo —— article L53-64 逐行（value="global" / "enclosing" / "local"） */
const DEMO_LINES: Array<{ s: string; c?: string }> = [
  { s: 'value = "global"' },
  { s: "" },
  { s: "def legb_demo():" },
  { s: '    value = "enclosing"', c: "lg-ln-enc" },
  { s: "" },
  { s: "    def inner():" },
  { s: '        value = "local"     # 就近遮蔽：这行删掉，才会读到 enclosing 层', c: "lg-ln-hit" },
  { s: "        return value" },
  { s: "" },
  { s: "    return inner(), value" },
];

/* 四格链：assemble = 骨架逐格装配态（step 1）；scan = 查找扫描线（step 5） */
function Chain({
  states,
  assemble,
  scan,
}: {
  states: CellState[];
  assemble?: boolean;
  scan?: boolean;
}) {
  return (
    <div className="lg-chain-wrap">
      <div className="lg-chain-row">
        {CELLS.map((cell, i) => (
          <Fragment key={cell.letter}>
            {i > 0 && (
              <div className="lg-conn">
                <i
                  className="lg-conn-line"
                  style={assemble ? at(560 + (i - 1) * 260) : undefined}
                />
                <span
                  className="lg-conn-head"
                  style={assemble ? at(800 + (i - 1) * 260) : undefined}
                >
                  {"→"}
                </span>
              </div>
            )}
            <div
              className={`lg-cell is-${states[i]}`}
              style={assemble ? at(320 + i * 260) : undefined}
            >
              <i className="lg-cell-bg" />
              <div className="lg-cell-face">
                <span className="hero-num lg-cell-letter">{cell.letter}</span>
                <span className="lg-cell-word">{cell.word}</span>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
      {scan && <div className="lg-scan" />}
    </div>
  );
}

export default function LegbChapter({ step }: ChapterStepProps) {
  /* step 0 — hero 问题句：一个名字，在某处，指向谁（wipe 分段揭示 + 绑定箭头自绘） */
  if (step === 0) {
    return (
      <div key={step} className="scene-pad lg-scene lg-hero-scene">
        <div className="label-mono lg-rise">{"PYTHON · CORE 21 · 作用域"}</div>
        <div className="lg-hero-block">
          <div className="lg-hero-line">
            <span className="lg-wipe" style={at(400)}>{"一个名字，"}</span>
            <span className="lg-wipe" style={at(900)}>{"在某处，"}</span>
          </div>
          <div className="lg-hero-line lg-hero-q">
            <span className="lg-wipe lg-wipe-slow lg-accent" style={at(1500)}>{"指向谁"}</span>
          </div>
        </div>
        <div className="lg-bind">
          <div className="label-mono lg-rise" style={at(2400)}>{"BINDING · 名字指向对象"}</div>
          <div className="lg-bind-row lg-rise" style={at(2600)}>
            <span className="lg-bind-name mono">{"name"}</span>
            <span className="lg-bind-line" />
            <span className="lg-bind-obj lg-pop" style={at(3400)}>{"object"}</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 四格链骨架逐格装配（连接线自绘，由内到外） */
  if (step === 1) {
    return (
      <div key={step} className="scene-pad lg-scene lg-skel-scene">
        <div className="label-mono lg-rise">{"LEGB · NAME LOOKUP CHAIN"}</div>
        <Chain states={["ghost", "ghost", "ghost", "ghost"]} assemble />
        <div className="lg-skel-caption lg-rise" style={at(2100)}>
          {"查找方向固定：由内 → 到外"}
        </div>
      </div>
    );
  }

  /* step 2 — L 点亮：横向墨色漫入 · Local · 当前函数内部 */
  if (step === 2) {
    return (
      <div key={step} className="scene-pad lg-scene lg-lit-l-scene">
        <Chain states={["lit", "ghost", "ghost", "ghost"]} />
        <div className="lg-focus">
          <div className="lg-station lg-rise">{"01 / 04"}</div>
          <div className="lg-focus-cn lg-focus-rise" style={at(800)}>{"当前函数内部"}</div>
          <div className="lg-focus-chip lg-pop" style={at(1050)}>{"函数体内，直接写下的名字"}</div>
        </div>
      </div>
    );
  }

  /* step 3 — E 点亮：落章定格 · Enclosing · 外层函数（L 转为已走过） */
  if (step === 3) {
    return (
      <div key={step} className="scene-pad lg-scene lg-lit-e-scene">
        <Chain states={["visited", "lit", "ghost", "ghost"]} />
        <div className="lg-focus">
          <div className="lg-station lg-rise" style={at(600)}>{"02 / 04"}</div>
          <div className="lg-focus-cn lg-focus-wipe" style={at(800)}>{"外层函数"}</div>
          <div className="lg-focus-chip lg-pop" style={at(1000)}>{"包裹它的那层函数"}</div>
        </div>
      </div>
    );
  }

  /* step 4 — G 点亮：自下而上漫入 · Global · 模块级（article L54 锚点） */
  if (step === 4) {
    return (
      <div key={step} className="scene-pad lg-scene lg-lit-g-scene">
        <Chain states={["visited", "visited", "lit", "ghost"]} />
        <div className="lg-focus">
          <div className="lg-station lg-rise" style={at(600)}>{"03 / 04"}</div>
          <div className="lg-focus-cn lg-focus-slide" style={at(800)}>{"模块级"}</div>
          <div className="lg-focus-chip lg-chip-code lg-pop" style={at(1050)}>
            <span className="mono">{'value = "global"   # 文件顶层'}</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 5 — B 点亮 + 查找扫描线扫过整链：从里往外找，找到就停 */
  if (step === 5) {
    return (
      <div key={step} className="scene-pad lg-scene lg-lit-b-scene">
        <Chain states={["visited", "visited", "visited", "lit"]} scan />
        <div className="lg-focus">
          <div className="lg-focus-rule lg-focus-rise" style={at(3700)}>
            {"从里往外找，"}<span className="lg-accent">{"找到就停"}</span>
          </div>
          <div className="lg-focus-chips">
            <span className="lg-chip mono lg-pop" style={at(4200)}>{"print"}</span>
            <span className="lg-chip mono lg-pop" style={at(4350)}>{"len"}</span>
            <span className="lg-chips-note lg-pop" style={at(4500)}>{"这些不用导入"}</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — legb_demo 代码卡 + 查找轨迹：enclosing 行被「就近遮蔽」蒙版盖住 */
  if (step === 6) {
    return (
      <div key={step} className="scene-pad lg-scene lg-code-scene">
        <div className="lg-code-layout">
          <div className="lg-code-card card lg-rise">
            <div className="lg-code-head">
              <span className="label-mono">{"legb_demo · scope_closure.py"}</span>
              <span className="badge-mono">{"demo"}</span>
            </div>
            <pre className="lg-code"><code>
              {DEMO_LINES.map((l, i) => (
                <span
                  key={i}
                  className={"lg-ln" + (l.c ? " " + l.c : "")}
                  style={l.c ? undefined : at(i * 80)}
                >
                  {l.s === "" ? " " : l.s}
                </span>
              ))}
            </code></pre>
          </div>
          <div className="lg-trace">
            <div className="label-mono lg-rise" style={at(1200)}>{"LOOKUP · inner() 读 value"}</div>
            <div className="lg-trace-card card lg-rise" style={at(1400)}>
              <div className="lg-tr-row lg-tr-hit lg-rise" style={at(2000)}>
                <span className="lg-tr-key">{"L"}</span>
                <span className="lg-tr-word mono">{"Local"}</span>
                <span className="lg-tr-val mono">{"'local'"}</span>
                <span className="lg-tr-badge lg-pop" style={at(2500)}>{"命中 · 就停"}</span>
              </div>
              <div className="lg-tr-row lg-tr-shadow lg-rise" style={at(2600)}>
                <span className="lg-tr-key">{"E"}</span>
                <span className="lg-tr-word mono">{"Enclosing"}</span>
                <span className="lg-tr-val mono">{"'enclosing'"}</span>
                <div className="lg-veil">
                  <span className="lg-veil-tag mono">{"就近遮蔽"}</span>
                  <span className="lg-veil-note">{"被自己那一层挡住"}</span>
                </div>
              </div>
              <div className="lg-tr-row lg-tr-skip lg-rise" style={at(3600)}>
                <span className="lg-tr-key">{"G"}</span>
                <span className="lg-tr-word mono">{"Global"}</span>
                <span className="lg-tr-val mono">{"'global'"}</span>
                <span className="lg-tr-badge lg-pop" style={at(4100)}>{"未到达"}</span>
              </div>
            </div>
            <div className="lg-output lg-rise" style={at(4400)}>
              <div className="lg-output-main mono">
                {"inner() → "}<b className="lg-accent">{"'local'"}</b>
              </div>
              <div className="lg-output-sub">
                {"外层自己的 value 不受影响: "}<span className="mono">{"'enclosing'"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 7 — 规矩卡：赋值即声明（新建 vs 改外层，判决图） */
  return (
    <div key={step} className="scene-pad lg-scene lg-rule-scene">
      <div className="label-mono lg-rise">{"THE ONE RULE · 规矩只有一条"}</div>
      <h1 className="lg-rule-hero">
        <span className="letter-stagger">
          <span className="letter" style={letterAt(0)}>{"赋"}</span>
          <span className="letter" style={letterAt(1)}>{"值"}</span>
          <span className="letter" style={letterAt(2)}>{"即"}</span>
          <span className="letter lg-accent" style={letterAt(3)}>{"声"}</span>
          <span className="letter lg-accent" style={letterAt(4)}>{"明"}</span>
        </span>
      </h1>
      <div className="lg-rule-en lg-wipe" style={at(800)}>{"Assignment is declaration"}</div>
      <div className="lg-verdict">
        <div className="lg-verdict-src">
          <div className="label-mono lg-rise" style={at(1500)}>{"函数里写下这行"}</div>
          <div className="lg-src-chip card lg-pop" style={at(1600)}>
            <span className="mono">{'value = "local"'}</span>
          </div>
        </div>
        <div className="lg-verdict-list">
          <div className="lg-verdict-row lg-rise" style={at(2100)}>
            <span className="lg-verdict-arrow mono">{"→"}</span>
            <div className="lg-v-box lg-v-old">
              <div className="lg-v-head">{"enclosing 层的 value"}</div>
              <div className="lg-v-code mono">{'value = "enclosing"'}</div>
            </div>
            <div className="lg-v-verdict">{"不是改外层 · 原值不动"}</div>
          </div>
          <div className="lg-verdict-row lg-rise" style={at(2700)}>
            <span className="lg-verdict-arrow mono">{"→"}</span>
            <div className="lg-v-box lg-v-new lg-pop" style={at(3400)}>
              <div className="lg-v-head">{"Local 层 · 新名字"}</div>
              <div className="lg-v-code mono">
                {'value = "local"'}
                <span className="badge-mono is-accent lg-pop" style={at(3900)}>{"new"}</span>
              </div>
            </div>
            <div className="lg-v-verdict lg-v-verdict-new">{"是新建一个局部名"}</div>
          </div>
        </div>
      </div>
      <div className="lg-rule-foot lg-rise" style={at(4600)}>
        {"要改外层变量，必须显式声明 —— "}<span className="mono">{"nonlocal"}</span>{" / "}<span className="mono">{"global"}</span>{"（后面讲）"}
      </div>
    </div>
  );
}
