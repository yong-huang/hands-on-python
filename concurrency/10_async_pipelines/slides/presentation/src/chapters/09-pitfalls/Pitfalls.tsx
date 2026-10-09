import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 坑卡骨架：现象 → 原因 → 解法 三段（PLAYBOOK 口径）。 */
function PitfallCard(props: {
  ord: string;
  total: string;
  name: string;
  symptom: ReactNode;
  cause: ReactNode;
  fix: ReactNode;
}) {
  return (
    <div className="pf-scene-inner">
      <div className="pf-head pf-rise">
        <span className="label-mono">四个真实踩过的坑</span>
        <span className="pf-progress mono">
          {props.ord} / {props.total}
        </span>
      </div>
      <div className="pf-title pf-rise" style={delay(200)}>
        <span className="pf-title-ord mono">{props.ord}</span>
        {props.name}
      </div>
      <div className="pf-rows">
        <div className="pf-row pf-rise" style={delay(1300)}>
          <span className="pf-row-tag label-mono">现象</span>
          <span className="pf-row-text">{props.symptom}</span>
        </div>
        <div className="pf-row pf-rise" style={delay(2600)}>
          <span className="pf-row-tag label-mono">原因</span>
          <span className="pf-row-text">{props.cause}</span>
        </div>
        <div className="pf-row pf-row--fix pf-rise" style={delay(4400)}>
          <span className="pf-row-tag pf-row-tag--fix label-mono">解法</span>
          <span className="pf-row-text">{props.fix}</span>
        </div>
      </div>
    </div>
  );
}

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0 — 坑一：协程里调阻塞函数 */
  if (step === 0) {
    return (
      <div className="scene-pad pf-scene">
        <PitfallCard
          ord="01"
          total="04"
          name="在协程里调阻塞函数"
          symptom={
            <>
              整个程序卡住，别的协程<b>全部停摆</b>——Semaphore 也救不了
            </>
          }
          cause={
            <>
              阻塞调用<b>冻住了事件循环</b>：<span className="mono">time.sleep</span>、同步
              <span className="mono"> requests</span>
            </>
          }
          fix={
            <>
              一律换异步库：<span className="mono">asyncio.sleep</span>、aiohttp
            </>
          }
        />
      </div>
    );
  }

  /* step 1 — 坑二：无界队列 + 生产快于消费 */
  if (step === 1) {
    return (
      <div className="scene-pad pf-scene">
        <PitfallCard
          ord="02"
          total="04"
          name="无界队列 · 生产快于消费"
          symptom={
            <>
              压测每秒请求数<b>看着正常</b>，内存却<b>持续上涨</b>
            </>
          }
          cause={<>队列无限堆积——两条曲线只盯着一条看，就会漏掉</>}
          fix={
            <>
              <span className="mono">maxsize</span> 开背压 + <b>监控队列长度</b>
            </>
          }
        />
        <div className="pf-curves pf-rise" style={delay(3400)}>
          <svg viewBox="0 0 560 150" className="pf-curve-svg" aria-hidden>
            <polyline
              className="pf-curve pf-curve--flat"
              points="10,75 130,72 250,78 370,70 490,74 550,72"
            />
            <polyline
              className="pf-curve pf-curve--up"
              points="10,140 130,120 250,95 370,62 490,30 550,12"
            />
          </svg>
          <div className="pf-curve-legend">
            <span className="pf-legend-item">
              <span className="pf-legend-line pf-legend-line--flat" />
              每秒请求数 · 平的
            </span>
            <span className="pf-legend-item">
              <span className="pf-legend-line pf-legend-line--up" />
              内存 · 一路涨
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 坑三：忘发毒丸 */
  if (step === 2) {
    return (
      <div className="scene-pad pf-scene">
        <PitfallCard
          ord="03"
          total="04"
          name="忘了给消费者发毒丸"
          symptom={
            <>
              程序退不出去——<span className="mono">get</span> 永远挂起，消费者不知道生产已结束
            </>
          }
          cause={<>生产结束了，没人告诉消费者</>}
          fix={
            <>
              每个消费者发一枚 <b className="mono">None</b> 哨兵——线程版的教训，原样成立
            </>
          }
        />
      </div>
    );
  }

  /* step 3 — 坑四：Semaphore 包错范围 */
  return (
    <div className="scene-pad pf-scene">
      <PitfallCard
        ord="04"
        total="04"
        name="Semaphore 包错范围"
        symptom={
          <>
            限流加了，吞吐反而<b>掉一个数量级——慢了十倍</b>
          </>
        }
        cause={
          <>
            把<b>整个循环体</b>都包进去了——粒度过大
          </>
        }
        fix={
          <>
            只包<b>受限资源那几行</b>——锁要锁得少、锁得准，许可同理
          </>
        }
      />
      <div className="pf-scope pf-rise" style={delay(5400)}>
        <div className="pf-scope-cell pf-scope-cell--bad">
          <div className="pf-scope-tag label-mono">粒度过大</div>
          <div className="pf-scope-block">
            <div className="pf-scope-line pf-scope-line--all mono">async with sem:</div>
            <div className="pf-scope-line pf-scope-line--all pf-scope-line--in mono">for item in …:</div>
            <div className="pf-scope-line pf-scope-line--in mono">…整个循环体…</div>
          </div>
        </div>
        <div className="pf-scope-cell pf-scope-cell--good">
          <div className="pf-scope-tag pf-scope-tag--good label-mono">只包资源段</div>
          <div className="pf-scope-block">
            <div className="pf-scope-line mono">for item in …:</div>
            <div className="pf-scope-line pf-scope-line--all pf-scope-line--in mono">
              async with sem:
            </div>
            <div className="pf-scope-line pf-scope-line--in mono">…受限几行…</div>
          </div>
        </div>
      </div>
    </div>
  );
}
