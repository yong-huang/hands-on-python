import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 实验组丢失五轮（article L86-90 真实输出）。 */
const ROUNDS = [
  { n: 1, left: "34,400", lost: "82.8%" },
  { n: 2, left: "54,701", lost: "72.6%" },
  { n: 3, left: "43,072", lost: "78.5%" },
  { n: 4, left: "47,603", lost: "76.2%" },
  { n: 5, left: "40,461", lost: "79.8%" },
];

function Term({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ld-term ld-pop">
      <div className="ld-term-bar">
        <span className="ld-dot" />
        <span className="ld-term-title mono">{title}</span>
      </div>
      <div className="ld-term-body mono">{children}</div>
    </div>
  );
}

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 一行命令 */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene ld-cmd-scene">
        <Term title="race_gil.py">
          <div className="ld-line ld-rise" style={delay(500)}>
            <span className="ld-prompt">$</span> python3 race_gil.py
          </div>
        </Term>
        <div className="ld-note ld-rise" style={delay(1400)}>
          <span className="label-mono">五个小节 · 十秒</span>
          跑完自动核对，错了当场报错
        </div>
      </div>
    );
  }

  /* step 1 — 对照组：丢失 0 */
  if (step === 1) {
    return (
      <div className="scene-pad ld-scene ld-cmd-scene">
        <Term title="[2. 无锁竞态：裸 += vs 读-改-写隔一个调用]">
          <div className="ld-line ld-rise" style={delay(400)}>对照组 裸 counter += 1（100 线程 × 10,000）:</div>
          {[1, 2, 3].map((n, i) => (
            <div className="ld-line ld-rise" style={delay(1100 + i * 550)} key={n}>
              {"  "}第 {n} 轮: 1,000,000{"  "}(丢失 <b className="ld-zero">0</b>)
            </div>
          ))}
        </Term>
        <div className="ld-note ld-rise" style={delay(3300)}>
          <span className="label-mono">一百万次加法</span>
          分毫不差
        </div>
      </div>
    );
  }

  /* step 2 — 反直觉 hero */
  if (step === 2) {
    return (
      <div className="scene-pad ld-scene ld-twist-scene">
        <div className="ld-twist-hero ld-pop">最常见的写法，<b className="ld-accent">居然不丢</b></div>
        <div className="ld-twist-sub ld-rise" style={delay(1200)}>
          旧教程说：这几步之间随时会被切开。
        </div>
        <div className="ld-twist-fact ld-rise" style={delay(2400)}>
          在今天的 CPython 3.13 上，这个说法<b className="ld-accent">已经不成立</b>
        </div>
      </div>
    );
  }

  /* step 3 — 检查点两处示意 */
  if (step === 3) {
    return (
      <div className="scene-pad ld-scene ld-ckpt-scene">
        <div className="ld-ckpt-hero ld-rise">
          检查点只落<b className="ld-accent">两处</b>
        </div>
        <div className="ld-ckpt-row">
          <div className="ld-ckpt-flag ld-pop" style={delay(700)}>
            <span className="label-mono">检查点</span>循环跳回开头那一下
          </div>
          <div className="ld-ckpt-safe ld-rise" style={delay(1500)}>
            <span className="label-mono">语句中部</span>不会被打断
          </div>
          <div className="ld-ckpt-flag ld-pop" style={delay(2300)}>
            <span className="label-mono">检查点</span>函数进门出门那一下
          </div>
        </div>
        <div className="ld-ckpt-track ld-rise" style={delay(1100)}>
          <span className="ld-ckpt-node mono">循环</span>
          <span className="ld-ckpt-span" />
          <span className="ld-ckpt-node mono">语句</span>
          <span className="ld-ckpt-span ld-ckpt-span--safe" />
          <span className="ld-ckpt-node mono">调用</span>
          <span className="ld-ckpt-span" />
          <span className="ld-ckpt-node mono">循环</span>
        </div>
      </div>
    );
  }

  /* step 4 — 转折：桥接 + 真形状 */
  if (step === 4) {
    return (
      <div className="scene-pad ld-scene ld-bridge-scene">
        <div className="ld-bridge-q ld-rise">
          那这讲还剩什么？<b className="ld-accent">两件更重要的事</b>：竞态怎么发生、GIL 挡什么。
        </div>
        <div className="ld-bridge-shape ld-rise" style={delay(1400)}>
          真正的竞态长这样：读、改、写之间——<b className="ld-accent">隔一个调用</b>
        </div>
      </div>
    );
  }

  /* step 5 — 实验组三行代码 */
  if (step === 5) {
    return (
      <div className="scene-pad ld-scene ld-code-scene">
        <div className="ld-code ld-pop">
          <div className="ld-code-line ld-rise" style={delay(400)}>
            <span className="ld-code-note mono">读</span>tmp = counter
          </div>
          <div className="ld-code-line ld-code-line--hook ld-rise" style={delay(1500)}>
            <span className="ld-code-note mono">← 切换检查点</span>audit_hook()
          </div>
          <div className="ld-code-line ld-rise" style={delay(2600)}>
            <span className="ld-code-note mono">写</span>counter = tmp + 1
          </div>
        </div>
        <div className="ld-note ld-rise" style={delay(3600)}>
          <span className="label-mono">真实代码</span>audit_hook() 就是写日志、查缓存、发请求
        </div>
      </div>
    );
  }

  /* step 6 — 实验组输出：五轮各不相同 */
  if (step === 6) {
    return (
      <div className="scene-pad ld-scene ld-rounds-scene">
        <div className="ld-rounds-head ld-rise">
          <span className="label-mono">实验组 · 读 20 线程 × 10,000 次，写前隔一次调用</span>
        </div>
        <div className="ld-rounds">
          {ROUNDS.map((r, i) => (
            <div className="ld-round ld-rise" style={delay(500 + i * 450)} key={r.n}>
              <span className="ld-round-n mono">第 {r.n} 轮</span>
              <span className="ld-round-left mono">{r.left}</span>
              <span className="ld-round-lost mono">丢失 {r.lost}</span>
            </div>
          ))}
        </div>
        <div className="ld-rounds-verdict ld-rise" style={delay(3200)}>
          五轮<b className="ld-accent">各不相同</b> —— 竞态没法复现，说的就是这个
        </div>
      </div>
    );
  }

  /* step 7 — 真实世界写法 */
  return (
    <div className="scene-pad ld-scene ld-real-scene">
      <div className="ld-real-hero ld-pop">
        真实代码里，更新很少是<b className="ld-accent">孤零零一行</b>
      </div>
      <div className="ld-real-sub ld-rise" style={delay(800)}>
        但「读出来、调一下、写回去」这个写法，人人都写过：
      </div>
      <div className="ld-real-chips">
        {["写日志", "查缓存", "发请求"].map((c, i) => (
          <span className="ld-real-chip mono ld-pop" style={delay(1800 + i * 450)} key={c}>
            {c}
          </span>
        ))}
      </div>
      <div className="ld-real-foot ld-rise" style={delay(3100)}>
        —— <b className="ld-accent">全是它</b>
      </div>
    </div>
  );
}
