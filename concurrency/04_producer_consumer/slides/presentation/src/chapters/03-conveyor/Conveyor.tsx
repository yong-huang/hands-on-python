import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Conveyor.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 部件地图·左半：生产者×3 → 队列。step 5 逐块点亮，step 6 全图复用。 */
function MapLeft({ base }: { base: number }) {
  return (
    <>
      <div className="cv-map-producers">
        {["p0", "p1", "p2"].map((p, i) => (
          <div className="cv-map-producer cv-pop" style={delay(base + i * 550)} key={p}>
            <span className="cv-map-ord mono">{p}</span>
            <span className="cv-map-name">生产者</span>
            <span className="cv-map-talk">生成任务</span>
          </div>
        ))}
      </div>
      <span className="cv-map-join cv-rise" style={delay(base + 1750)} aria-hidden>
        {"汇入 →"}
      </span>
      <div className="cv-map-queue cv-pop" style={delay(base + 2050)}>
        <div className="cv-map-queue-name mono">queue.Queue</div>
        <div className="cv-map-queue-talk">容量上限 10 · 一满就按住生产者</div>
      </div>
    </>
  );
}

/** 部件地图·右半：消费者×2 → 计数账本 → main。step 6 点亮。 */
function MapRight({ base }: { base: number }) {
  return (
    <>
      <span className="cv-map-join cv-rise" style={delay(base)} aria-hidden>
        {"→"}
      </span>
      <div className="cv-map-consumers">
        {[0, 1].map((i) => (
          <div className="cv-map-consumer cv-pop" style={delay(base + 250 + i * 550)} key={i}>
            <span className="cv-map-ord mono">c{i}</span>
            <span className="cv-map-name">消费者</span>
            <span className="cv-map-talk">取 → 处理 → 交回执</span>
            <span className="cv-map-talk cv-map-talk--poison">取到毒丸 · 就退出</span>
          </div>
        ))}
      </div>
      <span className="cv-map-join cv-rise" style={delay(base + 1400)} aria-hidden>
        {"→"}
      </span>
      <div className="cv-map-node cv-pop" style={delay(base + 1650)}>
        <span className="cv-map-name">计数账本</span>
        <span className="cv-map-talk mono">dict + Lock</span>
        <span className="cv-map-talk">锁护着更新</span>
      </div>
      <span className="cv-map-join cv-rise" style={delay(base + 2300)} aria-hidden>
        {"→"}
      </span>
      <div className="cv-map-node cv-pop" style={delay(base + 2550)}>
        <span className="cv-map-name">main</span>
        <span className="cv-map-talk">程序自带的线程 · 收尾汇总</span>
      </div>
    </>
  );
}

export default function ConveyorChapter({ step }: ChapterStepProps) {
  /* step 0 — 主角登场：queue.Queue ＝ 带回执的传送带 */
  if (step === 0) {
    return (
      <div className="scene-pad cv-scene cv-hero-scene">
        <div className="label-mono cv-rise">STDLIB · 标准库自带 · 开箱即用</div>
        <div className="cv-hero mono cv-rise" style={delay(280)}>
          queue.Queue
        </div>
        <hr className="rule rule-accent cv-hero-rule cv-rise" style={delay(520)} />
        <div className="cv-hero-tagline cv-rise" style={delay(800)}>
          一句话记住它：<span className="cv-accent">带回执的传送带</span>
        </div>
        <div className="cv-hero-en cv-rise" style={delay(1500)}>
          A conveyor belt with receipts
        </div>
      </div>
    );
  }

  /* step 1 — 传送带底图：上游放、下游取，预告三处不同 */
  if (step === 1) {
    return (
      <div className="scene-pad cv-scene cv-belt-scene">
        <div className="cv-head cv-rise">
          <span className="label-mono">心智模型 · 传送带</span>
        </div>
        <div className="cv-belt-flow">
          <div className="cv-endpoint cv-pop">
            <div className="cv-endpoint-name">上游</div>
            <div className="cv-endpoint-talk">发货的那头 · 不停往上放</div>
          </div>
          <div className="cv-belt" aria-hidden>
            <div className="cv-belt-band" />
            <div className="cv-belt-dots" />
            {[0, 1].map((i) => (
              <span className="cv-crate cv-crate--run" style={delay(500 + i * 1700)} key={i}>
                任务
              </span>
            ))}
            <span className="cv-crate cv-crate--run-stay" style={delay(3900)}>
              任务
            </span>
          </div>
          <div className="cv-endpoint cv-pop" style={delay(320)}>
            <div className="cv-endpoint-name">下游</div>
            <div className="cv-endpoint-talk">接货那头 · 按节奏取</div>
          </div>
        </div>
        <div className="cv-tagline cv-rise" style={delay(4300)}>
          和真实传送带有<span className="cv-accent">三处不同</span>——工程上全靠它们
        </div>
      </div>
    );
  }

  /* step 2 — 第一处·背压：装满，按住上游 */
  if (step === 2) {
    return (
      <div className="scene-pad cv-scene cv-bp-scene">
        <div className="cv-head cv-rise">
          <span className="label-mono">第一处 · 背压 backpressure</span>
        </div>
        <div className="cv-bp-stage">
          <div className="cv-bp-producer cv-pop">
            <div className="cv-endpoint-name">生产者</div>
            <div className="cv-endpoint-talk">想再放 · 塞不进</div>
            <span className="cv-bp-hold cv-pop" style={delay(3400)}>
              被按住
            </span>
          </div>
          <span className="cv-bp-arrow cv-rise" style={delay(300)} aria-hidden>
            →
          </span>
          <div className="cv-bp-belt" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <span className="cv-slot cv-pop" style={delay(350 + i * 260)} key={i} />
            ))}
          </div>
        </div>
        <div className="cv-bp-count mono cv-rise" style={delay(3100)}>
          10 / 10 · 已装满
        </div>
        <div className="cv-tagline cv-rise" style={delay(4400)}>
          装满时<span className="cv-accent">按住上游</span>——不让货堆到地上
        </div>
        <div className="cv-note cv-rise" style={delay(5800)}>
          <span className="label-mono">白话</span>
          下游来不及消费，压力反传给上游
        </div>
      </div>
    );
  }

  /* step 3 — 第二处·回执：每件货签字回执 */
  if (step === 3) {
    return (
      <div className="scene-pad cv-scene cv-rc-scene">
        <div className="cv-head cv-rise">
          <span className="label-mono">第二处 · 回执</span>
        </div>
        <div className="cv-rc-stage">
          <div className="cv-rc-belt" aria-hidden>
            <div className="cv-belt-band" />
            <span className="cv-crate cv-crate--slide cv-crate--tagged" style={delay(300)}>
              任务
              <span className="cv-receipt-tag cv-pop" style={delay(1600)}>
                签字回执
              </span>
            </span>
          </div>
          <span className="cv-bp-arrow cv-rise" style={delay(1200)} aria-hidden>
            →
          </span>
          <div className="cv-endpoint cv-pop" style={delay(1400)}>
            <div className="cv-endpoint-name">下游</div>
            <div className="cv-endpoint-talk">取一件 · 交一张</div>
          </div>
          <span className="cv-bp-arrow cv-rise" style={delay(2400)} aria-hidden>
            →
          </span>
          <div className="cv-rc-box cv-pop" style={delay(2700)}>
            <div className="cv-endpoint-name">回执盒</div>
            <div className="cv-endpoint-talk mono">
              回执 <span className="cv-rc-tick cv-pop" style={delay(3700)}>×1</span>
            </div>
            <div className="cv-rc-api mono cv-rise" style={delay(4400)}>
              task_done · join 清点的依据
            </div>
          </div>
        </div>
        <div className="cv-tagline cv-rise" style={delay(4300)}>
          没有回执，<span className="cv-accent">收尾清点永远数不完</span>
        </div>
      </div>
    );
  }

  /* step 4 — 第三处·毒丸：收尾信号 */
  if (step === 4) {
    return (
      <div className="scene-pad cv-scene cv-ps-scene">
        <div className="cv-head cv-rise">
          <span className="label-mono">第三处 · 收尾信号 毒丸 sentinel</span>
        </div>
        <div className="cv-ps-stage">
          <div className="cv-ps-belt" aria-hidden>
            <div className="cv-belt-band" />
            {[0, 1].map((i) => (
              <span className="cv-crate cv-crate--slide" style={delay(400 + i * 700)} key={i}>
                任务
              </span>
            ))}
            <span className="cv-crate cv-crate--slide cv-crate--poison" style={delay(2300)}>
              毒丸
            </span>
          </div>
          <span className="cv-bp-arrow cv-rise" style={delay(1500)} aria-hidden>
            →
          </span>
          <div className="cv-endpoint cv-pop">
            <div className="cv-endpoint-name">消费者</div>
            <div className="cv-endpoint-talk">本在等货</div>
            <span className="cv-ps-off cv-pop" style={delay(4200)}>
              取到毒丸 · 退出
            </span>
          </div>
        </div>
        <div className="cv-tagline cv-rise" style={delay(5200)}>
          一个<span className="cv-accent">跟真任务长得绝不一样</span>的记号
        </div>
        <div className="cv-note cv-rise" style={delay(6400)}>
          <span className="label-mono">白话</span>
          真任务永远不会被误认成它——取到，就知道该退了
        </div>
      </div>
    );
  }

  /* step 5 — 部件地图·左半：任务汇入传送带 */
  if (step === 5) {
    return (
      <div className="scene-pad cv-scene cv-map-scene">
        <div className="cv-head cv-rise">
          <span className="label-mono">部件地图 · 从左到右 1/2</span>
        </div>
        <div className="cv-map">
          <MapLeft base={350} />
          <span className="cv-map-join cv-map-join--ghost" aria-hidden>
            →
          </span>
          <div className="cv-map-ghost" aria-hidden>
            <span className="cv-map-ghost-name">下游</span>
            <span className="cv-map-ghost-talk">右半 · 下一步点亮</span>
          </div>
        </div>
        <div className="cv-note cv-rise" style={delay(5300)}>
          <span className="label-mono">左半</span>
          任务从三个生产者汇入同一条传送带
        </div>
      </div>
    );
  }

  /* step 6 — 部件地图·右半：完整流水线五部件 */
  if (step === 6) {
    return (
      <div className="scene-pad cv-scene cv-map-scene">
        <div className="cv-head cv-rise">
          <span className="label-mono">部件地图 · 从左到右 2/2</span>
        </div>
        <div className="cv-map cv-map--full">
          <MapLeft base={250} />
          <MapRight base={4300} />
        </div>
        <div className="cv-note cv-rise" style={delay(7300)}>
          <span className="label-mono">五个部件</span>
          生产者×3 → 队列 → 消费者×2 → 计数账本 → main 收尾
        </div>
      </div>
    );
  }

  /* step 7 — 汇流：任务与毒丸走同一条带 */
  const streams = [
    { from: "三个生产者", what: "任务流", poison: false },
    { from: "main 收尾", what: "毒丸流", poison: true },
  ];
  return (
    <div className="scene-pad cv-scene cv-mix-scene">
      <div className="cv-head cv-rise">
        <span className="label-mono">生产侧 · 两个来源 一条传送带</span>
      </div>
      <div className="cv-mix">
        <div className="cv-mix-sources">
          {streams.map((s, i) => (
            <div className="cv-mix-row" key={s.what}>
              <div className="cv-mix-from cv-pop" style={delay(300 + i * 500)}>
                <span className="cv-mix-from-name">{s.from}</span>
                <span className={`cv-mix-stream${s.poison ? " cv-mix-stream--poison" : ""}`} aria-hidden>
                  {[0, 1, 2].map((d) => (
                    <span
                      className={`cv-stream-dot${s.poison ? " cv-stream-dot--poison" : ""}`}
                      style={delay(900 + i * 300 + d * 800)}
                      key={d}
                    />
                  ))}
                </span>
                <span className="cv-mix-what mono">{s.what}</span>
              </div>
            </div>
          ))}
        </div>
        <span className="cv-mix-merge cv-rise" style={delay(3600)} aria-hidden>
          {"汇入 →"}
        </span>
        <div className="cv-mix-belt cv-pop" style={delay(3900)} aria-hidden>
          <div className="cv-belt-band" />
          同一条传送带
        </div>
        <span className="cv-bp-arrow cv-rise" style={delay(4300)} aria-hidden>
          →
        </span>
        <div className="cv-endpoint cv-pop" style={delay(4500)}>
          <div className="cv-endpoint-name">消费者</div>
          <div className="cv-endpoint-talk">分不清 · 不需要分</div>
        </div>
      </div>
      <div className="cv-tagline cv-rise" style={delay(5400)}>
        取到毒丸，<span className="cv-accent">就退出</span>
      </div>
    </div>
  );
}
