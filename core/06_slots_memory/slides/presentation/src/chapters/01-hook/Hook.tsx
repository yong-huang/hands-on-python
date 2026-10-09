import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

/**
 * ch01 · hook — 看不见的字典税（4 steps）
 *
 * step 0  悬念 hero：两属性小对象，占多少内存？
 * step 1  双数字揭晓：本体 48 B vs 字典 296 B（重 6 倍）
 * step 2  默认行为：每实例附赠 __dict__ + 版本膨胀刻度
 * step 3  上量场景：坐标点 / 配置项 / ORM × 上万
 */

const SCENES = ["坐标点", "配置项", "ORM 模型"];

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · __slots__ &amp; Memory</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            看不见的<span className="hk-title-code">字典税</span>
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            __slots__ 与实例内存
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "1000ms" }}>
          <div className="hk-tb-row">
            <span>Subj</span>
            <b>slots-memory</b>
          </div>
          <div className="hk-tb-row">
            <span>Repo</span>
            <b>hands-on-python</b>
          </div>
          <div className="hk-tb-row">
            <span>Lab</span>
            <b>core / 06</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 悬念 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-ask-scene">
        <div className="hk-ask-obj hk-rise">
          <span className="hk-ask-chip">x</span>
          <span className="hk-ask-chip">y</span>
          <span className="hk-ask-obj-label">一个只有两个属性的小对象</span>
        </div>
        <div className="hk-ask-big hk-rise" style={{ animationDelay: "700ms" }}>
          它占<b>多少内存</b>？
        </div>
      </div>
    );
  }

  /* step 2 — 双数字揭晓 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-reveal-scene">
        <div className="hk-reveal-cols">
          <div className="hk-reveal-card hk-rise">
            <div className="hk-reveal-tag">对象本体</div>
            <div className="hk-reveal-num">48</div>
            <div className="hk-reveal-unit">bytes</div>
          </div>
          <div className="hk-reveal-card hk-reveal-card-acc hk-rise" style={{ animationDelay: "700ms" }}>
            <div className="hk-reveal-tag">背后的 __dict__</div>
            <div className="hk-reveal-num hk-reveal-num-acc">296</div>
            <div className="hk-reveal-unit">bytes</div>
          </div>
        </div>
        <div className="hk-reveal-foot hk-rise" style={{ animationDelay: "1800ms" }}>
          字典比对象本身，<b>重了 6 倍</b>
        </div>
      </div>
    );
  }

  /* step 3 — 默认行为 + 版本刻度 */
  if (step === 3) {
    return (
      <div className="scene-pad hk-scene hk-default-scene">
        <div className="hk-default-lead hk-rise">
          Python 的默认行为：每个实例<b>附赠一张 __dict__ 哈希表</b>
        </div>

        <div className="hk-scale hk-rise" style={{ animationDelay: "700ms" }}>
          <div className="hk-scale-track">
            <span className="hk-scale-tick" style={{ left: "6%" }}>3.10<br />~104 B</span>
            <span className="hk-scale-tick" style={{ left: "88%" }}>3.13<br />296 B</span>
            <span className="hk-scale-fill" />
          </div>
          <div className="hk-scale-range hk-fade" style={{ animationDelay: "1500ms" }}>
            随版本浮动 · 150~350 bytes
          </div>
        </div>

        <div className="hk-default-foot hk-rise" style={{ animationDelay: "2100ms" }}>
          字典越大，<b>税越重</b>
        </div>
      </div>
    );
  }

  /* step 4 — 上量场景 */
  return (
    <div className="scene-pad hk-scene hk-scaleup-scene">
      <div className="hk-scaleup-lead hk-rise">一造就是上万的场景</div>
      <div className="hk-scaleup-cards">
        {SCENES.map((s, i) => (
          <div key={s} className="hk-scaleup-card hk-rise" style={{ animationDelay: `${500 + i * 350}ms` }}>
            {s}
            <span className="hk-scaleup-x">× 10,000+</span>
          </div>
        ))}
      </div>
      <div className="hk-scaleup-foot hk-rise" style={{ animationDelay: "1900ms" }}>
        字典吃的内存，<b>比你的业务数据还多</b>
      </div>
    </div>
  );
}
