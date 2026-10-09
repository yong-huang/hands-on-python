import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三个运行时行为（递进列表；数据角标来自 article 实测）。 */
const BEHAVIORS = [
  { ord: "01", name: "线程在纯计算上白忙活", talk: "速度只剩 0.75 倍" },
  { ord: "02", name: "进程才是真并行", talk: "实测 2.5 倍加速" },
  { ord: "03", name: "静默失败", talk: "报了成功，结果照样丢" },
] as const;

/** 冷开场三问的引用卡内容。 */
const QUESTIONS = [
  {
    ord: "01",
    text: "4 个线程一起计算，怎么比单线程还慢？",
    note: "线程 ＝ 程序里并排干活的小分队",
  },
  {
    ord: "02",
    text: "换成 4 个进程，一下快了 2.5 倍——为什么？",
    note: null as string | null,
  },
  {
    ord: "03",
    text: "有时候程序显示一切正常，结果却悄悄丢了一部分。",
    note: null as string | null,
  },
];

/** 三跑法实测（秒）；条宽按 0.66 为满幅归一。 */
const RACES = [
  { name: "串行", en: "serial", sec: "0.49s", w: 74, tone: "dim" },
  { name: "4 线程", en: "threads", sec: "0.66s", w: 100, tone: "worst" },
  { name: "4 进程", en: "Pool(4)", sec: "0.20s", w: 30, tone: "best" },
] as const;

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="label-mono hk-rise">PYTHON · CONCURRENCY 05</div>
          <hr className="rule hk-title-rule hk-rise" style={delay(180)} />
          <h1 className="hk-title-main hk-rise" style={delay(320)}>
            多核<span className="hk-title-accent">加速</span>
          </h1>
          <div className="hk-title-en hk-rise" style={delay(620)}>
            True Parallelism, Beyond the GIL
          </div>
          <div className="hk-title-sub hk-rise" style={delay(820)}>
            绕开 GIL 的真并行
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={delay(1050)}>
          <div className="hk-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>concurrency / 05</b></div>
          <div className="hk-tb-row"><span>API</span><b>multiprocessing.Pool</b></div>
        </div>
      </div>
    );
  }

  /* step 1~3 — 冷开场三问：引用卡（问题 01/02/03） */
  if (step === 1 || step === 2 || step === 3) {
    const q = QUESTIONS[step - 1];
    return (
      <div className="scene-pad hk-scene hk-quote-scene">
        <div className="hk-quote-head hk-rise">
          <span className="label-mono">多进程 · 三问</span>
          <span className="hk-quote-ord mono">{q.ord} / 03</span>
        </div>
        <hr className="rule hk-quote-rule hk-rise" style={delay(200)} />
        <blockquote className="hk-quote hk-rise" style={delay(420)}>
          「{q.text}」
        </blockquote>
        {q.note && (
          <div className="hk-quote-note hk-rise" style={delay(1300)}>
            <span className="label-mono">名词</span>
            {q.note}
          </div>
        )}
      </div>
    );
  }

  /* step 4~6 — 三问收束为三件事（递进列表：讲到哪条哪条亮，前条灰化） */
  if (step === 4 || step === 5 || step === 6) {
    const active = step - 4;
    return (
      <div className="scene-pad hk-scene hk-list-scene">
        <div className="hk-list-head hk-rise">
          <span className="label-mono">三个问题 · 三件事</span>
        </div>
        <div className="hk-list">
          {BEHAVIORS.map((b, i) => {
            const state =
              i < active ? "hk-row--done" : i === active ? "hk-row--active" : "hk-row--todo";
            return (
              <div className={`hk-row ${state}${i === active ? " hk-row-enter" : ""}`} key={b.ord}>
                <span className="hk-row-ord mono">{b.ord}</span>
                <div className="hk-row-body">
                  <div className="hk-row-name">{b.name}</div>
                  {i <= active && <div className="hk-row-talk">{b.talk}</div>}
                </div>
                {i < active && <span className="hk-row-mark mono">{"✓\uFE0E"}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* step 7 — 预告：三种跑法同场比武（时间条 0.49 / 0.66 / 0.20 秒） */
  return (
    <div className="scene-pad hk-scene hk-race-scene">
      <div className="hk-race-kicker hk-rise">
        <span className="label-mono">BENCHMARK · 4 × 素数计数</span>
      </div>
      <div className="hk-race">
        {RACES.map((r, i) => (
          <div className="hk-race-row" key={r.name}>
            <div className="hk-race-name hk-rise" style={delay(i * 620)}>
              {r.name}
              <span className="hk-race-en mono">{r.en}</span>
            </div>
            <div className="hk-race-track">
              <div
                className={`hk-race-bar hk-race-bar--${r.tone} hk-bar-grow`}
                style={{ ...delay(200 + i * 620), width: `${r.w}%` }}
              />
            </div>
            <div className="hk-race-sec mono hk-rise" style={delay(420 + i * 620)}>
              {r.sec}
            </div>
          </div>
        ))}
      </div>
      <div className="hk-race-tagline hk-rise" style={delay(2100)}>
        挨个<span className="hk-tag-accent">分析给你看</span>
      </div>
    </div>
  );
}
