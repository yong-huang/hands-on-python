import type { ChapterStepProps } from "../../registry/types";
import "./Cached.css";

/**
 * ch05 · cached — CachedProperty 缓存属性（7 steps）
 *
 * step 0  需求卡：stats 算一次
 * step 1  只定义 __get__ → 非数据判定
 * step 2  factory(obj) 首次计算
 * step 3  核心一行 hero：写回 obj.__dict__
 * step 4  为什么写回：查找链回放
 * step 5  真机铁证：Compute count: 1
 * step 6  软肋：hacked 覆盖（设计代价）
 */

export default function CachedChapter({ step }: ChapterStepProps) {
  /* step 0 — 需求卡 */
  if (step === 0) {
    return (
      <div className="scene-pad cp-scene cp-req-scene">
        <div className="cp-req-head cp-rise">
          第二个实战 · <b>缓存属性</b>
        </div>
        <div className="cp-req-sub cp-rise" style={{ animationDelay: "500ms" }}>
          需求：stats 这个统计结果
        </div>
        <div className="cp-req-card cp-rise" style={{ animationDelay: "1100ms" }}>
          <code>sum · mean · min · max</code>
          <span className="cp-req-note">第一次算完，后面全用现成的</span>
        </div>
      </div>
    );
  }

  /* step 1 — 只定义 __get__ */
  if (step === 1) {
    return (
      <div className="scene-pad cp-scene cp-code-scene">
        <div className="cp-codecard cp-rise">
          <div className="cp-codecard-bar">cached_property.py</div>
          <pre className="cp-code">{`class CachedProperty:            # 只定义 __get__
    def __get__(self, obj, objtype=None):
        ...`}</pre>
        </div>
        <div className="cp-verdict cp-pop" style={{ animationDelay: "1400ms" }}>
          自动成为 · 非数据描述符
        </div>
      </div>
    );
  }

  /* step 2 — factory 首次计算 */
  if (step === 2) {
    return (
      <div className="scene-pad cp-scene cp-factory-scene">
        <div className="cp-factory-lead cp-rise">首次访问</div>
        <div className="cp-codecard cp-rise" style={{ animationDelay: "400ms" }}>
          <div className="cp-codecard-bar">cached_property.py</div>
          <pre className="cp-code">{`    value = self.factory(obj)    # 才在这一刻计算`}</pre>
        </div>
        <div className="cp-count cp-pop" style={{ animationDelay: "1400ms" }}>
          <span className="cp-count-k">compute count</span>
          <span className="cp-count-v">1</span>
        </div>
      </div>
    );
  }

  /* step 3 — 核心一行 */
  if (step === 3) {
    return (
      <div className="scene-pad cp-scene cp-core-scene">
        <div className="cp-core-kicker cp-rise">核心的一行来了</div>
        <div className="cp-core-line cp-pop" style={{ animationDelay: "700ms" }}>
          obj.__dict__[self.name] = value
        </div>
        <div className="cp-core-foot cp-rise" style={{ animationDelay: "1800ms" }}>
          把结果，<b>写回实例字典</b>
        </div>
      </div>
    );
  }

  /* step 4 — 为什么写回：查找链回放 */
  if (step === 4) {
    return (
      <div className="scene-pad cp-scene cp-why-scene">
        <div className="cp-why-lead cp-rise">为什么要写回去？</div>
        <div className="cp-why-chain">
          <div className="cp-why-step cp-why-step-no cp-rise" style={{ animationDelay: "600ms" }}>
            <span className="cp-why-ord">1</span>数据描述符？没有 → 跳过
          </div>
          <div className="cp-why-step cp-why-step-hit cp-pop" style={{ animationDelay: "1800ms" }}>
            <span className="cp-why-ord">2</span>实例 __dict__ → <b>命中 ✓</b>
          </div>
          <div className="cp-why-step cp-why-step-dead cp-rise" style={{ animationDelay: "3000ms" }}>
            <span className="cp-why-ord">3</span>__get__ → 根本不会再被调用
          </div>
        </div>
        <div className="cp-why-foot cp-rise" style={{ animationDelay: "3900ms" }}>
          写回字典 = <b>下次直接命中</b>
        </div>
      </div>
    );
  }

  /* step 5 — 真机铁证 */
  if (step === 5) {
    return (
      <div className="scene-pad cp-scene cp-proof-scene">
        <div className="cp-proof-term cp-rise">
          <div className="cp-proof-bar">python3 descriptor.py</div>
          <div className="cp-proof-body">
            <div className="cp-proof-line cp-line-in" style={{ animationDelay: "400ms" }}>
              Access stats 1st time (computes): {'{'}'sum': 4950, 'mean': 49.5{'}'}
            </div>
            <div className="cp-proof-line cp-line-in" style={{ animationDelay: "1600ms" }}>
              Access stats 2nd time (cached):&nbsp;&nbsp; {'{'}'sum': 4950, 'mean': 49.5{'}'}
            </div>
            <div className="cp-proof-line cp-proof-key cp-line-in" style={{ animationDelay: "2800ms" }}>
              Compute count: 1
            </div>
          </div>
        </div>
        <div className="cp-proof-stamp cp-stamp-in" style={{ animationDelay: "3800ms" }}>
          铁证
        </div>
      </div>
    );
  }

  /* step 6 — 软肋 */
  return (
    <div className="scene-pad cp-scene cp-soft-scene">
      <div className="cp-soft-lead cp-rise">软肋也在这条链上</div>
      <div className="cp-soft-flow">
        <div className="cp-soft-act cp-rise" style={{ animationDelay: "700ms" }}>
          <span className="cp-soft-mono">obj.__dict__["stats"] = {"{'hacked': True}"}</span>
        </div>
        <span className="cp-soft-arrow cp-fade" style={{ animationDelay: "1700ms" }}>↓</span>
        <div className="cp-soft-result cp-pop" style={{ animationDelay: "2200ms" }}>
          再读 stats → <span className="cp-soft-mono">{"{'hacked': True}"}</span>
        </div>
      </div>
      <div className="cp-soft-stamp cp-stamp-in" style={{ animationDelay: "3200ms" }}>
        设计的代价 · 不是 bug
      </div>
    </div>
  );
}
