import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

interface Pit {
  tag: string;
  title: string;
  note?: string;
  rows: { label: string; text: ReactNode }[];
}

const PITS: Pit[] = [
  {
    tag: "坑一",
    title: "在事件循环里调阻塞函数",
    note: "就是刚才那颗雷",
    rows: [
      {
        label: "记住",
        text: (
          <>
            阻塞代码，一律<b className="pt-accent">丢进工作线程</b>
          </>
        ),
      },
    ],
  },
  {
    tag: "坑二",
    title: "服务清理忘了 await",
    rows: [
      {
        label: "机制",
        text: (
          <>
            await = 异步世界的<b className="pt-accent">点名牌</b>：协程不被喊到，就压根不执行
          </>
        ),
      },
      {
        label: "后果",
        text: (
          <>
            结束时弹警告 · 服务没关干净 · <b className="pt-accent">端口一直占着</b>
          </>
        ),
      },
      {
        label: "白话",
        text: <>端口 = 服务对外的门牌号</>,
      },
    ],
  },
  {
    tag: "坑三",
    title: "失败的响应不读就重试",
    rows: [
      {
        label: "机制",
        text: (
          <>
            连接 = 和服务器之间的<b className="pt-accent">通道</b> · 通道有限，用完要还
          </>
        ),
      },
      {
        label: "后果",
        text: <>失败的回复不读完，通道还不回去 —— 越积越多</>,
      },
      {
        label: "解法",
        text: (
          <>
            交给 <span className="pt-chip mono">async with</span> 固定句式：退出时自动读完、还掉
          </>
        ),
      },
    ],
  },
  {
    tag: "坑四",
    title: "报错接错了种类",
    rows: [
      {
        label: "机制",
        text: (
          <>
            异常 = Python 出错抛出的<b className="pt-accent">报错对象</b> · 按类型接住，才能决定下一步
          </>
        ),
      },
      {
        label: "关键",
        text: (
          <>
            超时报的错 ≠ <span className="pt-chip mono">URLError</span> ——
            不是一家子，接不住就<b className="pt-accent">炸停</b>
          </>
        ),
      },
      {
        label: "解法",
        text: (
          <>
            一网打尽网络报错 → 接 <span className="pt-chip mono">OSError</span> 大类
          </>
        ),
      },
    ],
  },
];

function PitCard({ pit }: { pit: Pit }) {
  return (
    <div className="pt-card">
      <div className="pt-card-head">
        <span className="pt-card-tag mono">{pit.tag}</span>
        <span className="pt-card-title">{pit.title}</span>
        {pit.note && <span className="pt-card-note">{pit.note}</span>}
      </div>
      {pit.rows.map((row, i) => (
        <div key={row.label} className="pt-card-row pt-rise" style={delay(900 + i * 1100)}>
          <span className="pt-card-label mono">{row.label}</span>
          <span className="pt-card-text">{row.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function PitfallsChapter({ step }: ChapterStepProps) {
  if (step <= 3) {
    return (
      <div className="scene-pad pt-scene pt-pit-scene">
        <div className="pt-thesis pt-rise">
          四个真实踩过的坑 · <b className="pt-accent">{PITS[step]!.tag}</b>
        </div>
        <PitCard pit={PITS[step]!} />
      </div>
    );
  }

  /* step 4 — 收束（fallthrough） */
  return (
    <div className="scene-pad pt-scene pt-final-scene">
      <div className="pt-final-line pt-rise">
        四个坑 —— 脚本<b className="pt-accent">全都真实踩过</b>，还写成了断言
      </div>
      <div className="pt-final-cta pt-rise" style={delay(1600)}>
        你跑一遍，就能<b className="pt-accent">全部复现</b>
      </div>
    </div>
  );
}
