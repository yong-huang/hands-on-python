import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — Q1：Pipe vs Queue 选型双栏 */
  if (step === 0) {
    return (
      <div className="scene-pad qa-scene qa-q-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">选型问答 · 1</span>
        </div>
        <h2 className="qa-qtitle qa-rise" style={delay(200)}>Pipe 和 Queue，怎么选？</h2>
        <div className="qa-duo">
          <div className="qa-card card qa-rise" style={delay(700)}>
            <div className="qa-card-name mono">Pipe</div>
            <hr className="rule qa-card-rule" />
            <div className="qa-card-talk"><b>两点对话</b>，更轻</div>
            <div className="qa-card-note">双端双工，一来一回</div>
          </div>
          <div className="qa-card card qa-rise" style={delay(1000)}>
            <div className="qa-card-name mono">Queue</div>
            <hr className="rule qa-card-rule" />
            <div className="qa-card-talk"><b>多人分发</b>、回收结果</div>
            <div className="qa-card-note">内部有锁，多对多安全</div>
          </div>
        </div>
        <div className="qa-footnote qa-rise" style={delay(1900)}>
          <span className="label-mono">小注</span>毒丸 ＝ 约定一条「收到就退出」的特殊消息
        </div>
      </div>
    );
  }

  /* step 1 — Q3：大数组三条路（能不传就不传 > 零拷贝 > 兜底） */
  if (step === 1) {
    return (
      <div className="scene-pad qa-scene qa-q-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">选型问答 · 2</span>
        </div>
        <h2 className="qa-qtitle qa-rise" style={delay(200)}>大数组怎么传最快？</h2>
        <div className="qa-rank">
          <div className="qa-rank-row qa-rise" style={delay(600)}>
            <span className="qa-rank-ord mono">路 1</span>
            <div className="qa-rank-bar qa-rank-best qa-bar-grow" style={delay(1000)}>
              <b>能不传就不传</b>
              <span>fork 前放好 · 子进程整份复刻 · 零通信</span>
            </div>
          </div>
          <div className="qa-rank-row qa-rise" style={delay(900)}>
            <span className="qa-rank-ord mono">路 2</span>
            <div className="qa-rank-bar qa-rank-mid qa-bar-grow" style={delay(1500)}>
              <b>SharedMemory</b>
              <span>零拷贝共享 · 写一次读多次</span>
            </div>
          </div>
          <div className="qa-rank-row qa-rise" style={delay(1200)}>
            <span className="qa-rank-ord mono">路 3</span>
            <div className="qa-rank-bar qa-rank-fallback qa-bar-grow" style={delay(2000)}>
              <b>pickle + Pipe</b>
              <span>最通用 · 也最慢</span>
            </div>
          </div>
        </div>
        <div className="qa-footnote qa-rise" style={delay(2700)}>
          <span className="label-mono">小注</span>fork ＝ 复制父进程内存的启动方式
        </div>
      </div>
    );
  }

  /* step 2 — Q3 收束：先问能不能不传 */
  if (step === 2) {
    return (
      <div className="scene-pad qa-scene qa-q-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">选型问答 · 2（收束）</span>
        </div>
        <div className="qa-slogan qa-rise" style={delay(300)}>
          先问能不能<b>不传</b>
        </div>
        <div className="qa-slogan-sub qa-rise" style={delay(1200)}>
          只读数据开进程前放好 → 白拿一份；要传 → SharedMemory 零拷贝
        </div>
        <div className="qa-slogan-tail qa-rise" style={delay(2200)}>
          pickle + Pipe 永远是<b>兜底</b>——最通用，也最慢
        </div>
      </div>
    );
  }

  /* step 3 — Q4 上：高频小状态 → Manager+Lock */
  if (step === 3) {
    return (
      <div className="scene-pad qa-scene qa-q-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">选型问答 · 3</span>
        </div>
        <h2 className="qa-qtitle qa-rise" style={delay(200)}>Manager 和 SharedMemory，怎么选？</h2>
        <div className="qa-pick">
          <div className="qa-pick-what">
            <span className="qa-chip mono qa-rise" style={delay(600)}>计数器</span>
            <span className="qa-chip mono qa-rise" style={delay(750)}>开关</span>
            <span className="qa-pick-label qa-rise" style={delay(900)}>高频改动的一点点小状态</span>
          </div>
          <span className="qa-pick-arrow qa-arrow-run" />
          <div className="qa-pick-card card qa-rise" style={delay(1400)}>
            <div className="qa-card-name mono">Manager + Lock</div>
            <hr className="rule qa-card-rule" />
            <div className="qa-card-talk">加锁，<b>可读性优先</b></div>
            <div className="qa-card-note">可读性优先 ＝ 写起来顺手</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — Q4 下：大块二进制 → SharedMemory + 分工共存 */
  if (step === 4) {
    return (
      <div className="scene-pad qa-scene qa-q-scene">
        <div className="qa-head qa-rise">
          <span className="label-mono">选型问答 · 3（续）</span>
        </div>
        <div className="qa-pick">
          <div className="qa-pick-what">
            <span className="qa-chip mono qa-rise" style={delay(400)}>图片</span>
            <span className="qa-chip mono qa-rise" style={delay(550)}>视频帧</span>
            <span className="qa-pick-label qa-rise" style={delay(700)}>大块原始数据</span>
          </div>
          <span className="qa-pick-arrow qa-arrow-run" />
          <div className="qa-pick-card card qa-rise" style={delay(1200)}>
            <div className="qa-card-name mono">SharedMemory</div>
            <hr className="rule qa-card-rule" />
            <div className="qa-card-talk"><b>性能优先</b>——快最重要</div>
            <div className="qa-card-note">裸内存，只有字节</div>
          </div>
        </div>
        <div className="qa-slogan qa-slogan-sm qa-rise" style={delay(2300)}>
          生产系统里，通常是<b>分工共存</b>
        </div>
      </div>
    );
  }

  /* step 5 — 收尾：仓库路径 + 下一讲预告 */
  return (
    <div className="scene-pad qa-scene qa-end-scene">
      <div className="qa-end-label label-mono qa-rise">hands-on-python · concurrency / 06</div>
      <h2 className="qa-end-title qa-rise" style={delay(250)}>进程间通信 · 完</h2>
      <div className="qa-end-cmd mono qa-rise" style={delay(700)}>
        <span className="qa-end-prompt">$</span> python3 ipc_shared.py
      </div>
      <div className="qa-end-note qa-rise" style={delay(1300)}>一跑就有体感</div>
      <hr className="rule qa-end-rule qa-rise" style={delay(1900)} />
      <div className="qa-end-next qa-rise" style={delay(2300)}>
        下一讲：把开线程、开进程换成<b>统一接口</b>
      </div>
      <div className="qa-end-bye qa-rise" style={delay(3000)}>下期见</div>
    </div>
  );
}
