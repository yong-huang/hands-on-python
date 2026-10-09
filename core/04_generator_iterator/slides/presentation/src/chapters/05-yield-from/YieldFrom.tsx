import type { ChapterStepProps } from "../../registry/types";
import "./YieldFrom.css";

/**
 * ch05 · yield-from — 委托子生成器（5 steps）
 *
 * step 0  委托概念：外层 → yield from → 子生成器
 * step 1  flatten 代码走读：子列表递归 / 值直出（双分支标注）
 * step 2  三件事：值透传 / 异常透传 / 返回值捕获
 * step 3  真机：多层列表摊平
 * step 4  伏笔：async/await 的前身
 */

export default function YieldFromChapter({ step }: ChapterStepProps) {
  /* step 0 — 委托概念 */
  if (step === 0) {
    return (
      <div className="scene-pad yf-scene yf-delegate-scene">
        <div className="yf-delegate-row">
          <div className="yf-delegate-node yf-delegate-node-outer yf-rise">
            <div className="yf-delegate-k">外层生成器</div>
            <div className="yf-delegate-mono">flatten(items)</div>
          </div>
          <span className="yf-delegate-link yf-rise" style={{ animationDelay: "800ms" }}>
            <span className="yf-delegate-link-label">yield from</span>
          </span>
          <div className="yf-delegate-node yf-delegate-node-inner yf-pop" style={{ animationDelay: "1600ms" }}>
            <div className="yf-delegate-k">子生成器</div>
            <div className="yf-delegate-mono">flatten(sublist)</div>
          </div>
        </div>
        <div className="yf-delegate-foot yf-rise" style={{ animationDelay: "2300ms" }}>
          值直达调用方，<b>一层一层递归下去</b>
        </div>
      </div>
    );
  }

  /* step 1 — flatten 走读 */
  if (step === 1) {
    return (
      <div className="scene-pad yf-scene yf-flatten-scene">
        <div className="yf-flatten-lead yf-rise">展平一个多层列表</div>
        <div className="yf-flatten-code yf-rise" style={{ animationDelay: "300ms" }}>
          <div className="yf-flatten-bar">flatten.py</div>
          <pre className="yf-code">{`def flatten(items):
    for item in items:
        if isinstance(item, list):
            yield from flatten(item)
        else:
            yield item`}</pre>

          <span className="yf-branch yf-branch-1 yf-fade" style={{ animationDelay: "2000ms" }}>
            子列表 → 递归委托
          </span>
          <span className="yf-branch yf-branch-2 yf-fade" style={{ animationDelay: "2900ms" }}>
            值 → 直接 yield
          </span>
        </div>
      </div>
    );
  }

  /* step 2 — 三件事 */
  if (step === 2) {
    return (
      <div className="scene-pad yf-scene yf-three-scene">
        <div className="yf-three-lead yf-rise">yield from 做了三件事</div>
        <div className="yf-three-list">
          <div className="yf-three-item yf-rise" style={{ animationDelay: "500ms" }}>
            <span className="yf-three-ord">1</span>
            <span className="yf-three-name">值透传</span>
            <span className="yf-three-note">子生成器的 yield 直达调用方</span>
          </div>
          <div className="yf-three-item yf-rise" style={{ animationDelay: "1300ms" }}>
            <span className="yf-three-ord">2</span>
            <span className="yf-three-name">异常透传</span>
            <span className="yf-three-note">send / throw / close 直达子生成器</span>
          </div>
          <div className="yf-three-item yf-rise" style={{ animationDelay: "2100ms" }}>
            <span className="yf-three-ord">3</span>
            <span className="yf-three-name">返回值捕获</span>
            <span className="yf-three-note">子生成器 return 的值，经 StopIteration.value 带回</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 真机摊平 */
  if (step === 3) {
    return (
      <div className="scene-pad yf-scene yf-flat-scene">
        <div className="yf-flat-term yf-rise">
          <div className="yf-flat-bar">python3 generator_iterator.py</div>
          <div className="yf-flat-body">
            <div className="yf-flat-line yf-flat-line-dim yf-line-in" style={{ animationDelay: "300ms" }}>
              flatten([1, [2, 3, [4, 5]], 6, [7, 8, 9]])
            </div>
            <div className="yf-flat-line yf-flat-line-acc yf-line-in" style={{ animationDelay: "1700ms" }}>
              = [1, 2, 3, 4, 5, 6, 7, 8, 9]
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 协程伏笔 */
  return (
    <div className="scene-pad yf-scene yf-async-scene">
      <div className="yf-async-lead yf-rise">
        这套<b>暂停 + 委托</b>，后来长成了什么？
      </div>
      <div className="yf-async-answer yf-pop" style={{ animationDelay: "1200ms" }}>
        async / await 的前身
      </div>
    </div>
  );
}
