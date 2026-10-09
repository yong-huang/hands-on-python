import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — 老假设：结果只由输入决定 */
  if (step === 0) {
    return (
      <div className="scene-pad bg-scene bg-same-scene">
        <div className="bg-hero bg-rise">同一段代码，跑一百遍——<b className="bg-accent">都一样</b></div>
        <div className="bg-same-row">
          {[1, 2, 3].map((n, i) => (
            <div className="bg-same-card bg-pop" style={delay(500 + i * 400)} key={n}>
              <span className="label-mono">第 {n} 遍</span>
              <div className="bg-same-line mono">input → output</div>
              <div className="bg-same-result mono">同一结果</div>
            </div>
          ))}
          <span className="bg-same-more mono bg-pop" style={delay(1800)}>× 100</span>
        </div>
      </div>
    );
  }

  /* step 1 — 老假设：三步连做 */
  if (step === 1) {
    return (
      <div className="scene-pad bg-scene bg-plus-scene">
        <div className="bg-plus-hero bg-rise">counter += 1 —— 放心地<b className="bg-accent">一口气</b>做完</div>
        <div className="bg-plus-flow">
          {["读 counter", "加 1", "写回"].map((s, i) => (
            <div className="bg-plus-item" key={s}>
              {i > 0 && <span className="bg-plus-arrow bg-rise" style={delay(900 + i * 500)}>→</span>}
              <div className="bg-plus-step bg-pop" style={delay(500 + i * 500)}>
                <span className="bg-plus-ord mono">{`0${i + 1}`}</span>
                <span className="bg-plus-text mono">{s}</span>
              </div>
            </div>
          ))}
          <span className="bg-plus-brace bg-rise" style={delay(2200)}>这一行执行完，才轮到下一行</span>
        </div>
      </div>
    );
  }

  /* step 2 — 假设碎裂：多条任务线交叠 */
  if (step === 2) {
    return (
      <div className="scene-pad bg-scene bg-break-scene">
        <div className="bg-break-hero bg-rise">线程一来，假设<b className="bg-accent">碎了</b></div>
        <div className="bg-break-box bg-rise" style={delay(500)}>
          {["任务线 1", "任务线 2", "任务线 3"].map((t, i) => (
            <div className="bg-break-lane bg-rise" style={delay(1000 + i * 400)} key={t}>
              <span className="bg-break-name mono">{t}</span>
              <span className="bg-break-ops mono">读 → 写 → 读 → 写</span>
            </div>
          ))}
          <div className="bg-break-shared bg-rise" style={delay(2300)}>
            <span className="label-mono">同一个变量</span>
            <span className="bg-break-var mono">counter</span>
          </div>
        </div>
        <div className="bg-break-foot bg-rise" style={delay(2900)}>
          最后算成几——<b className="bg-accent">看谁最后写回</b>
        </div>
      </div>
    );
  }

  /* step 3 — 竞态命名 + 痛点 */
  return (
    <div className="scene-pad bg-scene bg-name-scene">
      <div className="bg-name-pre bg-rise">哪步先哪步后全看运气——这种毛病，有个名字</div>
      <h1 className="bg-name-hero bg-pop" style={delay(500)}>竞态</h1>
      <div className="bg-name-en mono bg-rise" style={delay(1100)}>RACE CONDITION</div>
      <div className="bg-name-pain bg-rise" style={delay(1900)}>
        <span className="bg-name-painitem">开发机上一切正常</span>
        <span className="bg-name-painitem">一上人多活多的机器就出错</span>
        <span className="bg-name-painitem">日志里找不到确定的因果</span>
      </div>
    </div>
  );
}
