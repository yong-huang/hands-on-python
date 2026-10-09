import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 坑 1~3 共用的「现象 → 原因 → 解法」卡内容。 */
const PIT_CARDS = [
  {
    ord: "01",
    name: "吞掉取消异常",
    rows: [
      { k: "现象", v: "任务组卡死，一直等一个不结束的任务" },
      { k: "原因", v: "except 捕获之后，没有再抛出去" },
      { k: "解法", v: "捕完，必须再抛", code: "raise" },
    ],
  },
  {
    ord: "02",
    name: "从异常组里盲取",
    rows: [
      { k: "现象", v: "拿到一个异常就开工，其余错误全漏了" },
      { k: "原因", v: "组里往往不止一个异常" },
      { k: "解法", v: "一个一个看是什么错，分别处理" },
    ],
  },
  {
    ord: "03",
    name: "把 gather 默认当「必须全成」",
    rows: [
      { k: "现象", v: "一处失败抛了异常，其余任务却在后台继续跑" },
      { k: "原因", v: "默认只收集、不取消兄弟任务" },
      { k: "解法", v: "要「一个失败、全员叫停」，用 TaskGroup" },
    ],
  },
] as const;

function PitCard({ ord, name, rows }: {
  ord: string;
  name: string;
  rows: readonly { k: string; v: string; code?: string }[];
}) {
  return (
    <div className="pf-card pf-rise" style={delay(240)}>
      <div className="pf-card-head">
        <span className="mono pf-card-ord">坑 {ord} / 04</span>
        <span className="pf-card-name">{name}</span>
      </div>
      <div className="pf-card-rows">
        {rows.map((r, i) => (
          <div key={r.k} className="pf-row pf-rise" style={delay(1100 + i * 1300)}>
            <span className="pf-row-key">{r.k}</span>
            <span className="pf-row-val">
              {r.v}
              {r.code && <span className="mono pf-row-code">{r.code}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0~2 — 坑 1~3：现象→原因→解法 */
  if (step === 0 || step === 1 || step === 2) {
    const c = PIT_CARDS[step];
    return (
      <div className="scene-pad pf-scene">
        <div className="pf-head pf-rise">
          <span className="label-mono">四个真实的坑</span>
        </div>
        <PitCard ord={c.ord} name={c.name} rows={c.rows} />
      </div>
    );
  }

  /* step 3 — 坑四：善后再等长操作（因果链 + shield 保护壳） */
  return (
    <div className="scene-pad pf-scene">
      <div className="pf-head pf-rise">
        <span className="label-mono">四个真实的坑</span>
        <span className="mono pf-card-ord">坑 04 / 04</span>
      </div>
      <div className="pf-p4-name pf-rise" style={delay(200)}>
        善后的时候，又去<b>等长操作</b>
      </div>
      <div className="pf-chain">
        <div className="pf-chain-step pf-rise" style={delay(1400)}>取消异常一来</div>
        <div className="pf-chain-arrow">→</div>
        <div className="pf-chain-step pf-rise" style={delay(2200)}>finally 开始收尾</div>
        <div className="pf-chain-arrow">→</div>
        <div className="pf-chain-step pf-chain-bad pf-rise" style={delay(3400)}>
          收尾里还有 await
          <span className="pf-chain-talk">比如把最后一段数据写回数据库</span>
        </div>
        <div className="pf-chain-arrow">→</div>
        <div className="pf-chain-step pf-chain-bad pf-rise" style={delay(5200)}>
          取消再进来一次
          <span className="pf-chain-talk">善后做到一半，断了</span>
        </div>
      </div>
      <div className="pf-shield-row">
        <div className="pf-shield pf-rise" style={delay(8200)}>
          <div className="pf-shield-shell">
            <span className="mono pf-shield-name">shield</span>
            <span className="pf-shield-talk">一层保护壳</span>
            <div className="pf-shield-arrows">
              <span className="pf-shield-blocked">外部取消 ✕ 进不来</span>
            </div>
            <div className="pf-shield-inner">壳里的清理 <b>✓ 跑得完</b></div>
          </div>
        </div>
        <div className="pf-p4-solution pf-rise" style={delay(10600)}>
          <b>善后要短</b>；实在要保护，用 shield
        </div>
      </div>
    </div>
  );
}
