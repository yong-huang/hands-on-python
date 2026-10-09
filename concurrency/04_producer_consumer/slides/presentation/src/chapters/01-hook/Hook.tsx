import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三个「锁给不出答案」的问题（冷开场递进卡；白话注来自 script.md 对应拍）。 */
const QUESTIONS = [
  {
    ord: "01",
    text: "什么时候能碰数据？",
    note: "锁的边界自己画——漏一处，竞态就回来",
  },
  {
    ord: "02",
    text: "什么时候收尾？",
    note: "收尾靠开关变量（标志位）——漏一个分支，消费者永远等在取数据那行",
  },
  {
    ord: "03",
    text: "容器没有上限？",
    note: "生产快、消费慢，内存被慢慢吃光",
  },
];

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad hp-scene hp-title-scene">
        <div className="hp-title-center">
          <div className="label-mono hp-rise">PYTHON · CONCURRENCY 04</div>
          <hr className="rule rule-accent hp-title-rule hp-rise" style={delay(180)} />
          <h1 className="hp-title-main hp-rise" style={delay(320)}>
            生产者<span className="hp-title-accent">与</span>消费者
          </h1>
          <div className="hp-title-en hp-rise" style={delay(620)}>
            Producers &amp; Consumers
          </div>
          <div className="hp-title-sub hp-rise" style={delay(820)}>
            线程之间不共享，只传递消息
          </div>
        </div>
        <div className="hp-titleblock hp-rise" style={delay(1050)}>
          <div className="hp-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="hp-tb-row"><span>Lab</span><b>concurrency / 04</b></div>
          <div className="hp-tb-row"><span>API</span><b>queue.Queue</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 承上一讲：锁治好了竞态，但只是止痛药 */
  if (step === 1) {
    return (
      <div className="scene-pad hp-scene hp-recall-scene">
        <div className="hp-recall-head hp-rise">
          <span className="label-mono">上一讲 · 回顾</span>
          <span className="hp-recall-series mono">系列 · 02 竞态实测 / 03 锁</span>
        </div>
        <blockquote className="hp-recall-quote hp-rise" style={delay(300)}>
          一把锁，治好了<span className="hp-recall-accent">竞态</span>。
        </blockquote>
        <div className="hp-recall-note hp-rise" style={delay(1100)}>
          <span className="label-mono">名词</span>
          竞态＝俩线程同时改一个数、结果看运气的毛病
        </div>
        <div className="hp-recall-diagram" aria-hidden>
          <span className="hp-rd-thread mono hp-rise" style={delay(1500)}>线程 A</span>
          <span className="hp-rd-thread mono hp-rise" style={delay(1650)}>线程 B</span>
          <span className="hp-rd-arrow hp-rise" style={delay(1800)}>→</span>
          <span className="hp-rd-lock mono hp-pop" style={delay(1950)}>一把锁</span>
          <span className="hp-rd-arrow hp-rise" style={delay(2100)}>→</span>
          <span className="hp-rd-box mono hp-pop" style={delay(2250)}>同一份容器</span>
        </div>
        <div className="hp-recall-tagline hp-rise" style={delay(2700)}>
          但锁只是止痛药——<span className="hp-recall-accent">能碰 · 收尾</span>，它给不出答案
        </div>
      </div>
    );
  }

  /* step 2~4 — 冷开场三问（引用卡 + 左侧 01/02/03 进度轨） */
  if (step === 2 || step === 3 || step === 4) {
    const active = step - 2;
    const q = QUESTIONS[active];
    return (
      <div className="scene-pad hp-scene hp-ask-scene">
        <div className="hp-ask-rail" aria-hidden>
          {QUESTIONS.map((item, i) => (
            <span
              key={item.ord}
              className={`hp-rail-ord mono${i === active ? " hp-rail-ord--on" : ""}${i < active ? " hp-rail-ord--past" : ""}`}
            >
              {item.ord}
            </span>
          ))}
        </div>
        <div className="hp-ask-main">
          <div className="hp-ask-head hp-rise">
            <span className="label-mono">锁给不出答案 · 三问</span>
            <span className="hp-ask-ord mono">{q.ord} / 03</span>
          </div>
          <hr className="rule hp-ask-rule hp-rise" style={delay(200)} />
          <blockquote className="hp-ask-quote hp-rise" style={delay(420)}>
            「{q.text}」
          </blockquote>
          <div className="hp-ask-note hp-rise" style={delay(1500)}>
            <span className="label-mono">白话</span>
            {q.note}
          </div>
          {active === 0 && (
            <div className="hp-qvis" aria-hidden>
              <span className="hp-qv-node mono hp-pop">线程 A</span>
              <span className="hp-qv-fence-wrap">
                <span className="hp-qv-fence" />
                <span className="hp-qv-gap mono hp-pop" style={delay(1600)}>漏</span>
              </span>
              <span className="hp-qv-node mono hp-pop" style={delay(300)}>线程 B</span>
              <span className="hp-qv-arrow hp-rise" style={delay(900)}>→</span>
              <span className="hp-qv-node mono hp-pop" style={delay(1100)}>共享数据</span>
              <span className="hp-qv-mark mono hp-pop" style={delay(2400)}>竞态从缺口回来</span>
            </div>
          )}
          {active === 1 && (
            <div className="hp-qvis" aria-hidden>
              <span className="hp-qv-node mono hp-pop">消费者</span>
              <span className="hp-qv-arrow hp-rise" style={delay(400)}>→</span>
              <span className="hp-qv-switch hp-pop" style={delay(700)}>
                <span className="hp-qv-knob" />
              </span>
              <span className="hp-qv-switch-label mono hp-rise" style={delay(1300)}>
                标志位：该收尾了吗？
              </span>
              <span className="hp-qv-mark mono hp-pop" style={delay(2500)}>
                漏写一个分支 → 永远等
              </span>
            </div>
          )}
          {active === 2 && (
            <div className="hp-qvis" aria-hidden>
              <span className="hp-qv-box">
                {Array.from({ length: 6 }, (_, i) => (
                  <span className="hp-qv-slot hp-pop" style={delay(400 + i * 380)} key={i} />
                ))}
              </span>
              <span className="hp-qv-mark mono hp-pop" style={delay(2900)}>
                没有上限 · 内存被吃光
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* step 5 — 转折：三个问题收束为经典答案「消息传递」 */
  if (step === 5) {
    return (
      <div className="scene-pad hp-scene hp-turn-scene">
        <div className="hp-turn-chips" aria-hidden>
          {["碰数据", "收尾", "容量上限"].map((chip, i) => (
            <span className="hp-chip mono hp-pop" style={delay(i * 160)} key={chip}>
              {chip}
            </span>
          ))}
        </div>
        <div className="hp-turn-arrow hp-rise" style={delay(650)} aria-hidden>
          ↓
        </div>
        <div className="hp-turn-answer hp-pop" style={delay(950)}>
          经典答案：消息传递
        </div>
        <div className="hp-turn-sub hp-rise" style={delay(1550)}>
          线程之间不共享，<span className="hp-turn-accent">只传递消息</span>
        </div>
        <div className="hp-turn-note hp-rise" style={delay(2150)}>
          <span className="label-mono">分工</span>
          生产者专门生成任务 · 消费者专门处理任务
        </div>
      </div>
    );
  }

  /* step 6 — 预告：queue.Queue 把三件事打包好了 */
  const contents = [
    { name: "容器", talk: "共享的那份" },
    { name: "锁", talk: "一次只许一个人碰" },
    { name: "等待通知", talk: "没货等着 · 来货叫醒" },
  ];
  return (
    <div className="scene-pad hp-scene hp-pack-scene">
      <div className="hp-pack-kicker hp-rise">
        <span className="label-mono">STDLIB · BATTERIES INCLUDED</span>
      </div>
      <div className="hp-pack-hero mono hp-rise" style={delay(250)}>
        queue.Queue
      </div>
      <div className="hp-pack-box">
        {contents.map((c, i) => (
          <div className="hp-pack-row hp-rise" style={delay(650 + i * 420)} key={c.name}>
            <span className="hp-pack-name">{c.name}</span>
            <span className="hp-pack-talk">{c.talk}</span>
          </div>
        ))}
      </div>
      <div className="hp-pack-tagline hp-rise" style={delay(2300)}>
        这条视频，<span className="hp-pack-accent">拆开来看</span>
      </div>
    </div>
  );
}
