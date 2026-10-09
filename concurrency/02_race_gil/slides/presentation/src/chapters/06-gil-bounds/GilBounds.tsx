import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./GilBounds.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 对比条通用（串行 vs 4 线程）。 */
function BenchBars({
  serial,
  threads,
  serialW,
  threadW,
  verdict,
  delays,
}: {
  serial: string;
  threads: string;
  serialW: number;
  threadW: number;
  verdict: string;
  delays: number[];
}) {
  return (
    <div className="gb-bench">
      <div className="gb-bench-row">
        <span className="gb-bench-tag mono">不开线程</span>
        <div className="gb-bench-barwrap">
          <div className="gb-bench-bar gb-bench-bar--serial gb-grow" style={{ ...delay(delays[0]), width: `${serialW}%` }} />
          <span className="gb-bench-val mono" style={delay(delays[0] + 600)}>{serial}</span>
        </div>
      </div>
      <div className="gb-bench-row">
        <span className="gb-bench-tag mono">开 4 线程</span>
        <div className="gb-bench-barwrap">
          <div className="gb-bench-bar gb-bench-bar--threads gb-grow" style={{ ...delay(delays[1]), width: `${threadW}%` }} />
          <span className="gb-bench-val mono" style={delay(delays[1] + 600)}>{threads}</span>
        </div>
      </div>
      <div className="gb-bench-verdict gb-rise" style={delay(delays[2])}>{verdict}</div>
    </div>
  );
}

export default function GilBoundsChapter({ step }: ChapterStepProps) {
  /* step 0 — 压间隔 */
  if (step === 0) {
    return (
      <div className="scene-pad gb-scene gb-int-scene">
        <div className="gb-int-hero gb-rise">关键动作：把 GIL 切换间隔<b className="gb-accent">压到极小</b></div>
        <div className="gb-int-row">
          <div className="gb-int-card gb-pop" style={delay(500)}>
            <span className="label-mono">默认</span>
            <span className="gb-int-val mono">5 毫秒</span>
          </div>
          <span className="gb-int-arrow gb-rise" style={delay(1200)}>→</span>
          <div className="gb-int-card gb-int-card--hot gb-pop" style={delay(1700)}>
            <span className="label-mono">实验</span>
            <span className="gb-int-val mono">1 微秒</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 理由 */
  if (step === 1) {
    return (
      <div className="scene-pad gb-scene gb-why-scene">
        <div className="gb-why-line gb-rise">
          默认间隔下，两次切换之间，一个线程能跑<b className="gb-accent">上万条指令</b>
        </div>
        <div className="gb-why-line gb-rise" style={delay(1500)}>
          正好切在读和写之间的机会，<b className="gb-accent">小到几乎为零</b>
        </div>
        <div className="gb-why-foot gb-rise" style={delay(3000)}>
          你会得出「没有竞态」的<b>错误结论</b>
        </div>
      </div>
    );
  }

  /* step 2 — 手法口诀 */
  if (step === 2) {
    return (
      <div className="scene-pad gb-scene gb-mono-scene">
        <div className="gb-mono-kicker label-mono gb-rise">测竞态的标准手法</div>
        <div className="gb-mono-hero gb-rise" style={delay(400)}>
          不是让错误不随机，
          <br />
          是把切换调得<b className="gb-accent">特别勤</b>
        </div>
        <div className="gb-mono-sub gb-rise" style={delay(1800)}>
          让错误想躲都躲不掉
        </div>
      </div>
    );
  }

  /* step 3 — 方法交代 */
  if (step === 3) {
    return (
      <div className="scene-pad gb-scene gb-method-scene">
        <div className="gb-method-q gb-rise">开线程和不开线程，谁快？先交代一个坑。</div>
        <div className="gb-method-flow">
          <div className="gb-method-step gb-rise" style={delay(500)}>
            <span className="label-mono">第一版 · 直接掐表</span>
            <div className="gb-method-text">线程版只花九成时间，看着更快 —— <b className="gb-accent">假象</b></div>
          </div>
          <span className="gb-method-arrow gb-rise" style={delay(1700)}>→</span>
          <div className="gb-method-step gb-rise" style={delay(2100)}>
            <span className="label-mono">因为</span>
            <div className="gb-method-text">不开线程的那版先跑，电脑还没热起来</div>
          </div>
          <span className="gb-method-arrow gb-rise" style={delay(3200)}>→</span>
          <div className="gb-method-step gb-method-step--fix gb-rise" style={delay(3600)}>
            <span className="label-mono">修正</span>
            <div className="gb-method-text">空跑一轮热身 · 两边轮流各三轮 · 取中间那个数</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — CPU 密集 */
  if (step === 4) {
    return (
      <div className="scene-pad gb-scene gb-cpu-scene">
        <div className="gb-bench-kicker gb-rise">CPU 密集 —— 纯计算，数素数</div>
        <BenchBars
          serial="0.120s"
          threads="0.183s（1.53× 慢）"
          serialW={50}
          threadW={76}
          verdict="最勤切换下量的；平时没这么狠，但方向从来不是加速"
          delays={[500, 1500, 2800]}
        />
      </div>
    );
  }

  /* step 5 — 机理 */
  if (step === 5) {
    return (
      <div className="scene-pad gb-scene gb-mech-scene">
        <div className="gb-mech-hero gb-pop">
          同一时刻，只有<b className="gb-accent">一个线程</b>真干活
        </div>
        <div className="gb-mech-sub gb-rise" style={delay(1200)}>
          多出来的，全是切换开销
        </div>
      </div>
    );
  }

  /* step 6 — IO 密集 */
  if (step === 6) {
    return (
      <div className="scene-pad gb-scene gb-cpu-scene">
        <div className="gb-bench-kicker gb-rise">IO 密集 —— 时间花在等待上：网络请求 · 磁盘读写 · time.sleep</div>
        <BenchBars
          serial="1.019s"
          threads="0.260s（3.92× 快）"
          serialW={88}
          threadW={22}
          verdict="碰到干等，GIL 主动松手 —— 等待就叠在一起了"
          delays={[500, 1500, 2800]}
        />
      </div>
    );
  }

  /* step 7 — 公式 */
  return (
    <div className="scene-pad gb-scene gb-formula-scene">
      <div className="gb-formula gb-pop">
        GIL <b className="gb-accent">挡计算</b>，不挡<b className="gb-accent">等待</b>
      </div>
      <div className="gb-formula-sub gb-rise" style={delay(1000)}>
        就记这一句
      </div>
    </div>
  );
}
