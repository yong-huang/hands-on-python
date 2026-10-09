import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三个运行时行为（递进列表；白话副行来自 script.md 对应拍）。 */
const BEHAVIORS = [
  { ord: "01", name: "交错顺序没法复现", talk: "谁先谁后，操作系统说了算" },
  { ord: "02", name: "run() 不开线程", talk: "你以为开了新线程，其实没有" },
  { ord: "03", name: "daemon 说死就死", talk: "标记成「不用等它」的后台线程" },
] as const;

/** 冷开场三问的引用卡内容。 */
const QUESTIONS = [
  {
    ord: "01",
    text: "这个 bug，我怎么测都测不出来。",
    note: null as string | null,
  },
  {
    ord: "02",
    text: "我明明启动了线程，怎么代码还在主线程里跑？",
    note: "主线程 ＝ 程序启动时就存在的线程",
  },
  {
    ord: "03",
    text: "程序退出前该收的尾——比如把文件存好——怎么压根没做？",
    note: null as string | null,
  },
];

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="label-mono hk-rise">PYTHON · CONCURRENCY 01</div>
          <hr className="rule hk-title-rule hk-rise" style={delay(180)} />
          <h1 className="hk-title-main hk-rise" style={delay(320)}>
            线程的<span className="hk-title-accent">一生</span>
          </h1>
          <div className="hk-title-en hk-rise" style={delay(620)}>
            The Life of a Thread
          </div>
          <div className="hk-title-sub hk-rise" style={delay(820)}>
            三个不亲眼看过就会踩坑的运行时行为
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={delay(1050)}>
          <div className="hk-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>concurrency / 01</b></div>
          <div className="hk-tb-row"><span>API</span><b>threading.Thread</b></div>
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
          <span className="label-mono">多线程 · 三问</span>
          <span className="hk-quote-ord mono">{q.ord} / 03</span>
        </div>
        <hr className="rule hk-quote-rule hk-rise" style={delay(200)} />
        <blockquote className="hk-quote hk-rise" style={delay(420)}>
          「{q.text}」
        </blockquote>
        {q.note && (
          <div className="hk-quote-note hk-rise" style={delay(1500)}>
            <span className="label-mono">名词</span>
            {q.note}
          </div>
        )}
      </div>
    );
  }

  /* step 4~6 — 三问收束为三行为（递进列表：讲到哪条哪条亮，前条灰化） */
  if (step === 4 || step === 5 || step === 6) {
    const active = step - 4;
    return (
      <div className="scene-pad hk-scene hk-list-scene">
        <div className="hk-list-head hk-rise">
          <span className="label-mono">三个问题 · 三个行为</span>
        </div>
        <div className="hk-list">
          {BEHAVIORS.map((b, i) => {
            const state =
              i < active ? "hk-row--done" : i === active ? "hk-row--active" : "hk-row--todo";
            const rise = i === active ? " hk-row-enter" : "";
            return (
              <div className={`hk-row ${state}${rise}`} key={b.ord}>
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

  /* step 7 — 预告：一生三阶段（为 state-machine 章的状态机管线埋种子） */
  const stages = [
    { cn: "还没点火", en: "NEW" },
    { cn: "正干着活", en: "RUNNABLE" },
    { cn: "干完了", en: "TERMINATED" },
  ];
  return (
    <div className="scene-pad hk-scene hk-stage-scene">
      <div className="hk-stage-kicker hk-rise">
        <span className="label-mono">THREAD · LIFECYCLE</span>
      </div>
      <div className="hk-pipeline">
        {stages.map((s, i) => (
          <div className="hk-pipe-item" key={s.en}>
            {i > 0 && (
              <span className="hk-pipe-arrow hk-rise" style={delay(500 + i * 550)}>
                →
              </span>
            )}
            <div className="hk-pipe-node hk-pop" style={delay(i * 550)}>
              <div className="hk-pipe-ord mono">{`0${i + 1}`}</div>
              <div className="hk-pipe-cn">{s.cn}</div>
              <div className="hk-pipe-en mono">{s.en}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="hk-stage-tagline hk-rise" style={delay(1900)}>
        三个行为，<span className="hk-tag-accent">挨个演示给你看</span>
      </div>
    </div>
  );
}
