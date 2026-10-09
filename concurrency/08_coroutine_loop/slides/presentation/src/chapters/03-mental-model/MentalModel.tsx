import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./MentalModel.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* step 0 · 协程定义：跑到等待点，交出接力棒 */
function CoroutineDef() {
  return (
    <div className="mm-def">
      <div className="mm-def-kicker">两个词，先立住 —— 之一</div>
      <div className="mm-def-word mm-hero-in">协程</div>
      <div className="mm-def-gloss mm-rise" style={delay(700)}>
        自己说了算的任务
      </div>
      <div className="mm-baton">
        <svg viewBox="0 0 900 120" aria-hidden>
          <line x1="30" y1="70" x2="870" y2="70" stroke="var(--rule)" strokeWidth="5" />
          <text x="30" y="34" fill="var(--text-mute)" fontSize="20" style={{ fontFamily: "var(--font-mono)" }}>
            任务执行线
          </text>
          <g className="mm-baton-stop mm-fade" style={delay(1400)}>
            <line x1="430" y1="46" x2="430" y2="94" stroke="var(--accent)" strokeWidth="3" strokeDasharray="6 6" />
            <text x="430" y="118" textAnchor="middle" fill="var(--accent)" fontSize="21" style={{ fontFamily: "var(--font-body)" }}>
              等待点
            </text>
          </g>
          <g className="mm-baton-dot mm-pop" style={delay(900)}>
            <circle cx="140" cy="70" r="15" fill="var(--text)" />
          </g>
          <g className="mm-baton-move" style={delay(2000)}>
            <rect x="380" y="54" width="120" height="32" fill="var(--accent)" />
            <text x="440" y="77" textAnchor="middle" fill="var(--surface-2)" fontSize="20" style={{ fontFamily: "var(--font-body)" }}>
              交出去
            </text>
          </g>
        </svg>
      </div>
      <ul className="mm-def-points">
        <li className="mm-pt mm-rise" style={delay(2800)}>跑到要等待的地方，就主动暂停</li>
        <li className="mm-pt mm-rise" style={delay(3400)}>把「现在轮到我干」的机会交出去</li>
        <li className="mm-pt mm-rise" style={delay(4000)}>切不切、什么时候切 —— 你的代码说了算</li>
      </ul>
    </div>
  );
}

/* step 1 · 事件循环定义：单线程管家，三件事循环 */
function LoopDef() {
  return (
    <div className="mm-loopdef">
      <div className="mm-def-kicker">两个词，先立住 —— 之二</div>
      <div className="mm-def-word mm-hero-in">事件循环</div>
      <div className="mm-def-gloss mm-rise" style={delay(700)}>单线程里的管家</div>
      <div className="mm-loop-ring">
        <svg viewBox="0 0 760 360" aria-hidden>
          <defs>
            <marker id="mm-loop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 Z" fill="var(--accent)" />
            </marker>
          </defs>
          {/* ① → ② ：左上弧 */}
          <path className="mm-ring-arrow mm-draw" style={delay(1500)} d="M 170 238 C 140 160, 175 80, 266 56" fill="none" stroke="var(--accent)" strokeWidth="3" markerEnd="url(#mm-loop-arrow)" />
          {/* ② → ③ ：右下弧 */}
          <path className="mm-ring-arrow mm-draw" style={delay(2300)} d="M 448 88 C 520 112, 578 160, 584 238" fill="none" stroke="var(--accent)" strokeWidth="3" markerEnd="url(#mm-loop-arrow)" />
          {/* ③ → ① ：底部回弧 */}
          <path className="mm-ring-arrow mm-draw" style={delay(3900)} d="M 472 290 C 420 316, 320 316, 286 296" fill="none" stroke="var(--accent)" strokeWidth="3" markerEnd="url(#mm-loop-arrow)" />
          <g className="mm-ring-node mm-pop" style={delay(1800)}>
            <rect x="60" y="246" width="220" height="64" fill="var(--surface-2)" stroke="var(--text)" strokeWidth="2" />
            <text x="170" y="287" textAnchor="middle" fill="var(--text)" fontSize="27" fontWeight="700" style={{ fontFamily: "var(--font-display-cn)" }}>
              ① 取一个任务
            </text>
          </g>
          <g className="mm-ring-node mm-pop" style={delay(2600)}>
            <rect x="275" y="20" width="210" height="64" fill="var(--surface-2)" stroke="var(--text)" strokeWidth="2" />
            <text x="380" y="61" textAnchor="middle" fill="var(--text)" fontSize="27" fontWeight="700" style={{ fontFamily: "var(--font-display-cn)" }}>
              ② 执行
            </text>
          </g>
          <g className="mm-ring-node mm-pop" style={delay(3400)}>
            <rect x="480" y="246" width="220" height="88" fill="var(--surface-2)" stroke="var(--text)" strokeWidth="2" />
            <text x="590" y="283" textAnchor="middle" fill="var(--text)" fontSize="27" fontWeight="700" style={{ fontFamily: "var(--font-display-cn)" }}>
              ③ 等消息
            </text>
            <text x="590" y="315" textAnchor="middle" fill="var(--text-mute)" fontSize="19" style={{ fontFamily: "var(--font-body)" }}>
              比如谁要的数据回来了
            </text>
          </g>
        </svg>
      </div>
      <div className="mm-loopdef-note mm-rise" style={delay(4400)}>
        协程之间怎么切换，全归它管。
      </div>
    </div>
  );
}

/* step 2 · 一句话心智模型：管线图 */
function MentalPipeline() {
  return (
    <div className="mm-pipe">
      <div className="mm-pipe-kicker mm-fade">整个机制，一句话：</div>
      <div className="mm-pipe-flow">
        <div className="mm-pipe-node mm-card-in">协程</div>
        <div className="mm-pipe-link">
          <span className="mm-pipe-lab mm-fade" style={delay(900)}>一到等待点</span>
          <svg viewBox="0 0 150 24" aria-hidden>
            <line x1="0" y1="12" x2="128" y2="12" stroke="var(--text)" strokeWidth="2.5" />
            <path d="M128 4 L148 12 L128 20 Z" fill="var(--text)" />
          </svg>
          <span className="mm-pipe-sub mm-fade" style={delay(1300)}>交还控制权</span>
        </div>
        <div className="mm-pipe-node mm-node-accent mm-card-in" style={delay(700)}>事件循环</div>
        <div className="mm-pipe-link">
          <span className="mm-pipe-lab mm-fade" style={delay(2100)}>单线程 · 来回切换</span>
          <svg viewBox="0 0 150 24" aria-hidden>
            <line x1="0" y1="12" x2="128" y2="12" stroke="var(--text)" strokeWidth="2.5" />
            <path d="M128 4 L148 12 L128 20 Z" fill="var(--text)" />
          </svg>
        </div>
        <div className="mm-pipe-stack">
          <div className="mm-pipe-node mm-card-in" style={delay(2500)}>待命队伍</div>
          <div className="mm-pipe-node mm-card-in" style={delay(3100)}>闹钟表 · 到点放回</div>
        </div>
      </div>
      <div className="mm-pipe-footer mm-hero-in" style={delay(4000)}>
        全程，没有第二个线程。
      </div>
    </div>
  );
}

/* step 3 · 服务员类比：上菜 / 擦桌子 / 死等全店停摆 */
function Waiter() {
  return (
    <div className="mm-waiter">
      <div className="mm-waiter-kicker mm-fade">把这位管家，想象成独自看全店的服务员</div>
      <div className="mm-waiter-floor mm-card-in" style={delay(500)}>
        <svg viewBox="0 0 980 390" aria-hidden>
          {/* 店内地面 */}
          <line x1="30" y1="348" x2="950" y2="348" stroke="var(--rule)" strokeWidth="2" />
          {/* 三张桌：落在地面上 */}
          {[
            { x: 300, label: "1 号桌", flag: true },
            { x: 570, label: "2 号桌", flag: false },
            { x: 840, label: "3 号桌", flag: false },
          ].map((t) => (
            <g key={t.label}>
              <circle cx={t.x} cy={252} r={58} fill="var(--surface-2)" stroke="var(--text)" strokeWidth="2.5" />
              <text x={t.x} y={260} textAnchor="middle" fill="var(--text)" fontSize="24" style={{ fontFamily: "var(--font-body)" }}>
                {t.label}
              </text>
              {t.flag && (
                <g className="mm-dish mm-pop" style={delay(1500)}>
                  <rect x={t.x - 70} y={108} width={140} height={46} fill="var(--accent)" />
                  <text x={t.x} y={138} textAnchor="middle" fill="var(--surface-2)" fontSize="22" style={{ fontFamily: "var(--font-body)" }}>
                    菜好了
                  </text>
                  <line x1={t.x} y1={158} x2={t.x} y2={190} stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" />
                </g>
              )}
            </g>
          ))}
          {/* 服务员：从店门口一路走到 1 号桌旁（全程虚线足迹） */}
          <path className="mm-waiter-path mm-draw" style={delay(2200)} d="M 70 226 C 110 240, 165 248, 204 250" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeDasharray="7 7" />
          <g className="mm-waiter-move">
            <g className="mm-waiter-guy mm-pop" style={delay(900)}>
              <circle cx="52" cy="214" r="18" fill="var(--text)" />
              <text x="52" y="262" textAnchor="middle" fill="var(--text-2)" fontSize="20" style={{ fontFamily: "var(--font-body)" }}>
                服务员
              </text>
            </g>
          </g>
          {/* 右上角：没人喊就去擦别的桌子 */}
          <g className="mm-wipe mm-fade" style={delay(3600)}>
            <rect x="600" y="48" width="350" height="92" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="5 5" />
            <text x="775" y="86" textAnchor="middle" fill="var(--text-2)" fontSize="23" style={{ fontFamily: "var(--font-body)" }}>
              没人喊？先擦别的桌子
            </text>
            <text x="775" y="120" textAnchor="middle" fill="var(--text-mute)" fontSize="20" style={{ fontFamily: "var(--font-body)" }}>
              = 跑待命队伍里的下一个协程
            </text>
          </g>
        </svg>
      </div>
      <div className="mm-waiter-punch mm-hero-in" style={delay(5200)}>
        这家店只有一个服务员 —— 谁让他站着死等，<span>全店都得跟着停。</span>
      </div>
    </div>
  );
}

/* step 4 · 并发 ≠ 并行 */
function ConcurrencyVsParallelism() {
  return (
    <div className="mm-cvp">
      <div className="mm-cvp-title mm-hero-in">并发，不等于并行。</div>
      <div className="mm-cvp-grid">
        <div className="mm-cvp-card mm-card-in" style={delay(900)}>
          <div className="mm-cvp-name">并发</div>
          <div className="mm-cvp-gloss">重叠的时间段里，交错推进</div>
          <svg viewBox="0 0 300 96" aria-hidden>
            {[0, 44].map((y, r) => (
              <g key={y}>
                <line x1="24" y1={y + 16} x2="276" y2={y + 16} stroke="var(--rule)" strokeWidth="4" />
                {[0, 1, 2].map((i) => (
                  <rect
                    key={i}
                    className="mm-cvp-cell mm-pop"
                    style={delay(1500 + (r * 3 + ((i + r) % 3)) * 260)}
                    x={30 + i * 84 + r * 40}
                    y={y + 6}
                    width="38"
                    height="20"
                    fill={r === 0 ? "var(--accent)" : "var(--surface-3)"}
                    stroke="var(--text)"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
        <div className="mm-cvp-card mm-card-in" style={delay(1300)}>
          <div className="mm-cvp-name">并行</div>
          <div className="mm-cvp-gloss">同一瞬间，真的同时执行</div>
          <svg viewBox="0 0 300 96" aria-hidden>
            {[0, 44].map((y, r) => (
              <g key={y}>
                <line x1="24" y1={y + 16} x2="276" y2={y + 16} stroke="var(--rule)" strokeWidth="4" />
                {[0, 1, 2].map((i) => (
                  <rect
                    key={i}
                    className="mm-cvp-cell mm-pop"
                    style={delay(2300 + i * 260)}
                    x={30 + i * 84}
                    y={y + 6}
                    width="38"
                    height="20"
                    fill={r === 0 ? "var(--accent)" : "var(--surface-3)"}
                    stroke="var(--text)"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="mm-cvp-footer mm-rise" style={delay(4200)}>
        asyncio 给的是<b>并发</b> —— 从不创建线程，只是不让 CPU 闲着等数据。
      </div>
    </div>
  );
}

function MentalModelInner({ step }: ChapterStepProps) {
  if (step === 0) return <CoroutineDef />;
  if (step === 1) return <LoopDef />;
  if (step === 2) return <MentalPipeline />;
  if (step === 3) return <Waiter />;
  return <ConcurrencyVsParallelism />;
}

export default function MentalModel({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <MentalModelInner step={step} />
    </div>
  );
}
