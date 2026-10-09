import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const PITS = [
  {
    tag: "坑一",
    title: "默认间隔下测不出竞态，就说代码「线程安全」",
    result: <>5 毫秒太温和，测不出 ≠ 不存在——换台负载重的机器，结论可能反转</>,
    fix: <>压低间隔，或构造调用边界再测</>,
  },
  {
    tag: "坑二",
    title: "拿 time.sleep(0) 当切换点",
    result: <>它本意是歇一拍让别人上，系统可能歇完又让你接着干——白让</>,
    fix: <>想稳定地切换，用一个普通函数调用</>,
  },
  {
    tag: "坑三",
    title: "对「更慢」的基准结果不假思索",
    result: <>看到线程版慢就急着优化——方向可能根本不对</>,
    fix: <>先分辨：是切换税，还是几个线程在门口抢同一把锁</>,
  },
    {
      tag: "坑四",
      title: "看见 counter 加一拆成好几小步，就断言必丢",
      result: <>实测分毫不差，被打脸——非原子只是必要条件</>,
      fix: <>还得切换点落在小步中间，两个条件同时满足才算数</>,
    },
];

function PitCard({ pit, delayMs }: { pit: (typeof PITS)[number]; delayMs: number }) {
  return (
    <div className="pf-card pf-pop" style={delay(delayMs)}>
      <div className="pf-card-tag mono">{pit.tag}</div>
      <div className="pf-card-title">{pit.title}</div>
      <div className="pf-card-row pf-rise" style={delay(delayMs + 800)}>
        <span className="pf-card-label mono">后果</span>
        <span className="pf-card-text">{pit.result as ReactNode}</span>
      </div>
      <div className="pf-card-row pf-rise" style={delay(delayMs + 1600)}>
        <span className="pf-card-label mono">解法</span>
        <span className="pf-card-text">{pit.fix as ReactNode}</span>
      </div>
    </div>
  );
}

export default function PitfallsChapter({ step }: ChapterStepProps) {
  if (step === 0) {
    return (
      <div className="scene-pad pf-scene pf-pit-scene">
        <div className="pf-thesis pf-rise">四个实测中的坑</div>
        <PitCard pit={PITS[0]} delayMs={400} />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="scene-pad pf-scene pf-pit-scene">
        <PitCard pit={PITS[1]} delayMs={200} />
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="scene-pad pf-scene pf-pit-scene">
        <PitCard pit={PITS[2]} delayMs={200} />
      </div>
    );
  }
  return (
    <div className="scene-pad pf-scene pf-pit-scene">
      <div className="pf-thesis pf-rise">四个实测中的坑 · 最后一坑</div>
      <PitCard pit={PITS[3]} delayMs={300} />
    </div>
  );
}
