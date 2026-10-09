import type { ChapterStepProps } from "../../registry/types";
import "./ClosureCell.css";

/**
 * ch03 · closure-cell — 自由变量与 cell（5 steps）。
 * 组件是 step 的纯函数：每个 step 返回不同根场景类，保证动画重挂载。
 */
export default function ClosureCellChapter({ step }: ChapterStepProps) {
  /* step 0 — 「自由变量」命名卡：内层引用外层变量，变量被打上标签 */
  if (step === 0) {
    return (
      <div className="scene-pad cc-scene cc-name-scene">
        <div className="cc-code-card card cc-rise">
          <div className="cc-code-head">
            <span className="label-mono">make_counter.py</span>
            <span className="label-mono">批注视图</span>
          </div>
          <pre className="cc-code"><code>
            <span className="cc-ln">{"def make_counter():"}</span>
            <span className="cc-ln"><span>{"    "}</span><span className="cc-var cc-var-out">{"count"}</span><span>{" = 0"}</span></span>
            <span className="cc-ln">{"    def counter():"}</span>
            <span className="cc-ln"><span>{"        "}</span><span className="cc-var cc-var-in">{"count"}</span><span>{" += 1"}</span></span>
            <span className="cc-ln"><span>{"        return "}</span><span className="cc-var cc-var-in">{"count"}</span></span>
            <span className="cc-ln">{"    return counter"}</span>
          </code></pre>
        </div>
        <div className="cc-name-side">
          <div className="label-mono cc-rise" style={{ animationDelay: "1300ms" }}>内层函数引用的外层变量</div>
          <hr className="rule cc-name-rule" />
          <div className="cc-name-main cc-rise" style={{ animationDelay: "1500ms" }}>自由变量</div>
          <div className="cc-name-en cc-rise" style={{ animationDelay: "1700ms" }}>free variable</div>
          <div className="cc-name-gloss cc-rise" style={{ animationDelay: "2300ms" }}>
            内层函数<b>引用</b>、却定义在外层函数里的变量。
          </div>
          <div className="cc-name-def cc-rise" style={{ animationDelay: "3000ms" }}>
            闭包 = 内层函数 + 它引用的外层变量（自由变量）的打包对象
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 签名画面：栈帧销毁，count 被打包进 cell、跟着 counter 被带走 */
  if (step === 1) {
    return (
      <div className="scene-pad cc-scene cc-journey-scene">
        <div className="cc-journey-head cc-rise">
          <span className="cc-journey-title">外层函数返回之后</span>
          <span className="cc-journey-sub">{"make_counter() → return counter"}</span>
        </div>
        <div className="cc-canvas">
          {/* 左：栈帧（先立后灭） */}
          <div className="cc-frame">
            <div className="cc-frame-head">
              <span className="label-mono">make_counter 栈帧</span>
              <span className="cc-frame-status">已销毁</span>
            </div>
            <div className="cc-slot">
              <span className="cc-slot-label">{"count"}</span>
            </div>
            <div className="cc-frame-foot label-mono">外层局部名 · 仅此一个</div>
          </div>
          {/* 中：cell 容器（打包） */}
          <div className="cc-cell">
            <span className="cc-cell-head">{"cell"}</span>
            <span className="cc-cell-sub label-mono">打包对象</span>
          </div>
          {/* 变量本身：从槽位出发，被装进 cell */}
          <div className="cc-tile">
            <span className="cc-tile-name">{"count"}</span>
            <span className="cc-tile-val">{"0"}</span>
          </div>
          {/* 右：counter 函数对象，cell 挂在 __closure__ 上 */}
          <div className="cc-link" />
          <div className="cc-counter card">
            <div className="cc-counter-name">{"counter"}</div>
            <div className="cc-counter-sub">内层函数 · 被返回的那个对象</div>
            <div className="cc-counter-port">
              <span className="label-mono">{"__closure__"}</span>
              <span className="dot-accent" />
              <span className="cc-port-note">{"1 个 cell"}</span>
            </div>
          </div>
          <div className="cc-carry">跟着 counter，一起被带走</div>
        </div>
      </div>
    );
  }

  /* step 2 — __closure__ 检查卡：终端实测（article L34 输出，地址为示意） */
  if (step === 2) {
    return (
      <div className="scene-pad cc-scene cc-repl-scene">
        <div className="cc-term card cc-rise">
          <div className="cc-term-head">
            <span className="label-mono">python3 · 交互终端</span>
            <span className="label-mono">core/21_scope_closure</span>
          </div>
          <div className="cc-term-body">
            <div className="cc-tline cc-tline-anim" style={{ animationDelay: "600ms" }}>
              <span className="cc-prompt">{">>> "}</span>
              <span>{"counter.__closure__"}</span>
            </div>
            <div className="cc-tline cc-tline-anim" style={{ animationDelay: "1600ms" }}>
              <span>{"(<"}</span>
              <span className="cc-hl">{"cell at 0x102bc6a40"}</span>
              <span>{": int object at 0x103726338>,)"}</span>
            </div>
            <div className="cc-tline cc-tline-anim" style={{ animationDelay: "3000ms" }}>
              <span className="cc-prompt">{">>> "}</span>
              <span>{"counter.__closure__[0].cell_contents"}</span>
            </div>
            <div className="cc-term-result cc-pop" style={{ animationDelay: "4200ms" }}>{"2"}</div>
          </div>
        </div>
        <div className="cc-repl-side">
          <div className="cc-rise" style={{ animationDelay: "5000ms" }}>
            <div className="cc-repl-term">{"__closure__"}</div>
            <div className="cc-repl-sub">counter 身上带着的属性</div>
          </div>
          <hr className="rule cc-repl-rule cc-rise" style={{ animationDelay: "5300ms" }} />
          <div className="cc-repl-item cc-rise" style={{ animationDelay: "5700ms" }}>
            <div className="cc-repl-code">{"(<cell ...>,)"}</div>
            <div className="cc-repl-gloss">里面躺着那个 cell</div>
          </div>
          <div className="cc-repl-item cc-rise" style={{ animationDelay: "6100ms" }}>
            <div className="cc-repl-code">{".cell_contents"}</div>
            <div className="cc-repl-gloss">一看，就是当前计数</div>
          </div>
          <div className="label-mono cc-repl-note cc-rise" style={{ animationDelay: "6600ms" }}>
            对象地址每次运行不同 · 此处为示意
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 字节码对照：STORE_FAST（栈帧，返回即销毁）vs STORE_DEREF（写 cell） */
  if (step === 3) {
    return (
      <div className="scene-pad cc-scene cc-byte-scene">
        <div className="cc-byte-head cc-rise">
          <span className="cc-byte-title">字节码更诚实</span>
          <span className="cc-byte-cmd">{"dis.get_instructions(counter)"}</span>
        </div>
        <div className="cc-byte-cols">
          <div className="cc-byte-card card cc-rise" style={{ animationDelay: "900ms" }}>
            <span className="cc-insn cc-insn-fast">{"STORE_FAST"}</span>
            <div className="cc-byte-tag">普通局部变量的存储指令</div>
            <div className="cc-diagram">
              <div className="cc-target">
                <span className="cc-target-label">栈帧槽位 · frame slot</span>
                <span className="cc-mini-insn cc-mini-fast cc-drop-fast">{"STORE_FAST"}</span>
              </div>
            </div>
            <div className="cc-verdict">
              <span className="cc-verdict-text cc-verdict-mute cc-rise" style={{ animationDelay: "2600ms" }}>
                读写栈帧，函数一返回就没了
              </span>
              <span className="cc-chip cc-chip-mute cc-pop" style={{ animationDelay: "3200ms" }}>已销毁</span>
            </div>
          </div>
          <div className="cc-byte-card card cc-rise" style={{ animationDelay: "4200ms" }}>
            <span className="cc-insn cc-insn-deref">{"STORE_DEREF"}</span>
            <div className="cc-byte-tag">被内层捕获的变量 · 升级为 cell</div>
            <div className="cc-diagram">
              <div className="cc-target cc-target-cell">
                <span className="cc-target-label cc-target-label-cell">cell 对象 · 闭包变量的家</span>
                <span className="cc-mini-insn cc-mini-deref cc-fly-deref">{"STORE_DEREF"}</span>
              </div>
            </div>
            <div className="cc-verdict">
              <span className="cc-verdict-text cc-rise" style={{ animationDelay: "6000ms" }}>
                写的不是栈帧，是 <b className="cc-b-accent">cell</b>
              </span>
              <span className="cc-chip cc-chip-accent cc-pop" style={{ animationDelay: "6700ms" }}>活过函数</span>
            </div>
          </div>
        </div>
        <div className="cc-equation cc-rise" style={{ animationDelay: "7800ms" }}>
          <span className="label-mono">被捕获之后</span>
          <span className="cc-eq-fast">{"STORE_FAST"}</span>
          <span className="cc-eq-arrow">→</span>
          <span className="cc-eq-deref">{"STORE_DEREF"}</span>
          <span className="cc-eq-gloss">同一份赋值，不同的去处</span>
        </div>
      </div>
    );
  }

  /* step 4 — 金句收束（油墨印刷式 wipe） */
  return (
    <div className="scene-pad cc-scene cc-quote-scene">
      <div className="label-mono cc-rise">closure · cell</div>
      <hr className="rule cc-quote-rule" />
      <h1 className="cc-quote-main">
        这就是变量<span className="cc-quote-accent">活过函数</span>的全部实现
      </h1>
      <div className="cc-quote-en cc-rise" style={{ animationDelay: "1800ms" }}>
        the whole implementation
      </div>
    </div>
  );
}
