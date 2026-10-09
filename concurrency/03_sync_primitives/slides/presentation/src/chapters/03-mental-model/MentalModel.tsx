import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./MentalModel.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三句话总结（step 3，三行分栏，随口播节拍先后亮起）。 */
const SUMMARY = [
  { code: "asyncio.Queue", cn: "单线程世界的传送带", talk: "满了 put 就挂起", at: 200 },
  { code: "Semaphore", cn: "并发闸门", talk: "拿不到许可的，排队等", at: 5300 },
  { code: "无界队列", cn: "反面教材", talk: "生产狂奔 · 内存堆积", at: 10000 },
] as const;

export default function MentalModelChapter({ step }: ChapterStepProps) {
  /* step 0 — 心智模型：食堂出餐口的传送带 */
  if (step === 0) {
    return (
      <div className="scene-pad mm-scene">
        <div className="mm-head mm-rise">
          <span className="label-mono">心智模型 · 食堂出餐口</span>
        </div>
        <div className="mm-canteen">
          <div className="mm-stove mm-rise" style={delay(300)}>
            <div className="mm-stove-name">灶台</div>
            <div className="mm-stove-role">生产者</div>
          </div>
          <div className="mm-belt-wrap mm-rise" style={delay(900)}>
            <div className="mm-belt">
              {[0, 1, 2].map((i) => (
                <span key={i} className="mm-plate mm-plate-run" style={delay(1400 + i * 800)} />
              ))}
            </div>
            <div className="mm-belt-note label-mono">asyncio.Queue</div>
          </div>
          <div className="mm-window mm-rise" style={delay(1200)}>
            <div className="mm-window-name">取餐窗口</div>
            <div className="mm-window-role">消费者</div>
          </div>
        </div>
        <div className="mm-foot mm-rise" style={delay(2600)}>
          灶台不停往上放菜 · 窗口不停取
        </div>
      </div>
    );
  }

  /* step 1 — 容量上限：放满按住灶台 */
  if (step === 1) {
    return (
      <div className="scene-pad mm-scene">
        <div className="mm-head mm-rise">
          <span className="label-mono">和真传送带不一样 · 有容量上限</span>
        </div>
        <div className="mm-canteen">
          <div className="mm-stove mm-stove--held">
            <div className="mm-stove-name">灶台</div>
            <div className="mm-hold-sign mm-pop" style={delay(1700)}>按住 · 暂停出菜</div>
          </div>
          <div className="mm-belt-wrap mm-belt-wrap--full">
            <div className="mm-belt mm-belt--slots">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="mm-slot">
                  <span className="mm-plate mm-plate-fill" style={delay(300 + i * 220)} />
                </span>
              ))}
            </div>
            <div className="mm-belt-note label-mono">带子满了</div>
          </div>
          <div className="mm-window">
            <div className="mm-window-name">取餐窗口</div>
            <div className="mm-window-role">消费者 · 慢慢取</div>
          </div>
        </div>
        <div className="mm-notstack mm-rise" style={delay(2400)}>
          <span className="mm-notstack-stack">
            <span /><span /><span />
          </span>
          <span className="mm-notstack-cross mono">✕</span>
          <span className="mm-notstack-word">不是把菜摞到半空</span>
        </div>
      </div>
    );
  }

  /* step 2 — 背压命名卡 */
  if (step === 2) {
    return (
      <div className="scene-pad mm-scene mm-name-scene">
        <div className="mm-name-flow mm-rise" style={delay(200)}>
          <span className="mm-name-end">窗口</span>
          <span className="mm-name-arrows mono">
            ←←←
          </span>
          <span className="mm-name-word">压力顶回上游</span>
          <span className="mm-name-arrows mono">←←←</span>
          <span className="mm-name-end">灶台</span>
        </div>
        <hr className="rule mm-name-rule mm-rise" style={delay(1000)} />
        <div className="mm-name-big mm-pop" style={delay(1400)}>
          这就是<span className="mm-name-acc">背压</span>
        </div>
        <div className="mm-name-en mono mm-rise" style={delay(1900)}>backpressure</div>
      </div>
    );
  }

  /* step 3 — 三句话总结（三行分栏） */
  if (step === 3) {
    return (
      <div className="scene-pad mm-scene">
        <div className="mm-head mm-rise">
          <span className="label-mono">三句话 · 记住这套零件</span>
        </div>
        <div className="mm-sum">
          {SUMMARY.map((s) => (
            <div className="mm-sum-row mm-rise" style={delay(s.at)} key={s.code}>
              <span className="mm-sum-code mono">{s.code}</span>
              <span className="mm-sum-cn">{s.cn}</span>
              <span className="mm-sum-talk">{s.talk}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 4 — 组织纪律 01：总量守恒（毒丸） */
  if (step === 4) {
    return (
      <div className="scene-pad mm-scene">
        <div className="mm-head mm-rise">
          <span className="label-mono">组织纪律 01 · 总量守恒</span>
        </div>
        <div className="mm-pill-row">
          {["消费者 A", "消费者 B"].map((c, i) => (
            <div className="mm-pill-lane" key={c}>
              <div className="mm-pill-box mm-rise" style={delay(400 + i * 300)}>{c}</div>
              <span className="mm-pill-arrow mm-rise" style={delay(900 + i * 300)}>→</span>
              <div className="mm-pill mm-pop" style={delay(1200 + i * 300)}>
                <span className="mono">None</span>
              </div>
              <span className="mm-pill-arrow mm-rise" style={delay(1800 + i * 300)}>→</span>
              <div className="mm-pill-exit mm-rise" style={delay(2100 + i * 300)}>干完 · 退场</div>
            </div>
          ))}
        </div>
        <div className="mm-pill-gloss mm-rise" style={delay(2800)}>
          <span className="label-mono">毒丸</span>
          「干完就退场」的哨兵信号
        </div>
        <div className="mm-pill-count mm-rise" style={delay(3400)}>
          <span className="hero-num mm-pill-num">5000 / 5000</span>
          <span className="mm-pill-count-note">恰好处理一遍 · 一条不丢</span>
        </div>
      </div>
    );
  }

  /* step 5 — 组织纪律 02 / 03 */
  return (
    <div className="scene-pad mm-scene">
      <div className="mm-head mm-rise">
        <span className="label-mono">组织纪律 02 / 03</span>
      </div>
      <div className="mm-disc">
        <div className="mm-disc-card mm-rise" style={delay(300)}>
          <div className="mm-disc-ord mono">02</div>
          <div className="mm-disc-name">并发上限</div>
          <div className="mm-disc-talk">
            Semaphore 的许可数
            <br />
            <b>钳制同时在飞的任务</b>
          </div>
        </div>
        <div className="mm-disc-card mm-rise" style={delay(1600)}>
          <div className="mm-disc-ord mono">03</div>
          <div className="mm-disc-name">内存上限</div>
          <div className="mm-disc-talk">
            队列设 <b className="mono">maxsize</b>
            <br />
            <b>长度有界</b>
          </div>
        </div>
      </div>
    </div>
  );
}
