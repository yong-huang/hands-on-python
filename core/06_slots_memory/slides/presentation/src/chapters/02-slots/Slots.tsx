import type { ChapterStepProps } from "../../registry/types";
import "./Slots.css";

/**
 * ch02 · slots — 一行声明的机制（4 steps）
 *
 * step 0  解法 hero：__slots__ = ("x", "y")
 * step 1  机制图：member_descriptor 直达槽位（vs 哈希表）
 * step 2  真机：has __dict__: False
 * step 3  本体解剖：48 B 不变，省的是哈希表（344 vs 48）
 */

export default function SlotsChapter({ step }: ChapterStepProps) {
  /* step 0 — 解法 hero */
  if (step === 0) {
    return (
      <div className="scene-pad sl-scene sl-declare-scene">
        <div className="sl-declare-lead sl-rise">解法只要一行</div>
        <div className="sl-declare-code sl-pop" style={{ animationDelay: "700ms" }}>
          <span className="sl-declare-dim">class Point:</span>
          {"\n    "}
          <span className="sl-declare-acc">__slots__</span> = ("x", "y")
        </div>
      </div>
    );
  }

  /* step 1 — 机制图 */
  if (step === 1) {
    return (
      <div className="scene-pad sl-scene sl-mech-scene">
        <div className="sl-mech-flow">
          <div className="sl-mech-node sl-rise">
            <span className="sl-mech-node-k">写入</span>
            <span className="sl-mech-mono">p.x = 1</span>
          </div>
          <span className="sl-mech-arrow sl-fade" style={{ animationDelay: "900ms" }}>→</span>
          <div className="sl-mech-node sl-mech-node-acc sl-pop" style={{ animationDelay: "1300ms" }}>
            <span className="sl-mech-node-k">类上</span>
            <span className="sl-mech-mono">member_descriptor</span>
          </div>
          <span className="sl-mech-arrow sl-fade" style={{ animationDelay: "1900ms" }}>→</span>
          <div className="sl-mech-node sl-rise" style={{ animationDelay: "2300ms" }}>
            <span className="sl-mech-node-k">实例内</span>
            <span className="sl-mech-mono">[ x | y ] 固定槽位</span>
          </div>
        </div>

        <div className="sl-mech-note sl-rise" style={{ animationDelay: "2900ms" }}>
          <span className="sl-mech-note-row">__dict__ · 哈希表 · 动态灵活 · 开销大</span>
          <span className="sl-mech-note-row sl-mech-note-acc">__slots__ · 描述符数组 · 固定紧凑 · 开销小</span>
        </div>
      </div>
    );
  }

  /* step 2 — 真机 */
  if (step === 2) {
    return (
      <div className="scene-pad sl-scene sl-term-scene">
        <div className="sl-term sl-rise">
          <div className="sl-term-bar">python3 slots_memory.py</div>
          <div className="sl-term-body">
            <div className="sl-term-line sl-line-in" style={{ animationDelay: "300ms" }}>
              SlotPoint:&nbsp;&nbsp;&nbsp;&nbsp; 48 bytes, has __dict__: False
            </div>
          </div>
        </div>
        <div className="sl-term-stamp sl-pop" style={{ animationDelay: "1400ms" }}>
          字典，没了
        </div>
      </div>
    );
  }

  /* step 3 — 本体解剖 */
  return (
    <div className="scene-pad sl-scene sl-anatomy-scene">
      <div className="sl-anatomy-lead sl-rise">本体还是 48 字节，没变</div>

      <div className="sl-anatomy">
        <span className="sl-anatomy-part sl-rise" style={{ animationDelay: "500ms" }}>
          <span className="sl-anatomy-num">16</span>
          <span className="sl-anatomy-k">对象头</span>
        </span>
        <span className="sl-anatomy-plus sl-fade" style={{ animationDelay: "900ms" }}>+</span>
        <span className="sl-anatomy-part sl-rise" style={{ animationDelay: "1100ms" }}>
          <span className="sl-anatomy-num">16</span>
          <span className="sl-anatomy-k">GC 头</span>
        </span>
        <span className="sl-anatomy-plus sl-fade" style={{ animationDelay: "1300ms" }}>+</span>
        <span className="sl-anatomy-part sl-rise" style={{ animationDelay: "1500ms" }}>
          <span className="sl-anatomy-num">8×2</span>
          <span className="sl-anatomy-k">槽位指针</span>
        </span>
      </div>

      <div className="sl-anatomy-total sl-pop" style={{ animationDelay: "2200ms" }}>
        省的是那张哈希表：<span className="sl-anatomy-total-acc">344 对 48</span>
      </div>
    </div>
  );
}
