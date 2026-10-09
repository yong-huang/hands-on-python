import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./WhenToUse.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 关联强度三分（随口播逐条亮）。 */
const RULES = [
  { cond: "一损俱损", tool: "TaskGroup" },
  { cond: "彼此独立", tool: "gather" },
  { cond: "单个调用怕慢", tool: "wait_for" },
] as const;

/** 三条「别用」边界。 */
const AVOIDS = [
  { ord: "01", name: "就两三步、没有并发", talk: "直接顺序写，别折腾" },
  { ord: "02", name: "任务毫无关联", talk: "裸 create_task 能干——三个坑自己兜" },
  { ord: "03", name: "纯计算的活", talk: "请多个分身一起算——进程池" },
] as const;

/** 100 个页面的点阵（3 个失败）。 */
const PAGES = Array.from({ length: 100 }, (_, i) => i);
const FAILED = new Set([17, 42, 88]);

export default function WhenToUseChapter({ step }: ChapterStepProps) {
  /* step 0 — wait_for：单个慢操作加时限 */
  if (step === 0) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">第二个工具 · 单个慢操作</span>
          <span className="mono wu-head-name">wait_for</span>
        </div>
        <div className="wu-timeout-stage">
          <div className="wu-call-card wu-rise" style={delay(220)}>
            <span className="mono wu-call-name">外部接口</span>
            <span className="wu-call-talk">时快时慢</span>
          </div>
          <div className="wu-timeout-ring wu-rise" style={delay(700)}>
            <span className="wu-ring-num">0.2s</span>
            <span className="wu-ring-talk">时限</span>
          </div>
          <div className="wu-timeout-hit wu-stamp">
            <span>到点 → 取消</span>
            <span className="mono wu-hit-badge">TimeoutError</span>
          </div>
        </div>
        <div className="wu-note wu-rise" style={delay(2200)}>
          主流程<b>不被拖垮</b>——超时兜底
        </div>
      </div>
    );
  }

  /* step 1 — gather：批量收结果 */
  if (step === 1) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">第三个工具 · 批量收集</span>
          <span className="mono wu-head-name">gather</span>
        </div>
        <div className="wu-gather-stage">
          <div className="wu-batch">
            <div className="wu-batch-chip wu-rise" style={delay(300)}>结果 A</div>
            <div className="wu-batch-chip wu-rise" style={delay(500)}>结果 B</div>
            <div className="wu-batch-chip wu-rise" style={delay(700)}>结果 C</div>
            <div className="wu-batch-more wu-rise" style={delay(900)}>…</div>
          </div>
          <div className="wu-gather-arrow wu-rise" style={delay(1200)}>→</div>
          <div className="wu-list-box wu-rise" style={delay(1500)}>
            <div className="wu-list-title mono">一个列表</div>
            <div className="wu-list-row mono">结果 A</div>
            <div className="wu-list-row mono">结果 B</div>
            <div className="wu-list-row mono">结果 C</div>
          </div>
        </div>
        <div className="wu-note wu-rise" style={delay(2600)}>
          两种收集策略，差别很大——<b>待会儿细讲</b>
        </div>
      </div>
    );
  }

  /* step 2 — 判断主线：关联强度三分（随口播逐条亮） */
  if (step === 2) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">选型 · 判断主线就一条</span>
        </div>
        <div className="wu-rule-hero wu-rise" style={delay(200)}>
          任务之间的<b>关联强度</b>
        </div>
        <div className="wu-rule-list">
          {RULES.map((r, i) => (
            <div key={r.cond} className="wu-rule-row wu-rise" style={delay(2400 + i * 2400)}>
              <span className="wu-rule-cond">{r.cond}</span>
              <span className="wu-rule-arrow">→</span>
              <span className="mono wu-rule-tool">{r.tool}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 3 — 场景 1/3 下单：事务型扇出 */
  if (step === 3) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">场景 1 / 3 · 下单</span>
          <span className="mono wu-head-name">TaskGroup</span>
        </div>
        <div className="wu-order-stage">
          <div className="wu-order-chip wu-rise" style={delay(300)}>库存</div>
          <div className="wu-order-chip wu-rise" style={delay(500)}>支付</div>
          <div className="wu-order-chip wu-rise" style={delay(700)}>风控</div>
        </div>
        <div className="wu-order-verdict wu-rise" style={delay(1800)}>
          任何一个失败 → <b>整个请求放弃</b>
        </div>
        <div className="wu-note wu-rise" style={delay(3000)}>一损俱损的事务型扇出</div>
      </div>
    );
  }

  /* step 4 — 场景 2/3 慢接口加 deadline */
  if (step === 4) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">场景 2 / 3 · 慢依赖</span>
          <span className="mono wu-head-name">wait_for</span>
        </div>
        <div className="wu-deadline-stage">
          <div className="wu-dl-main wu-rise" style={delay(220)}>主流程</div>
          <div className="wu-dl-call wu-rise" style={delay(600)}>
            <span className="mono">外部接口</span>
            <span className="wu-dl-limit mono">时限 0.5s</span>
          </div>
        </div>
        <div className="wu-note wu-rise" style={delay(2000)}>
          拖不垮整体——<b>给慢依赖加死线</b>
        </div>
      </div>
    );
  }

  /* step 5 — 场景 3/3 聚合抓取：100 个页面 */
  if (step === 5) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">场景 3 / 3 · 聚合抓取</span>
          <span className="mono wu-head-name">gather</span>
        </div>
        <div className="wu-page-grid">
          {PAGES.map((n) => (
            <span key={n} className={`wu-page-dot ${FAILED.has(n) ? "is-bad" : ""}`} />
          ))}
        </div>
        <div className="wu-note wu-rise" style={delay(1400)}>
          容错开关打开——<b>个别出错不影响收其他的</b>，成功的先存进数据库
        </div>
      </div>
    );
  }

  /* step 6~8 — 三条「别用」边界：1 项 = 1 step，前行灰化保留 */
  if (step >= 6 && step <= 8) {
    const active = step - 6;
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">什么时候都别用</span>
          <span className="mono wu-head-ord">{AVOIDS[active].ord} / 03</span>
        </div>
        <div className="wu-avoid-list">
          {AVOIDS.map((a, i) => (
            <div
              key={a.ord}
              className={`wu-avoid-row ${i === active ? "is-active wu-rise" : i < active ? "is-past wu-avoid-past" : "is-future"}`}
              style={i === active ? delay(200) : undefined}
            >
              <span className="mono wu-avoid-ord">{a.ord}</span>
              <span className="wu-avoid-name">{a.name}</span>
              <span className="wu-avoid-talk">{a.talk}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
