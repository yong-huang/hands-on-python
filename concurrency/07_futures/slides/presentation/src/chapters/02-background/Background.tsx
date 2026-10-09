import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三堵墙（收束拍用；文案与 script 拍 12~16 的三个撞墙点一致）。 */
const WALLS = [
  { tag: "墙 01", name: "换后端＝重写" },
  { tag: "墙 02", name: "全批等齐" },
  { tag: "墙 03", name: "异常自己打包" },
] as const;

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — 转场：两条老路 */
  if (step === 0) {
    return (
      <div className="scene-pad fb-scene fb-intro-scene">
        <div className="label-mono fb-rise">BACKGROUND · 统一执行器出现之前</div>
        <div className="fb-intro-hero fb-rise" style={delay(500)}>
          Python 自带的<span className="fb-accent">两条老路</span>
        </div>
        <div className="fb-intro-roads">
          <span className="fb-intro-road mono fb-pop" style={delay(1700)}>路 A · Thread</span>
          <span className="fb-intro-road mono fb-pop" style={delay(2500)}>路 B · Pool</span>
        </div>
      </div>
    );
  }

  /* step 1 — 路 A：threading.Thread */
  if (step === 1) {
    return (
      <div className="scene-pad fb-scene fb-road-scene">
        <div className="fb-road-head fb-rise">
          <span className="fb-road-ord mono">路 A</span>
          <span className="fb-road-name mono">threading 的 Thread</span>
          <span className="fb-road-tag">线程的原生写法</span>
        </div>
        <div className="fb-road-card card fb-pop" style={delay(500)}>
          <div className="fb-act fb-rise" style={delay(2400)}>
            <span className="fb-act-verb mono">start</span>
            <span className="fb-act-talk">点火 —— 任务开跑</span>
          </div>
          <div className="fb-act fb-rise" style={delay(4800)}>
            <span className="fb-act-verb mono">join</span>
            <span className="fb-act-talk">进行等待 —— 原地等它干完</span>
          </div>
        </div>
        <div className="fb-road-note fb-rise" style={delay(7600)}>
          生命周期<span className="fb-accent">全靠自己管</span>
        </div>
      </div>
    );
  }

  /* step 2 — 路 B：multiprocessing.Pool */
  if (step === 2) {
    return (
      <div className="scene-pad fb-scene fb-road-scene">
        <div className="fb-road-head fb-rise">
          <span className="fb-road-ord mono">路 B</span>
          <span className="fb-road-name mono">multiprocessing 的 Pool</span>
          <span className="fb-road-tag">进程池的老一套用法</span>
        </div>
        <div className="fb-road-card card fb-pop" style={delay(500)}>
          <div className="fb-map-line fb-rise" style={delay(2400)}>
            <span className="fb-act-verb mono">map</span>
            <span className="fb-act-talk">一次提交一批</span>
          </div>
          <div className="fb-map-batch">
            {[0, 1, 2, 3].map((i) => (
              <span className="fb-map-box fb-pop" style={delay(3200 + i * 260)} key={i} />
            ))}
          </div>
        </div>
        <div className="fb-road-duo">
          <span className="fb-road-good fb-rise" style={delay(5000)}>省心</span>
          <span className="fb-road-bad fb-rise" style={delay(6600)}>但只会整批收发</span>
        </div>
      </div>
    );
  }

  /* step 3 — 形状不同：接口焊死 */
  if (step === 3) {
    return (
      <div className="scene-pad fb-scene fb-shape-scene">
        <div className="fb-shape-duo">
          <div className="fb-shape card fb-pop" style={delay(300)}>
            <div className="fb-shape-label mono">路 A 长这样</div>
            <div className="fb-shape-code mono">start() · join()</div>
          </div>
          <div className="fb-shape card fb-pop" style={delay(1100)}>
            <div className="fb-shape-label mono">路 B 长这样</div>
            <div className="fb-shape-code mono">Pool.map(一批)</div>
          </div>
        </div>
        <div className="fb-shape-hero fb-rise" style={delay(3000)}>
          这套固定用法，叫<span className="fb-accent">接口</span>
        </div>
        <div className="fb-shape-rewrite fb-rise" style={delay(5800)}>
          想换后端对比性能？<span className="fb-accent">推倒重来</span>
        </div>
      </div>
    );
  }

  /* step 4 — 撞墙二：map 全批等齐 */
  if (step === 4) {
    return (
      <div className="scene-pad fb-scene fb-wait-scene">
        <div className="fb-wait-head fb-rise">
          <span className="label-mono">Pool 也救不了 · map 全批等齐</span>
        </div>
        <div className="fb-wait-chart">
          <div className="fb-wait-row">
            <span className="fb-wait-name mono">快任务 1</span>
            <div className="fb-wait-bar fb-grow" style={delay(600)} />
            <span className="fb-wait-stuck fb-rise" style={delay(2400)}>干等</span>
          </div>
          <div className="fb-wait-row">
            <span className="fb-wait-name mono">快任务 2</span>
            <div className="fb-wait-bar fb-grow" style={delay(800)} />
            <span className="fb-wait-stuck fb-rise" style={delay(2600)}>干等</span>
          </div>
          <div className="fb-wait-row">
            <span className="fb-wait-name mono">慢任务</span>
            <div className="fb-wait-bar fb-wait-bar--slow fb-grow" style={delay(1000)} />
            <span className="fb-wait-stuck fb-wait-stuck--ok fb-rise" style={delay(2800)}>它在跑</span>
          </div>
          <div className="fb-wait-gate fb-rise" style={delay(2400)}>
            <span className="fb-wait-gate-line" />
            <span className="fb-wait-gate-tag mono">全部在这里才放行</span>
          </div>
        </div>
        <div className="fb-wait-hero fb-rise" style={delay(4600)}>
          快任务被拖住，<span className="fb-accent">一起才返回</span>
        </div>
      </div>
    );
  }

  /* step 5 — 撞墙三：异常自己打包寄回 */
  if (step === 5) {
    return (
      <div className="scene-pad fb-scene fb-err-scene">
        <div className="fb-err-head fb-rise">
          <span className="label-mono">出错更麻烦 · 程序出的错 ＝ 异常</span>
        </div>
        <div className="fb-err-flow">
          <div className="fb-err-worker card fb-pop" style={delay(400)}>
            <span className="fb-err-dot" />
            <span className="mono">worker</span>
            <span className="fb-err-chip mono fb-pop" style={delay(1800)}>炸了！</span>
          </div>
          <div className="fb-err-parcel fb-pop" style={delay(3800)}>
            <span className="fb-err-parcel-box" />
            <span className="mono">自己打包</span>
          </div>
          <span className="fb-err-arrow fb-grow" style={delay(5000)}>→</span>
          <div className="fb-err-main card fb-pop" style={delay(5600)}>
            <div className="mono">主线程</div>
            <div className="fb-err-main-sub">＝ 你的主程序</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 三堵墙一次推倒（fallthrough 兜底步） */
  return (
    <div className="scene-pad fb-scene fb-wall-scene">
      <div className="fb-wall-row">
        {WALLS.map((w, i) => (
          <div className="fb-wall-cell fb-pop" style={delay(i * 600)} key={w.tag}>
            <div className="fb-wall fb-topple" style={delay(4400 + i * 300)}>
              <div className="fb-wall-tag mono">{w.tag}</div>
              <div className="fb-wall-name">{w.name}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="fb-wall-pep card fb-pop" style={delay(6000)}>
        <div className="mono fb-wall-pep-tag">PEP 3148 · Python 3.2</div>
        <div className="fb-wall-pep-main">统一执行器，进了标准库</div>
      </div>
      <div className="fb-wall-hero fb-rise" style={delay(7800)}>
        三堵墙，<span className="fb-accent">一次推倒</span>
      </div>
    </div>
  );
}
