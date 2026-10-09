import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./WhenToUse.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* step 0 · 场景一：等待特别多的活 */
function CaseWaitHeavy() {
  return (
    <div className="wu-case">
      <div className="wu-case-tag wu-fade">该交给协程的活 · 之一</div>
      <div className="wu-case-hero wu-hero-in" style={delay(400)}>
        等待特别多的活
      </div>
      <div className="wu-examples">
        <div className="wu-example wu-card-in" style={delay(1100)}>
          <div className="wu-example-name">一口气抓上万个网页的程序</div>
          <div className="wu-example-meta">抓取器</div>
        </div>
        <div className="wu-example wu-card-in" style={delay(1500)}>
          <div className="wu-example-name">守着上万条连接的网关</div>
          <div className="wu-example-meta">长连接网关</div>
        </div>
      </div>
      <div className="wu-cost-compare wu-rise" style={delay(2400)}>
        <div className="wu-cost-row">
          <span className="wu-cost-kind">协程</span>
          <span className="wu-cost-cell" />
          <span className="wu-cost-note">每件任务只占一小条记录</span>
        </div>
        <div className="wu-cost-row">
          <span className="wu-cost-kind">线程</span>
          <span className="wu-cost-cell wu-cell-tall" />
          <span className="wu-cost-note">每件任务单独雇一个线程</span>
        </div>
      </div>
    </div>
  );
}

/* step 1 · 场景二：可复现的交错 + 断言白话卡 */
function CaseAssert() {
  return (
    <div className="wu-assert">
      <div className="wu-case-tag wu-fade">该交给协程的活 · 之二</div>
      <div className="wu-assert-hero wu-hero-in" style={delay(400)}>
        需要可复现的交错
      </div>
      <div className="wu-assert-lead wu-rise" style={delay(1100)}>
        协程每次都在<u>说好的地方</u>停下，先后顺序每次都一模一样。
      </div>
      <div className="wu-assert-card wu-card-in" style={delay(2000)}>
        <div className="wu-assert-title">自动核对（行话：断言）</div>
        <div className="wu-assert-row">
          <span className="wu-assert-kind">写死期望</span>
          <span className="wu-assert-seq">A 干第一步 → B 干第一步 → A 干第二步 → ……</span>
        </div>
        <div className="wu-assert-row">
          <span className="wu-assert-kind">实际结果</span>
          <span className="wu-assert-seq wu-seq-ok">一字不差 ✓</span>
        </div>
        <div className="wu-assert-note">错一步，就报警。</div>
      </div>
    </div>
  );
}

/* step 2 · 活例子：A1 B1 A2 B2 A3 B3 每遍都一样 */
function CaseSequence() {
  const order = ["A1", "B1", "A2", "B2", "A3", "B3"];
  return (
    <div className="wu-seq">
      <div className="wu-seq-kicker wu-fade">一会儿实验里的活例子</div>
      <div className="wu-seq-lanes wu-card-in" style={delay(400)}>
        {["A", "B"].map((lane) => (
          <div className="wu-seq-lane" key={lane}>
            <span className="wu-seq-lane-name">任务 {lane}</span>
            <div className="wu-seq-cells">
              {order.map((cell, i) =>
                cell[0] === lane ? (
                  <span
                    key={cell}
                    className="wu-seq-cell wu-cell-on wu-pop"
                    style={delay(1000 + order.indexOf(cell) * 420)}
                  >
                    {cell}
                  </span>
                ) : (
                  <span key={cell} className="wu-seq-cell wu-cell-off" />
                ),
              )}
            </div>
          </div>
        ))}
        <div className="wu-seq-order wu-fade" style={delay(3800)}>
          轮流点亮：{order.join(" ")}
        </div>
      </div>
      <div className="wu-seq-badge wu-hero-in" style={delay(4600)}>
        跑多少遍，都一样。
      </div>
      <div className="wu-seq-contrast wu-rise" style={delay(5600)}>
        线程那种想切就切的跑法，给不了这个保证。
      </div>
    </div>
  );
}

/* step 3 · 场景三：任务编排 */
function CaseOrchestration() {
  return (
    <div className="wu-orch">
      <div className="wu-case-tag wu-fade">该交给协程的活 · 之三</div>
      <div className="wu-orch-hero wu-hero-in" style={delay(400)}>
        一台机器上，排几十上百个
        <br />
        有先后的步骤
      </div>
      <div className="wu-orch-pipe wu-card-in" style={delay(1300)}>
        {["先登录", "再取数据", "最后存盘"].map((s, i) => (
          <div className="wu-orch-step" key={s}>
            {i > 0 && (
              <svg viewBox="0 0 70 24" aria-hidden className="wu-orch-arrow wu-fade" style={delay(2000 + i * 500)}>
                <line x1="0" y1="12" x2="52" y2="12" stroke="var(--text)" strokeWidth="2.5" />
                <path d="M52 4 L68 12 L52 20 Z" fill="var(--text)" />
              </svg>
            )}
            <span className="wu-orch-node wu-pop" style={delay(1700 + i * 500)}>
              {s}
            </span>
          </div>
        ))}
      </div>
      <div className="wu-orch-note wu-rise" style={delay(3900)}>
        怎么排这些步骤 —— 是<span>下一讲</span>的主角。
      </div>
    </div>
  );
}

function WhenToUseInner({ step }: ChapterStepProps) {
  if (step === 0) return <CaseWaitHeavy />;
  if (step === 1) return <CaseAssert />;
  if (step === 2) return <CaseSequence />;
  return <CaseOrchestration />;
}

export default function WhenToUse({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <WhenToUseInner step={step} />
    </div>
  );
}
