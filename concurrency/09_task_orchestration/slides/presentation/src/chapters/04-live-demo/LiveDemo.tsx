import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 终端窗框（真实输出取自 article §Quick Start）。 */
function Terminal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ld-term">
      <div className="ld-term-head">
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="ld-term-dot" />
        <span className="mono ld-term-title">{title}</span>
      </div>
      <div className="ld-term-body mono">{children}</div>
    </div>
  );
}

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 跑实验：一行命令三个小节 */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-head ld-rise">
          <span className="label-mono">真机实验</span>
          <span className="mono ld-head-note">约 0.5 秒 · 断言自动核对</span>
        </div>
        <Terminal title="task_orchestration.py">
          <div className="ld-term-line ld-rise">$ python3 task_orchestration.py</div>
          <div className="ld-term-line ld-sec ld-rise" style={delay(500)}>[1. TaskGroup：一个失败，全员自动取消]</div>
          <div className="ld-term-line ld-sec ld-rise" style={delay(900)}>[2. wait_for：0.2s 超时，子协程被取消但清理了]</div>
          <div className="ld-term-line ld-sec ld-rise" style={delay(1300)}>[3. gather：return_exceptions 的两种策略]</div>
        </Terminal>
      </div>
    );
  }

  /* step 1 — §1 三任务时间轴 */
  if (step === 1) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-head ld-rise">
          <span className="label-mono">第一节 · 连带取消</span>
          <span className="mono ld-head-note">三个任务一起挂</span>
        </div>
        <div className="ld-bars">
          <div className="ld-bar-row ld-rise" style={delay(400)}>
            <span className="ld-bar-name">快任务</span>
            <div className="ld-bar-track">
              <div className="ld-bar-fill ld-bar-ok" style={{ width: "5%" }} />
            </div>
            <span className="ld-bar-time mono">0.05s ✓</span>
          </div>
          <div className="ld-bar-row ld-rise" style={delay(700)}>
            <span className="ld-bar-name">慢任务</span>
            <div className="ld-bar-track">
              <div className="ld-bar-fill ld-bar-run" style={{ width: "100%" }} />
            </div>
            <span className="ld-bar-time mono">1.0s…</span>
          </div>
          <div className="ld-bar-row ld-rise" style={delay(1000)}>
            <span className="ld-bar-name">问题任务</span>
            <div className="ld-bar-track">
              <div className="ld-bar-fill ld-bar-bad" style={{ width: "10%" }} />
            </div>
            <span className="ld-bar-time mono ld-time-bad">0.1s ✕ 引爆</span>
          </div>
        </div>
        <div className="ld-axis ld-rise" style={delay(1600)}>
          <span>0s</span><span>0.25s</span><span>0.5s</span><span>0.75s</span><span>1.0s</span>
        </div>
      </div>
    );
  }

  /* step 2 — §1 102ms hero 对照 */
  if (step === 2) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-head ld-rise">
          <span className="label-mono">第一节 · 看总耗时</span>
        </div>
        <div className="ld-hero-wrap">
          <div className="ld-hero-num-wrap ld-rise" style={delay(200)}>
            <span className="hero-num ld-hero">102</span>
            <span className="ld-hero-unit">ms</span>
            <span className="ld-hero-talk">引爆之后的总耗时</span>
          </div>
          <div className="ld-hero-vs ld-rise" style={delay(900)}>vs</div>
          <div className="ld-hero-slow ld-rise" style={delay(1100)}>
            <span className="ld-hero-slow-num mono">1000ms</span>
            <span className="ld-hero-talk">慢任务本来要跑满一整秒</span>
          </div>
        </div>
        <div className="ld-slogan ld-rise" style={delay(2000)}>
          102 毫秒就被叫停——<b>它真的被取消了</b>
        </div>
      </div>
    );
  }

  /* step 3 — §1 清理执行 + 异常打包 */
  if (step === 3) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-head ld-rise">
          <span className="label-mono">第一节 · 慢任务的收尾</span>
        </div>
        <div className="ld-clean-row">
          <div className="ld-clean-card ld-rise" style={delay(300)}>
            <div className="ld-clean-title">清理代码也执行了</div>
            <div className="ld-clean-item"><span>关文件</span><b>✓</b></div>
            <div className="ld-clean-item"><span>断连接</span><b>✓</b></div>
          </div>
          <div className="ld-clean-pack ld-rise" style={delay(1400)}>
            <span className="mono ld-pack-name">ExceptionGroup</span>
            <span className="ld-pack-talk">异常打包成异常组，块出口上抛</span>
          </div>
        </div>
        <div className="ld-slogan ld-rise" style={delay(2400)}>
          取消不是掐断，是<b>善后</b>
        </div>
      </div>
    );
  }

  /* step 4 — §2 超时 201ms 准时触发 */
  if (step === 4) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-head ld-rise">
          <span className="label-mono">第二节 · 超时兜底</span>
          <span className="mono ld-head-note">时限 0.2 秒</span>
        </div>
        <div className="ld-hero-wrap">
          <div className="ld-hero-num-wrap ld-rise" style={delay(200)}>
            <span className="hero-num ld-hero">201</span>
            <span className="ld-hero-unit">ms</span>
            <span className="ld-hero-talk">实测触发——准时</span>
          </div>
        </div>
        <div className="ld-stubborn ld-rise" style={delay(1400)}>
          <span className="mono ld-stubborn-name">stubborn()</span>
          <span>死硬分子，就是不退——<b>清理代码照样执行了 ✓</b></span>
          <span className="ld-stubborn-note">stubborn ＝ 演示里给这个死硬协程起的名字</span>
        </div>
      </div>
    );
  }

  /* step 5 — §2 新老写法对照 */
  if (step === 5) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-head ld-rise">
          <span className="label-mono">第二节 · 3.11 新写法</span>
          <span className="mono ld-head-note">效果一模一样</span>
        </div>
        <div className="ld-ways">
          <div className="ld-way ld-rise" style={delay(300)}>
            <div className="ld-way-tag">老写法 · 包一个调用</div>
            <div className="mono ld-way-code">wait_for(coro, timeout=0.2)</div>
          </div>
          <div className="ld-way ld-way-new ld-rise" style={delay(1200)}>
            <div className="ld-way-tag">新写法 · 包一整段逻辑</div>
            <div className="mono ld-way-code">async with asyncio.timeout(0.2): …</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — §3 容错开关打开：三个结果收齐 */
  if (step === 6) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-head ld-rise">
          <span className="label-mono">第三节 · gather 两种策略</span>
          <span className="ld-switch is-on ld-rise" style={delay(300)}>
            容错开关 <b>ON</b>
          </span>
        </div>
        <div className="ld-result-list">
          <div className="ld-result-row ld-rise" style={delay(900)}><span className="mono">'A'</span><span className="ld-result-talk">正常值</span></div>
          <div className="ld-result-row ld-result-bad ld-rise" style={delay(1700)}>
            <span className="mono">ValueError('gather-内错误')</span>
            <span className="ld-result-talk">异常对象 · 夹在第 2 位</span>
          </div>
          <div className="ld-result-row ld-rise" style={delay(2500)}><span className="mono">'B'</span><span className="ld-result-talk">正常值</span></div>
        </div>
        <div className="ld-slogan ld-rise" style={delay(3200)}>
          三个结果收齐——<b>失败不拖累别人</b>
        </div>
      </div>
    );
  }

  /* step 7 — §3 默认：首败即抛 + 收束 */
  return (
    <div className="scene-pad ld-scene">
      <div className="ld-head ld-rise">
        <span className="label-mono">第三节 · 默认模式</span>
        <span className="ld-switch ld-rise" style={delay(200)}>
          容错开关 <b>OFF</b>
        </span>
      </div>
      <div className="ld-default-flow ld-rise" style={delay(700)}>
        <span className="mono ld-df-chip">A ✓</span>
        <span className="mono ld-df-chip ld-df-bad">B ✕ 首败 → 立刻抛异常</span>
        <span className="mono ld-df-chip ld-df-dim">C 没人要了</span>
      </div>
      <div className="ld-final-pair">
        <div className="ld-fp ld-rise" style={delay(2200)}>
          <b>尽力收齐</b><span>打开开关</span>
        </div>
        <div className="ld-fp ld-rise" style={delay(3000)}>
          <b>一票否决</b><span>用默认</span>
        </div>
      </div>
    </div>
  );
}
