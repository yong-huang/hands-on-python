import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三道坎（递进列表；白话副行来自 script.md 对应拍 + outline 信息池）。 */
const BLOCKERS = [
  { ord: "01", name: "内存互相隔离", talk: "你改的是自己的那份副本，对方永远看不见" },
  { ord: "02", name: "想传数据，只能搬字节", talk: "大对象每传一次，都要先打包、再拆包" },
  { ord: "03", name: "共享有代价", talk: "要么绕远路，要么没人看守，更新可能会丢掉" },
] as const;

/** 冷开场三问的引用卡内容。 */
const QUESTIONS = [
  {
    ord: "01",
    text: "子进程里明明改了那个变量，父进程怎么就是看不见？",
    note: "父进程 ＝ 主程序 · 子进程 ＝ 它派出去的分身",
  },
  {
    ord: "02",
    text: "50MB 的数组传给子进程，怎么要等小半秒？",
    note: "全耗在打包、拷贝、拆包上",
  },
  {
    ord: "03",
    text: "共享计数器更新一万次，怎么悄悄丢了六千四百多次？",
    note: "无锁实测：count = 3,596 / 10,000",
  },
];

/** 10,000 次更新格盘：1 格＝100 次，3,596 ≈ 36 格写入、64 格丢失。 */
const GRID_FILLED = 36;
const GRID_TOTAL = 100;

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="label-mono hk-rise">PYTHON · CONCURRENCY 06</div>
          <hr className="rule hk-title-rule hk-rise" style={delay(180)} />
          <h1 className="hk-title-main hk-rise" style={delay(320)}>
            进程间<span className="hk-title-accent">通信</span>
          </h1>
          <div className="hk-title-en hk-rise" style={delay(620)}>
            Inter-Process Communication
          </div>
          <div className="hk-title-sub hk-rise" style={delay(820)}>
            把传话的路重新接上
          </div>
          <div className="hk-title-note hk-rise" style={delay(1150)}>
            <span className="label-mono">名词</span>进程 ＝ 正在运行的程序，各有各的内存
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={delay(1350)}>
          <div className="hk-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="hk-tb-row"><span>Lab</span><b>concurrency / 06</b></div>
          <div className="hk-tb-row"><span>APIs</span><b>Pipe · Queue · SharedMemory · Manager</b></div>
        </div>
      </div>
    );
  }

  /* step 1~3 — 冷开场三问：引用卡 + 每问一幅内容驱动小图 */
  const Q_NUM = ["一", "二", "三"];
  if (step === 1 || step === 2 || step === 3) {
    const q = QUESTIONS[step - 1];
    return (
      <div className="scene-pad hk-scene hk-quote-scene">
        <div className="hk-quote-head hk-rise">
          <span className="hk-head-label">
            <span className="hk-head-tick" />
            <span className="label-mono">三个没答案的问题</span>
          </span>
          <span className="hk-quote-ord">第{Q_NUM[step - 1]}问 / 共 3 问</span>
        </div>
        <blockquote className="hk-quote hk-quote-first hk-rise" style={delay(420)}>「{q.text}」</blockquote>
        {step === 1 && (
          <div className="hk-iso hk-rise" style={delay(900)}>
            <div className="hk-iso-proc">
              <div className="hk-iso-tag label-mono">父进程 · 主程序</div>
              <div className="hk-iso-val mono">count = 0</div>
              <div className="hk-iso-still">纹丝不动</div>
            </div>
            <div className="hk-iso-gap">
              <div className="hk-iso-link" />
              <div className="hk-iso-block hk-pop" style={delay(2100)}>看不见</div>
            </div>
            <div className="hk-iso-proc hk-iso-child">
              <div className="hk-iso-tag label-mono">子进程 · 派出去的分身</div>
              <div className="hk-iso-val mono">
                count = 0<span className="hk-iso-flip hk-pop" style={delay(1400)}>42</span>
              </div>
              <div className="hk-iso-still hk-iso-still-dim">改的是自己那份副本</div>
            </div>
          </div>
        )}
        {q.note && step !== 1 && (
          <div className="hk-quote-note hk-rise" style={delay(1500)}>
            <span className="label-mono">实测</span>
            {q.note}
          </div>
        )}
        {step === 2 && (
          <div className="hk-pipe hk-rise" style={delay(900)}>
            <div className="hk-pipe-src">
              <div className="hk-pipe-block mono">50MB</div>
              <div className="hk-pipe-cap label-mono">大数组</div>
            </div>
            <div className="hk-pipe-run">
              <div className="hk-pipe-gate hk-pipe-gate-top" />
              <div className="hk-pipe-gate hk-pipe-gate-bot" />
              <div className="hk-pipe-dot hk-pipe-travel mono">0110…</div>
            </div>
            <div className="hk-pipe-dst">
              <div className="hk-pipe-timer mono hk-pop" style={delay(2900)}>366 ms</div>
              <div className="hk-pipe-cap label-mono">子进程收到</div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="hk-grid-wrap hk-rise" style={delay(900)}>
            <div className="hk-grid">
              {Array.from({ length: GRID_TOTAL }, (_, i) => (
                <span
                  key={i}
                  className={`hk-cell${i < GRID_FILLED ? " hk-cell-on" : ""}`}
                  style={i < GRID_FILLED ? delay(1100 + i * 14) : undefined}
                />
              ))}
            </div>
            <div className="hk-grid-legend hk-rise" style={delay(2600)}>
              <span className="hk-lg-on">■ 已写入 3,596</span>
              <span className="hk-lg-off">□ 丢失 6,404</span>
              <span className="hk-lg-note label-mono">1 格 ≈ 100 次 · 共 10,000 次</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* step 4~6 — 三道坎：递进列表（1 项 = 1 step，前行灰化保留）+ 右侧演示 */
  if (step === 4 || step === 5 || step === 6) {
    const active = step - 4; // 0 / 1 / 2
    return (
      <div className="scene-pad hk-scene hk-list-scene">
        <div className="hk-list-head hk-rise">
          <span className="label-mono">多进程 · 三道坎</span>
        </div>
        <div className="hk-list-body">
          <div className="hk-list">
            {BLOCKERS.map((b, i) => {
              const cls =
                i < active ? "hk-item-done" : i === active ? "hk-item-live" : "hk-item-wait";
              if (i > active) return null; // 未讲到的项不出现
              return (
                <div key={b.ord} className={`hk-item ${cls} hk-rise`} style={delay(i === active ? 150 : 0)}>
                  <span className="hk-item-ord mono">{b.ord}</span>
                  <div>
                    <div className="hk-item-name">{b.name}</div>
                    <div className="hk-item-talk">{b.talk}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hk-demo">
            {step === 4 && (
              <div className="hk-wall hk-rise" style={delay(600)}>
                <div className="hk-wall-proc">
                  <div className="label-mono">进程 A</div>
                  <div className="hk-wall-mem mono">自己的内存</div>
                </div>
                <div className="hk-wall-mid"><div className="hk-wall-bar" /></div>
                <div className="hk-wall-proc">
                  <div className="label-mono">进程 B</div>
                  <div className="hk-wall-mem mono">自己的内存</div>
                </div>
              </div>
            )}
            {step === 5 && (
              <div className="hk-pack hk-rise" style={delay(600)}>
                <div className="hk-pack-obj">
                  <div className="hk-pack-box mono">大对象</div>
                  <div className="hk-pack-cap label-mono">原件</div>
                </div>
                <div className="hk-pack-flow">
                  <span className="hk-pack-step hk-pop" style={delay(900)}>打包</span>
                  <div className="hk-pack-stream">
                    <span className="hk-pack-bits hk-bits-run mono">011010</span>
                  </div>
                  <span className="hk-pack-step hk-pop" style={delay(1900)}>拆包</span>
                </div>
                <div className="hk-pack-obj">
                  <div className="hk-pack-box mono">副本</div>
                  <div className="hk-pack-cap label-mono">对方收到</div>
                </div>
              </div>
            )}
            {step === 6 && (
              <div className="hk-cost hk-rise" style={delay(600)}>
                <div className="hk-cost-half">
                  <div className="hk-cost-title label-mono">绕远路</div>
                  <div className="hk-cost-detour">
                    <span className="hk-cost-node mono">你</span>
                    <div className="hk-cost-path">
                      <div className="hk-cost-dash hk-dash-run" />
                      <span className="hk-cost-mid hk-pop" style={delay(1300)}>中间人</span>
                    </div>
                    <span className="hk-cost-node mono">数据</span>
                  </div>
                  <div className="hk-cost-note">每用一次，问一趟</div>
                </div>
                <div className="hk-cost-div" />
                <div className="hk-cost-half">
                  <div className="hk-cost-title label-mono">没人看守</div>
                  <div className="hk-cost-clash">
                    <div className="hk-cost-writer hk-writer-l">
                      <span className="hk-cost-who label-mono">进程 A</span>
                      <span className="hk-cost-arrow hk-clash-l" />
                    </div>
                    <span className="hk-cost-cell mono hk-pop" style={delay(1500)}>同一个数</span>
                    <div className="hk-cost-writer hk-writer-r">
                      <span className="hk-cost-who label-mono">进程 B</span>
                      <span className="hk-cost-arrow hk-clash-r" />
                    </div>
                  </div>
                  <div className="hk-cost-note hk-pop" style={delay(2100)}>同时改，更新丢</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* step 7 — 预告：四条通道名卡（宣言式一组上，非逐项清单） */
  const CHANNELS = [
    { name: "Pipe", tag: "点对点对话" },
    { name: "Queue", tag: "批量吞吐" },
    { name: "SharedMemory", tag: "零拷贝直读" },
    { name: "Manager", tag: "什么都能代理" },
  ] as const;
  return (
    <div className="scene-pad hk-scene hk-preview-scene">
      <div className="hk-preview-head hk-rise">
        <span className="label-mono">Python 标准库 · multiprocessing</span>
      </div>
      <h2 className="hk-preview-title hk-rise" style={delay(220)}>四条通道</h2>
      <div className="hk-preview-row">
        {CHANNELS.map((c, i) => (
          <div key={c.name} className="card hk-chcard hk-rise" style={delay(600 + i * 160)}>
            <div className="hk-chcard-name mono">{c.name}</div>
            <hr className="rule hk-chcard-rule" />
            <div className="hk-chcard-tag">{c.tag}</div>
          </div>
        ))}
      </div>
      <div className="hk-preview-slogan hk-rise" style={delay(1500)}>
        哪条快、哪条有坑——<b>挨个分析</b>
      </div>
    </div>
  );
}
