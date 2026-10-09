import type { ChapterStepProps } from "../../registry/types";
import "./Nonlocal.css";

export default function NonlocalChapter({ step }: ChapterStepProps) {
  /* step 0 — 提问卡 → 答案一行：nonlocal（主导动作：答案 scale/pop 强调） */
  if (step === 0) {
    return (
      <div className="scene-pad nl-scene nl-q-scene">
        <div className="label-mono nl-q-kicker nl-rise">闭包 · 还差一块拼图</div>
        <h1 className="nl-q-main nl-rise" style={{ animationDelay: "160ms" }}>
          怎么改<span className="nl-accent">外层</span>的变量？
        </h1>
        <div className="nl-q-rule" style={{ animationDelay: "620ms" }} />
        <div className="nl-q-answer nl-pop" style={{ animationDelay: "1350ms" }}>
          nonlocal
        </div>
        <div className="nl-q-cue nl-rise" style={{ animationDelay: "2050ms" }}>
          答案就这一个词
        </div>
      </div>
    );
  }

  /* step 1 — 反例终端：删掉 nonlocal，count += 1 当场 UnboundLocalError
     （主导动作：终端逐行打出 + 报错行反色 stamp） */
  if (step === 1) {
    return (
      <div className="scene-pad nl-scene nl-err-scene">
        <div className="nl-err-cols">
          <div className="nl-err-left">
            <div className="card nl-code-card nl-rise">
              <div className="nl-code-head">
                <span className="nl-code-dot" />
                <span className="label-mono">make_counter.py · 删掉 nonlocal</span>
              </div>
              <pre className="nl-code"><code>
                <span className="nl-ln">{"def make_counter():"}</span>
                <span className="nl-ln">{"    count = 0"}</span>
                <span className="nl-ln">{"    def counter():"}</span>
                <span className="nl-ln nl-ln-del">
                  {"        # nonlocal count"}
                  <span className="nl-ln-mark">{"   ← 不写这行"}</span>
                </span>
                <span className="nl-ln nl-ln-hot">{"        count += 1"}</span>
                <span className="nl-ln">{"        return count"}</span>
                <span className="nl-ln">{"    return counter"}</span>
              </code></pre>
            </div>
            <div className="nl-stamp nl-rule-stamp" style={{ animationDelay: "7500ms" }}>
              <span className="label-mono">ch02 规矩 · 回扣</span>
              <div className="nl-stamp-text">赋值即声明</div>
            </div>
          </div>
          <div className="nl-err-right">
            <div className="card nl-term-card nl-rise" style={{ animationDelay: "1000ms" }}>
              <div className="nl-code-head">
                <span className="nl-code-dot" />
                <span className="label-mono">python3 · repl</span>
              </div>
              <pre className="nl-term"><code>
                <span className="nl-tln nl-tln-type">{">>> counter()"}</span>
                <span className="nl-tln nl-tln-mute nl-tfade" style={{ animationDelay: "2600ms" }}>
                  {"Traceback (most recent call last):"}
                </span>
                <span className="nl-tln nl-tln-faint nl-tfade" style={{ animationDelay: "2850ms" }}>
                  {'  File "make_counter.py", in counter'}
                </span>
                <span className="nl-tln nl-tln-err nl-pop" style={{ animationDelay: "4200ms" }}>
                  {"UnboundLocalError"}
                </span>
              </code></pre>
            </div>
            <div className="nl-err-note nl-tfade" style={{ animationDelay: "10500ms" }}>
              <div className="label-mono">Python 的判定</div>
              <div className="nl-note-text">
                count 在函数里被赋值 → 认定它是<b className="nl-accent">局部变量</b>
              </div>
            </div>
            <div className="nl-err-note nl-tfade" style={{ animationDelay: "12800ms" }}>
              <div className="label-mono">先读后写</div>
              <div className="nl-note-text">读它的时候还没有值 —— 当场翻车</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — nonlocal 语义图：箭头从内层函数指向 Enclosing 层的 count，
     到模块级的路被划掉（主导动作：SVG 箭头自绘） */
  if (step === 2) {
    return (
      <div className="scene-pad nl-scene nl-decl-scene">
        <div className="nl-diagram-head">
          <div className="label-mono nl-rise">nonlocal · 声明</div>
          <div className="nl-diagram-title nl-rise" style={{ animationDelay: "150ms" }}>
            我要改的，是<span className="nl-accent">外层</span>那个 count
          </div>
        </div>
        <div className="nl-decl-diagram">
          <div className="nl-mod-band nl-rise" style={{ animationDelay: "250ms" }}>
            <span className="label-mono">global · 模块级</span>
            <span className="nl-mod-badge">{"nonlocal 不碰这里"}</span>
          </div>
          <svg className="nl-decl-svg" viewBox="0 0 1240 560">
            <path className="nl-block-line" d="M 170 146 L 170 108" />
            <path className="nl-block-cross" d="M 158 90 L 182 114 M 182 90 L 158 114" />
            <path
              className="nl-arrow-path"
              d="M 740 338 C 860 338, 1000 352, 1000 250"
              pathLength={1}
            />
            <path className="nl-arrow-head nl-pop" style={{ animationDelay: "2400ms" }} d="M 1000 234 L 991 254 L 1009 254 Z" />
          </svg>
          <div className="card nl-enc-card nl-rise" style={{ animationDelay: "450ms" }}>
            <div className="nl-enc-head">
              <span className="nl-enc-fn">{"def make_counter():"}</span>
              <div className="nl-cell-chip nl-pop" style={{ animationDelay: "2650ms" }}>
                <span className="label-mono">enclosing · cell</span>
                <span className="nl-cell-val">{"count = 0"}</span>
              </div>
            </div>
            <div className="nl-inner-card">
              <pre className="nl-code nl-code-sm"><code>
                <span className="nl-ln">{"def counter():"}</span>
                <span className="nl-ln nl-ln-key">{"    nonlocal count"}</span>
                <span className="nl-ln">{"    count += 1"}</span>
              </code></pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — global 语义图：指向模块级总线，人人可见
     （主导动作：总线生长 + 三条支线依次点亮连线） */
  if (step === 3) {
    return (
      <div className="scene-pad nl-scene nl-bus-scene">
        <div className="nl-diagram-head">
          <div className="label-mono nl-rise">global · 语义</div>
          <div className="nl-diagram-title nl-rise" style={{ animationDelay: "150ms" }}>
            指向<span className="nl-accent">模块级</span>，人人可见
          </div>
        </div>
        <div className="nl-bus-diagram">
          <div className="nl-bus-bar" />
          <div className="nl-bus-chip nl-pop" style={{ animationDelay: "1000ms" }}>
            <span className="label-mono">module</span>
            <span className="nl-bus-name">{"total_global = 1"}</span>
          </div>
          <div className="nl-bus-mod label-mono nl-rise" style={{ animationDelay: "550ms" }}>
            模块级总线
          </div>
          <div className="nl-tap nl-tap-1" />
          <div className="nl-tap nl-tap-2" />
          <div className="nl-tap nl-tap-3" />
          <div className="nl-bus-node nl-pop" style={{ animationDelay: "1600ms", left: "340px" }}>
            <span className="nl-node-fn">{"with_global()"}</span>
            <span className="label-mono">demo · → 1</span>
          </div>
          <div className="nl-bus-node nl-pop" style={{ animationDelay: "1950ms", left: "730px" }}>
            <span className="nl-node-fn">{"fn()"}</span>
            <span className="label-mono">模块里任何函数</span>
          </div>
          <div className="nl-bus-node nl-pop" style={{ animationDelay: "2300ms", left: "1120px" }}>
            <span className="nl-node-fn">{"fn()"}</span>
            <span className="label-mono">模块里任何函数</span>
          </div>
        </div>
        <div className="nl-bus-caption nl-rise" style={{ animationDelay: "2500ms" }}>
          跨函数，共享<b className="nl-accent">同一个名字</b>
        </div>
      </div>
    );
  }

  /* step 4 — 签名画面：两个计数器 A/B 独立跳数（A=2，B=1），各持一套 cell
     （主导动作：计数 pop 递增 + cell 容器成对揭示 + 实例 stamp） */
  return (
    <div className="scene-pad nl-scene nl-inst-scene">
      <div className="nl-inst-maker">
        <span className="nl-maker-chip nl-rise">{"a = make_counter()"}</span>
        <span className="nl-maker-chip nl-rise" style={{ animationDelay: "220ms" }}>
          {"b = make_counter()"}
        </span>
      </div>
      <div className="nl-inst-row">
        <div className="card nl-inst-panel nl-rise" style={{ animationDelay: "300ms" }}>
          <div className="nl-inst-head">
            <span className="label-mono">计数器 · 实例 A</span>
          </div>
          <div className="nl-call-row">
            <span className="nl-call-prompt">{"a()"}</span>
            <span className="nl-call-arrow">→</span>
            <span className="hero-num nl-call-num nl-pop" style={{ animationDelay: "1200ms" }}>1</span>
          </div>
          <div className="nl-call-row">
            <span className="nl-call-prompt">{"a()"}</span>
            <span className="nl-call-arrow">→</span>
            <span className="hero-num nl-call-num nl-pop" style={{ animationDelay: "2800ms" }}>2</span>
          </div>
          <div className="nl-cellbox nl-pop" style={{ animationDelay: "6600ms" }}>
            <span className="label-mono">{"__closure__[0] · cell"}</span>
            <span className="nl-cellbox-val">{"count = 2"}</span>
          </div>
        </div>
        <div className="nl-inst-divider nl-tfade" style={{ animationDelay: "5400ms" }}>
          <div className="nl-inst-dline" />
          <div className="nl-inst-dlabel">互不干扰</div>
          <div className="nl-inst-dline" />
        </div>
        <div className="card nl-inst-panel nl-rise" style={{ animationDelay: "500ms" }}>
          <div className="nl-inst-head">
            <span className="label-mono">计数器 · 实例 B</span>
          </div>
          <div className="nl-call-row">
            <span className="nl-call-prompt">{"b()"}</span>
            <span className="nl-call-arrow">→</span>
            <span className="hero-num nl-call-num nl-pop" style={{ animationDelay: "4400ms" }}>1</span>
          </div>
          <div className="nl-cellbox nl-pop" style={{ animationDelay: "7000ms" }}>
            <span className="label-mono">{"__closure__[0] · cell"}</span>
            <span className="nl-cellbox-val">{"count = 1"}</span>
          </div>
        </div>
      </div>
      <div className="nl-stamp nl-inst-stamp" style={{ animationDelay: "9300ms" }}>
        <span className="label-mono">make_counter() × 2 → cell × 2</span>
        <div className="nl-stamp-text">闭包版的实例</div>
      </div>
    </div>
  );
}
