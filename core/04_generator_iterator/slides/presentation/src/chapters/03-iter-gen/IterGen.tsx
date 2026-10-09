import type { ChapterStepProps } from "../../registry/types";
import "./IterGen.css";

/**
 * ch03 · iter-gen — 手写迭代器 vs 生成器（4 steps）
 *
 * step 0  for 底层拆解：for ≙ iter + next 循环
 * step 1  手写迭代器代码卡（20+ 行起步）
 * step 2  生成器版 fib 五行
 * step 3  等价收尾：__iter__ / __next__ 自动自带
 */

export default function IterGenChapter({ step }: ChapterStepProps) {
  /* step 0 — for 底层拆解 */
  if (step === 0) {
    return (
      <div className="scene-pad ig-scene ig-for-scene">
        <div className="ig-for-bridge ig-rise">
          还记得刚才的 <span className="ig-for-bridge-mono">StopIteration</span> 吗？
        </div>

        <div className="ig-for-top ig-rise" style={{ animationDelay: "700ms" }}>
          <span className="ig-for-k">for</span> x <span className="ig-for-k">in</span> obj: ...
        </div>

        <div className="ig-for-eq ig-fade" style={{ animationDelay: "1500ms" }}>
          底层等价于
        </div>

        <div className="ig-for-under ig-rise" style={{ animationDelay: "2000ms" }}>
          <pre className="ig-code">{`it = iter(obj)
while True:
    try:
        x = next(it)
    `}<span className="ig-for-hl ig-fade" style={{ animationDelay: "3000ms" }}>except StopIteration:</span>{`
        break`}</pre>
        </div>
      </div>
    );
  }

  /* step 1 — 手写迭代器 */
  if (step === 1) {
    return (
      <div className="scene-pad ig-scene ig-manual-scene">
        <div className="ig-manual-lead ig-rise">手写一个迭代器</div>
        <div className="ig-codecard ig-codecard-manual ig-rise" style={{ animationDelay: "300ms" }}>
          <div className="ig-codecard-bar">my_iterator.py</div>
          <pre className="ig-code">{`class MyIterator:
    def __iter__(self):
        return self

    def __next__(self):
        if self.done:
            raise StopIteration
        ...`}</pre>
          <span className="ig-manual-tag ig-pop" style={{ animationDelay: "2200ms" }}>
            20+ 行起步
          </span>
        </div>
      </div>
    );
  }

  /* step 2 — 生成器版 */
  if (step === 2) {
    return (
      <div className="scene-pad ig-scene ig-gen-scene">
        <div className="ig-gen-lead ig-rise">生成器版，斐波那契</div>
        <div className="ig-codecard ig-codecard-acc ig-rise" style={{ animationDelay: "300ms" }}>
          <div className="ig-codecard-bar">fib.py</div>
          <pre className="ig-code">{`def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b`}</pre>
        </div>
        <div className="ig-gen-count ig-pop" style={{ animationDelay: "2000ms" }}>
          <span className="ig-gen-count-num">5</span>
          行
        </div>
      </div>
    );
  }

  /* step 3 — 等价收尾 */
  return (
    <div className="scene-pad ig-scene ig-equiv-scene">
      <div className="ig-equiv-lead ig-rise">两者等价</div>
      <div className="ig-equiv-chips">
        <div className="ig-equiv-chip ig-pop" style={{ animationDelay: "600ms" }}>
          <span className="ig-equiv-mono">__iter__</span>
          <span className="ig-equiv-auto">自动自带</span>
        </div>
        <div className="ig-equiv-chip ig-pop" style={{ animationDelay: "1400ms" }}>
          <span className="ig-equiv-mono">__next__</span>
          <span className="ig-equiv-auto">自动自带</span>
        </div>
      </div>
      <div className="ig-equiv-foot ig-rise" style={{ animationDelay: "2200ms" }}>
        手写要写的两个方法，<b>生成器自动就有</b>
      </div>
    </div>
  );
}
