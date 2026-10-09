import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Solution.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function SolutionChapter({ step }: ChapterStepProps) {
  /* step 0 — 解法命名：结构化并发 + ExceptionGroup */
  if (step === 0) {
    return (
      <div className="scene-pad so-scene">
        <div className="so-head so-rise">
          <span className="label-mono">解法 · 命名</span>
          <span className="badge-mono so-py-badge mono">Python 3.11+</span>
        </div>
        <div className="so-name-hero so-rise" style={delay(200)}>
          结构化<span className="so-accent">并发</span>
        </div>
        <div className="so-inout so-rise" style={delay(700)}>
          <span className="so-inout-word">进</span>
          <span className="so-inout-arrow">→</span>
          <span className="so-inout-block mono">async with 块</span>
          <span className="so-inout-arrow">→</span>
          <span className="so-inout-word">出</span>
          <span className="so-inout-note">像函数调用一样，有进必有出</span>
        </div>
        <div className="so-eg-card so-rise" style={delay(1600)}>
          <span className="mono so-eg-name">ExceptionGroup</span>
          <span className="so-eg-talk">异常组——一个异常里，能装下好多异常</span>
        </div>
      </div>
    );
  }

  /* step 1 — 三个主角（随口播节拍逐个亮） */
  if (step === 1) {
    return (
      <div className="scene-pad so-scene">
        <div className="so-head so-rise">
          <span className="label-mono">今天 · 三个主角</span>
        </div>
        <div className="so-cast">
          <div className="so-cast-main so-rise" style={delay(600)}>
            <span className="so-cast-tag">核心</span>
            <span className="mono so-cast-name">TaskGroup</span>
            <span className="so-cast-talk">任务组 · 管一组任务的同生共死</span>
          </div>
          <div className="so-cast-pair">
            <div className="so-cast-card so-rise" style={delay(4400)}>
              <span className="so-cast-tag">管局部</span>
              <span className="mono so-cast-name so-cast-name-sm">wait_for</span>
              <span className="so-cast-talk">给单个操作加超时兜底</span>
            </div>
            <div className="so-cast-card so-rise" style={delay(7000)}>
              <span className="so-cast-tag">管局部</span>
              <span className="mono so-cast-name so-cast-name-sm">gather</span>
              <span className="so-cast-talk">一次收一批结果</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — TaskGroup 写法：async with 块，块结束必达终态 */
  if (step === 2) {
    return (
      <div className="scene-pad so-scene">
        <div className="so-head so-rise">
          <span className="label-mono">先说 · TaskGroup</span>
          <span className="mono so-head-note">语法不展开，记住「块」就行</span>
        </div>
        <div className="so-tg-wrap">
          <div className="so-tg-code so-rise" style={delay(220)}>
            <div className="mono so-tg-code-line"><span className="so-kw">async with</span> asyncio.TaskGroup() <span className="so-kw">as</span> tg:</div>
            <div className="mono so-tg-code-line so-tg-indent">tg.create_task(<span className="so-str">任务 A</span>)</div>
            <div className="mono so-tg-code-line so-tg-indent">tg.create_task(<span className="so-str">任务 B</span>)</div>
            <div className="mono so-tg-code-line so-tg-indent">tg.create_task(<span className="so-str">任务 C</span>)</div>
          </div>
          <div className="so-tg-exits">
            <div className="so-tg-exit so-rise" style={delay(1600)}>
              <span className="so-exit-mark">✓</span> 全部干完
            </div>
            <div className="so-tg-exit-or so-rise" style={delay(1800)}>／</div>
            <div className="so-tg-exit so-tg-exit-bad so-rise" style={delay(2000)}>
              <span className="so-exit-mark">✕</span> 全部取消
            </div>
          </div>
        </div>
        <div className="so-tg-slogan so-rise" style={delay(2600)}>
          块结束，必然收场——<b>不存在孤儿</b>
        </div>
      </div>
    );
  }

  /* step 3 — 连带责任制：一爆 → 信号 → 打包上抛 */
  if (step === 3) {
    return (
      <div className="scene-pad so-scene">
        <div className="so-head so-rise">
          <span className="label-mono">它的规矩 · 五个字</span>
        </div>
        <div className="so-lian-hero so-rise" style={delay(200)}>
          连带<span className="so-accent">责任制</span>
        </div>
        <div className="so-lian-flow">
          <div className="so-lian-tasks">
            <div className="so-lian-task so-rise" style={delay(900)}>任务 A</div>
            <div className="so-lian-task so-lian-task-bad so-rise" style={delay(1200)}>任务 B <span className="so-lian-boom">✕ 爆</span></div>
            <div className="so-lian-task so-rise" style={delay(900)}>任务 C</div>
          </div>
          <div className="so-lian-signal so-rise" style={delay(2200)}>
            取消信号 → 飞向其余任务
            <span className="so-lian-signal-note">那是一个专门的报错，一会儿拆开讲</span>
          </div>
          <div className="so-lian-pack so-rise" style={delay(3600)}>
            <span className="mono so-lian-pack-name">ExceptionGroup</span>
            <span>所有异常打包，块出口统一上抛</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 登山向导类比（随口播节拍连播） */
  return (
    <div className="scene-pad so-scene">
      <div className="so-head so-rise">
        <span className="label-mono">心智模型 · 登山向导</span>
      </div>
      <div className="so-guide-stage">
        <svg className="so-guide-svg" viewBox="0 0 1040 300" aria-hidden>
          <path d="M30 250 C 300 240 520 150 760 90 C 850 70 940 60 1010 62" fill="none" stroke="var(--rule)" strokeWidth="1.5" strokeDasharray="6 8" />
        </svg>
        <div className="so-climber so-c1 so-rise" style={delay(400)}>A</div>
        <div className="so-climber so-c2 so-rise" style={delay(550)}>B</div>
        <div className="so-climber so-c3 so-rise" style={delay(700)}>C</div>
        <div className="so-climber so-guide so-rise" style={delay(250)}>向导</div>
        <div className="so-fall so-stamp2" >✕ B 失足</div>
        <div className="so-whistle so-rise" style={delay(3300)}>哨声 · 全队停下，清点人数</div>
        <div className="so-descend so-rise" style={delay(5200)}>一起撤离 ↓</div>
      </div>
      <div className="so-report-row">
        <div className="so-report so-rise" style={delay(7500)}>
          <div className="so-report-title mono">ExceptionGroup · 撤离报告</div>
          <div className="so-report-line"><span>任务 A</span><b className="so-ok">✓ 无恙</b></div>
          <div className="so-report-line"><span>任务 B</span><b className="so-bad">✕ 失足</b></div>
          <div className="so-report-line"><span>任务 C</span><b className="so-ok">✓ 无恙</b></div>
        </div>
        <div className="so-guide-warn so-rise" style={delay(10500)}>
          吹哨要生效，得靠队员配合——<b>谁吞了取消信号装死，全队陪他干等</b>
        </div>
      </div>
    </div>
  );
}
