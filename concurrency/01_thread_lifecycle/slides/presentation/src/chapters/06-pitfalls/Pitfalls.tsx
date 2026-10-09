import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0 — 证据采集：append 原子 vs print */
  if (step === 0) {
    return (
      <div className="scene-pad pf-scene pf-evidence-scene">
        <div className="pf-thesis pf-rise">实验怎么记录谁先谁后？</div>
        <div className="pf-evidence-cols">
          <div className="pf-ev-card pf-ev-card--no pf-pop" style={delay(400)}>
            <div className="pf-ev-head mono">{"✗\uFE0E"} print</div>
            <div className="pf-ev-body">攒够一整行才吐出</div>
          </div>
          <div className="pf-ev-card pf-ev-card--yes pf-pop" style={delay(1200)}>
            <div className="pf-ev-head mono">{"✓\uFE0E"} events.append</div>
            <div className="pf-ev-body">
              一口气做完 · <b className="pf-accent">中间插不进手</b>
            </div>
            <div className="pf-ev-note">
              <span className="label-mono">专业说法</span>原子操作 —— 顺序可信，也不丢
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — print 行缓冲 */
  if (step === 1) {
    return (
      <div className="scene-pad pf-scene pf-buffer-scene">
        <div className="pf-buffer-box pf-rise" style={delay(300)}>
          <span className="label-mono">行缓冲 · 攒够一整行才吐出</span>
          <div className="pf-buffer-line mono">
            {"线程 A 完成_"}
          </div>
        </div>
        <div className="pf-buffer-hero pf-rise" style={delay(1500)}>
          你看到的打印顺序，
          <br />
          <b className="pf-accent">可能是假的</b>
        </div>
      </div>
    );
  }

  /* step 2~5 — 四个坑：统一坑卡骨架（踩法 / 后果 / 原因 / 解法） */
  const PITS = [
    {
      tag: "坑一",
      title: "手动 run() 之后，再对同一个对象 start()",
      result: (
        <>新线程一启动就报错 <span className="pf-chip mono">AttributeError</span></>
      ),
      cause: <>run() 的收尾会把「要干的活」清掉 —— 再 start，找不到活干了</>,
      fix: <>想重跑，给 run() 单独一个新对象</>,
    },
    {
      tag: "坑二",
      title: "用 print 顺序当证据",
      result: <>你看到的先后 ≠ 真实的先后 —— 都不能当证据</>,
      cause: null,
      fix: <>收集数据用 queue.Queue（排队容器 · 防插队）；图省事，append 也行</>,
    },
    {
      tag: "坑三",
      title: "在 daemon 里写文件、存数据",
      result: <>干到一半被掐死 —— 半截数据比没数据更糟</>,
      cause: null,
      fix: <>可靠收尾用普通线程 + join()</>,
    },
    {
      tag: "坑四",
      title: "daemon 设置晚了",
      result: (
        <>start() 之后再设 → <span className="pf-chip mono">RuntimeError</span>，属性冻结</>
      ),
      cause: null,
      fix: <>设置要赶在 start() 之前</>,
    },
  ] as const;

  const PitCard = ({
    pit,
    showCause,
    showFix = true,
    delayMs,
  }: {
    pit: (typeof PITS)[number];
    showCause?: boolean;
    showFix?: boolean;
    delayMs?: number;
  }) => (
    <div className="pf-card pf-pop" style={delay(delayMs ?? 300)}>
      <div className="pf-card-tag mono">{pit.tag}</div>
      <div className="pf-card-title">{pit.title}</div>
      <div className="pf-card-row pf-rise" style={delay((delayMs ?? 300) + 800)}>
        <span className="pf-card-label mono">后果</span>
        <span className="pf-card-text">{pit.result}</span>
      </div>
      {showCause && (
        <div className="pf-card-row pf-rise" style={delay(500)}>
          <span className="pf-card-label mono">原因</span>
          <span className="pf-card-text">{pit.cause}</span>
        </div>
      )}
      {showFix && (
        <div className="pf-card-row pf-rise" style={delay((delayMs ?? 300) + 1500)}>
          <span className="pf-card-label mono">解法</span>
          <span className="pf-card-text">{pit.fix}</span>
        </div>
      )}
    </div>
  );

  /* step 2 — 坑一：踩法 + 后果（原因/解法下一拍） */
  if (step === 2) {
    return (
      <div className="scene-pad pf-scene pf-pit-scene">
        <div className="pf-thesis pf-rise">四个真实踩过的坑</div>
        <PitCard pit={PITS[0]} showFix={false} delayMs={400} />
      </div>
    );
  }

  /* step 3 — 坑一：补原因行（同一张卡） */
  if (step === 3) {
    return (
      <div className="scene-pad pf-scene pf-pit-scene">
        <div className="pf-thesis pf-rise">四个真实踩过的坑</div>
        <PitCard pit={PITS[0]} showCause delayMs={200} />
      </div>
    );
  }

  /* step 4 — 坑二 + 坑三（同骨架双卡） */
  if (step === 4) {
    return (
      <div className="scene-pad pf-scene pf-pit-duo">
        <div className="pf-pit-duo-row">
          <PitCard pit={PITS[1]} delayMs={200} />
          <PitCard pit={PITS[2]} delayMs={1300} />
        </div>
      </div>
    );
  }

  /* step 5 — 坑四 */
  return (
    <div className="scene-pad pf-scene pf-pit-scene">
      <div className="pf-thesis pf-rise">四个真实踩过的坑 · 最后一坑</div>
      <PitCard pit={PITS[3]} delayMs={300} />
    </div>
  );
}
