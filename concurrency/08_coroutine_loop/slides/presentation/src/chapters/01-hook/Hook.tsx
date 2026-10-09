import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const QUESTIONS = [
  { num: "01", text: "协程，到底是什么？" },
  { num: "02", text: "await 到底交出了什么？" },
  { num: "03", text: "是不是偷偷开了新线程？" },
  { num: "04", text: "怎么写，才算真的同时干几件事？" },
];

/* step 0 · 片头标题页（PLAYBOOK 硬规则：标题页第一） */
function TitlePage() {
  return (
    <div className="ho-title">
      <div className="ho-kicker ho-rise">hands-on-python · concurrency 08 · asyncio</div>
      <div className="ho-rule ho-rise" style={{ animationDelay: "250ms" }} />
      <h1 className="ho-main ho-rise" style={{ animationDelay: "500ms" }}>
        协程与事件循环
      </h1>
      <div className="ho-sub ho-rise" style={{ animationDelay: "900ms" }}>
        单线程内的并发
      </div>
      <div className="ho-claim ho-rise" style={{ animationDelay: "1300ms" }}>
        一个线程，同时照看上万条等待中的任务
      </div>
    </div>
  );
}

/* step 1 · 邪门的现象：函数调用返回了，函数体一行没跑 */
function WeirdCall() {
  return (
    <div className="ho-weird">
      <div className="ho-weird-hero ho-hero-in">
        写好了一个函数，调用它——
        <br />
        它<em>一行都没跑</em>。
      </div>
      <div className="ho-weird-demo">
        <div className="ho-code-card ho-card-in" style={{ animationDelay: "600ms" }}>
          <div className="ho-code-tag">协程函数 —— 开头多了个 async，不是普通函数</div>
          <div className="ho-code-line">
            <span className="ho-code-async">async</span> <span className="ho-code-kw">def</span> sample():
          </div>
          <div className="ho-code-line ho-code-indent">
            trace.append("body-ran")
            <span className="ho-code-note">留下痕迹：跑过了</span>
          </div>
          <div className="ho-code-line ho-code-indent">
            <span className="ho-code-kw">return</span> "sample-结果"
            <span className="ho-code-note">交出结果</span>
          </div>
        </div>
        <div className="ho-call-arrow ho-arrow-run">
          <span className="ho-call-label">调用 sample()</span>
          <svg viewBox="0 0 220 24" aria-hidden>
            <line x1="0" y1="12" x2="196" y2="12" stroke="var(--text-mute)" strokeWidth="2" />
            <path d="M196 4 L214 12 L196 20 Z" fill="var(--accent)" />
          </svg>
        </div>
        <div className="ho-state-col">
          <div className="ho-call-card ho-card-in" style={{ animationDelay: "1900ms" }}>
            <div className="ho-call-name">函数体</div>
            <div className="ho-call-state">0 行执行 · 原地不动</div>
          </div>
          <div className="ho-trace ho-trace-in" style={{ animationDelay: "2900ms" }}>
            <span className="ho-trace-label">执行痕迹</span>
            <span className="ho-trace-value">[ ]</span>
            <span className="ho-trace-note">程序没报错、照常跑完</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* step 2 · 定性：不是 bug，是设计 */
function NotABug() {
  return (
    <div className="ho-notbug">
      <div className="ho-notbug-line1 ho-hero-in">这不是 bug。</div>
      <div className="ho-notbug-line2 ho-hero-in" style={{ animationDelay: "900ms" }}>
        这是 <span className="ho-asyncio-plate">asyncio</span> 故意的设计。
      </div>
      <div className="ho-pledge ho-rise" style={{ animationDelay: "2200ms" }}>
        <span>一台机器</span>
        <span className="ho-dot">·</span>
        <span>半秒钟</span>
        <span className="ho-dot">·</span>
        <span>把这件事讲透</span>
      </div>
    </div>
  );
}

/* steps 3-6 · 四问逐个亮（1 项 = 1 step） */
function QuestionList({ active }: { active: number }) {
  return (
    <div className="ho-questions">
      <div className="ho-q-header ho-fade">
        <span className="ho-q-kicker">半秒钟 · 讲透四件事</span>
      </div>
      <ol className="ho-q-list">
        {QUESTIONS.map((q, i) => (
          <li
            key={q.num}
            className={
              "ho-q-item" +
              (i < active ? " is-past" : "") +
              (i === active ? " is-active" : "")
            }
            style={{ animationDelay: `${i === active ? 0 : 80}ms` }}
          >
            <span className="ho-q-num">{q.num}</span>
            <span className="ho-q-text">{q.text}</span>
            {i === active && <span className="ho-q-cursor" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function HookInner({ step }: ChapterStepProps) {
  if (step === 0) return <TitlePage />;
  if (step === 1) return <WeirdCall />;
  if (step === 2) return <NotABug />;
  return <QuestionList active={step - 3} />;
}

export default function Hook({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <HookInner step={step} />
    </div>
  );
}
