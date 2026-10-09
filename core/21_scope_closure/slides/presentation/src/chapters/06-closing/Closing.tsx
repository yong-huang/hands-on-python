import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/* 命令行一律字符串常量（oxlint 怪癖：经 {"..."} 表达式渲染，block 元素 + white-space:pre，pre>code 设 font-family: inherit） */
const CMD_CD = "cd core/21_scope_closure";
const CMD_RUN = "python3 scope_closure.py";
const OUT_HEAD = "=== 作用域与闭包 ===";

export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 回望装饰器：wrapper 即闭包，times / store 飞越装饰那一刻、落进 cell */
  if (step === 0) {
    return (
      <div className="scene-pad cz-scene cz-open-scene">
        <div className="label-mono cz-rise">Q1 · 装饰器为什么必须理解闭包</div>
        <div className="cz-open-lead cz-rise" style={{ animationDelay: "150ms" }}>
          这套机制，你早就在用。
        </div>
        <h1 className="cz-open-hero cz-rise" style={{ animationDelay: "450ms" }}>
          装饰器的 <span className="cz-open-mono">wrapper</span>，就是
          <span className="cz-open-accent">闭包</span>。
        </h1>

        <div className="cz-diagram">
          <div className="cz-dg-line" />
          <div className="cz-dg-tag cz-rise" style={{ animationDelay: "1500ms" }}>
            装饰那一刻
          </div>

          <div className="cz-src cz-rise" style={{ top: 134, animationDelay: "2300ms" }}>
            <span className="cz-src-name mono">retry</span>
            <span className="cz-ghost mono" style={{ animationDelay: "4600ms" }}>times</span>
          </div>
          <div className="cz-src cz-rise" style={{ top: 214, animationDelay: "2500ms" }}>
            <span className="cz-src-name mono">ttl_cache</span>
            <span className="cz-ghost mono" style={{ animationDelay: "5800ms" }}>store</span>
          </div>

          <div className="cz-wrap card cz-rise" style={{ animationDelay: "1800ms" }}>
            <div className="cz-wrap-head">
              <span className="cz-wrap-name mono">wrapper</span>
              <span className="badge-mono is-accent">闭包</span>
            </div>
            <div className="cz-slot">
              <span className="cz-slot-hint mono">自由变量</span>
              <span className="cz-chip mono" style={{ animationDelay: "4300ms" }}>
                <i className="cz-cell-dot" />
                times
              </span>
            </div>
            <div className="cz-slot">
              <span className="cz-slot-hint mono">自由变量</span>
              <span className="cz-chip mono" style={{ animationDelay: "5500ms" }}>
                <i className="cz-cell-dot" />
                store
              </span>
            </div>
          </div>
        </div>

        <div className="cz-open-cap cz-rise" style={{ animationDelay: "7600ms" }}>
          靠 <span className="cz-cap-mono mono">cell</span>，活过装饰那一刻。
        </div>
        <div className="cz-open-foot cz-rise" style={{ animationDelay: "8700ms" }}>
          装饰器（lab 01）· 回调 · 偏函数 —— 全部建立在闭包上
        </div>
      </div>
    );
  }

  /* step 1 — 四件套收拢：一条路走过来，LEGB · cell · nonlocal · 迟绑定 逐站点亮 */
  if (step === 1) {
    return (
      <div className="scene-pad cz-scene cz-road-scene">
        <div className="cz-road-head">
          <div className="label-mono cz-rise">Python 作用域与闭包 · 四件事</div>
          <h1 className="cz-road-title cz-rise" style={{ animationDelay: "120ms" }}>
            这一路
          </h1>
          <hr className="rule cz-head-rule" style={{ animationDelay: "450ms" }} />
        </div>

        <div className="cz-rows">
          <div className="cz-rail" />

          <div className="cz-road-row cz-march" style={{ animationDelay: "800ms" }}>
            <span className="cz-dot cz-pop" style={{ animationDelay: "900ms" }} />
            <span className="cz-term mono">LEGB</span>
            <span className="cz-role">
              <span className="cz-role-main">管名字往哪找</span>
              <span className="cz-role-sub mono">L → E → G → B · 同名就近遮蔽</span>
            </span>
          </div>

          <div className="cz-road-row cz-march" style={{ animationDelay: "2900ms" }}>
            <span className="cz-dot cz-pop" style={{ animationDelay: "3000ms" }} />
            <span className="cz-term mono">cell</span>
            <span className="cz-role">
              <span className="cz-role-main">管变量活多久</span>
              <span className="cz-role-sub mono">STORE_DEREF · __closure__</span>
            </span>
          </div>

          <div className="cz-road-row cz-march" style={{ animationDelay: "4900ms" }}>
            <span className="cz-dot cz-pop" style={{ animationDelay: "5000ms" }} />
            <span className="cz-term mono">nonlocal</span>
            <span className="cz-role">
              <span className="cz-role-main">跨层修改的通行证</span>
              <span className="cz-role-sub mono">向外层函数作用域找 · 不碰模块级</span>
            </span>
          </div>

          <div className="cz-road-row cz-march" style={{ animationDelay: "7300ms" }}>
            <span className="cz-dot cz-pop" style={{ animationDelay: "7400ms" }} />
            <span className="cz-term cz-term-cn">迟绑定</span>
            <span className="cz-role">
              <span className="cz-role-main">闭包存的是变量，不是值</span>
              <span className="cz-role-sub mono">调用时才读 i · 默认参数快照修复</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — CTA：仓库图签（呼应第 1 章 titleblock）+ 终端逐字运行 + 下期见 */
  return (
    <div className="scene-pad cz-scene cz-cta-scene">
      <div className="cz-cta-main">
        <div className="cz-repo cz-rise">
          <div className="label-mono cz-repo-head">hands-on-python</div>
          <div className="cz-tb-row"><span>Subj</span><b>scope-closure</b></div>
          <div className="cz-tb-row"><span>Repo</span><b>hands-on-python</b></div>
          <div className="cz-tb-row"><span>Lab</span><b>core / 21</b></div>
          <hr className="rule cz-repo-rule" />
          <div className="cz-repo-foot mono">零依赖 · 任何 CPython 3.x 输出一致</div>
          <div className="cz-repo-link mono cz-rise" style={{ animationDelay: "5600ms" }}>
            链接在评论区
          </div>
        </div>

        <div className="cz-cli card cz-rise" style={{ animationDelay: "250ms" }}>
          <div className="cz-cli-head">
            <span className="cz-cli-dot" />
            <span className="label-mono">terminal · scope_closure</span>
          </div>
          <div className="cz-cli-line mono">
            <span className="cz-prompt mono">{"$"}</span>
            <span className="cz-type" style={{ animationDelay: "1500ms" }}>{CMD_CD}</span>
            <span className="cz-caret" style={{ animationDelay: "1500ms" }} />
          </div>
          <div className="cz-cli-line mono">
            <span className="cz-prompt mono">{"$"}</span>
            <span className="cz-type" style={{ animationDelay: "2750ms" }}>{CMD_RUN}</span>
            <span className="cz-caret" style={{ animationDelay: "2750ms" }} />
          </div>
          <div className="cz-cli-out cz-rise" style={{ animationDelay: "4100ms" }}>
            <div className="cz-out-head mono">{OUT_HEAD}</div>
            <div className="cz-out-sub mono">4 个小节 · 内置断言</div>
          </div>
        </div>
      </div>

      <div className="cz-cta-end">
        <hr className="cz-end-rule" style={{ animationDelay: "5900ms" }} />
        <div
          className="cz-end-main cz-rise"
          style={{ animationDelay: "6050ms", animationDuration: "850ms" }}
        >
          下期见
        </div>
        <div className="cz-end-en cz-rise" style={{ animationDelay: "6300ms" }}>
          See you next time
        </div>
      </div>
    </div>
  );
}
