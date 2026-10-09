import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 坑标号 + 标题头。 */
function PitHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="pt-head pt-rise">
      <span className="pt-head-no mono">{n}</span>
      <span className="pt-head-title">{title}</span>
    </div>
  );
}

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0 — 坑 1 现象：lambda 丢给池 */
  if (step === 0) {
    return (
      <div className="scene-pad pt-scene">
        <PitHead n="坑 1" title="lambda 丢给进程池" />
        <div className="pt-code pt-rise" style={delay(300)}>
          pool.map(<span className="pt-code-bad">lambda x: heavy(x)</span>, data)
        </div>
        <div className="pt-error pt-rise" style={delay(1000)}>
          PicklingError: Can&apos;t get <em>local object</em>
        </div>
        <div className="pt-gloss pt-rise" style={delay(1700)}>
          <span className="label-mono">名词</span>
          lambda ＝ <em>匿名函数</em>——没有名字的小函数
        </div>
      </div>
    );
  }

  /* step 1 — 坑 1 解法：顶层有名函数 */
  if (step === 1) {
    return (
      <div className="scene-pad pt-scene">
        <PitHead n="坑 1" title="解法" />
        <div className="pt-code pt-rise" style={delay(300)}>
          <div><span className="pt-code-kw">def</span> is_prime(n): ...  <span className="pt-code-ok">✓ 顶层有名函数</span></div>
          <div>pool.map(functools.<span className="pt-code-kw">partial</span>(job, arg), data)</div>
        </div>
        <div className="pt-why pt-rise" style={delay(1200)}>
          spawn <em>按名字</em>打包函数——它没名字，就没法打包
        </div>
      </div>
    );
  }

  /* step 2 — 坑 2：漏写 main 保护 */
  if (step === 2) {
    return (
      <div className="scene-pad pt-scene">
        <PitHead n="坑 2" title="漏写 main 保护" />
        <div className="pt-code pt-code-big pt-rise" style={delay(300)}>
          <span className="pt-code-kw">if</span> __name__ == <span className="pt-code-str">&apos;__main__&apos;</span>:
        </div>
        <div className="pt-gloss pt-rise" style={delay(1000)}>
          就是那句『<em>如果我是主程序</em>，才往下走』——入口代码一律包起来
        </div>
        <div className="pt-corner pt-rise" style={delay(1800)}>
          <span className="label-mono">提醒</span>
          脚本要写，Jupyter 里也要写——就是第 4 章的静默失败
        </div>
      </div>
    );
  }

  /* step 3 — 坑 3：任务太小倒挂 */
  if (step === 3) {
    return (
      <div className="scene-pad pt-scene">
        <PitHead n="坑 3" title="任务太小就上多进程" />
        <div className="pt-bench">
          <div className="pt-bench-row">
            <span className="pt-bench-name pt-rise">串行</span>
            <div className="pt-bench-track">
              <div className="pt-bench-bar pt-bench-bar--serial pt-grow" style={{ ...delay(300), width: "56%" }} />
            </div>
            <span className="mono pt-bench-sec pt-rise" style={delay(500)}>1.0×</span>
          </div>
          <div className="pt-bench-row">
            <span className="pt-bench-name pt-rise" style={delay(800)}>多进程</span>
            <div className="pt-bench-track">
              <div className="pt-bench-bar pt-bench-bar--slow pt-grow" style={{ ...delay(1000), width: "88%" }} />
            </div>
            <span className="mono pt-bench-sec pt-rise" style={delay(1200)}>0.8×，比串行还慢（示意）</span>
          </div>
        </div>
        <div className="pt-gloss pt-rise" style={delay(1900)}>
          启动成本吞掉全部收益——动手前<em>先算这笔账</em>
        </div>
      </div>
    );
  }

  /* step 4 — 坑 4：print 撕裂 */
  if (step === 4) {
    return (
      <div className="scene-pad pt-scene">
        <PitHead n="坑 4" title="子进程里大量 print" />
        <div className="pt-torn">
          {[
            ["P1", "计数完成，用", "时 0.31 秒"],
            ["P2", "时 0.05 秒，", "任务 T3 结束"],
            ["P3", "任务 T0 结束，", "耗时最长"],
          ].map(([p, a, b], i) => (
            <div className="pt-torn-row pt-rise" style={delay(i * 500)} key={p}>
              <span className="mono pt-torn-src">{p}</span>
              <span className="pt-torn-a">{a}</span>
              <span className="mono pt-torn-src">{p === "P1" ? "P2" : p === "P2" ? "P3" : "P1"}→</span>
              <span className="pt-torn-b">{b}</span>
            </div>
          ))}
        </div>
        <div className="pt-gloss pt-rise" style={delay(1900)}>
          输出<em>撕成一团</em>——结果用返回值带回来，主进程统一输出
        </div>
      </div>
    );
  }

  /* step 5 — 坑 5：map 不是流式 */
  const MAP_ITEMS = [0, 1, 2, 3];
  return (
    <div className="scene-pad pt-scene">
      <PitHead n="坑 5" title="以为 map 会一个一个返回" />
      <div className="pt-lanes">
        <div className="pt-lane pt-rise" style={delay(300)}>
          <div className="pt-lane-name mono">map</div>
          <div className="pt-lane-track">
            <div className="pt-lane-wait pt-grow" />
            {MAP_ITEMS.map((i) => (
              <span className="pt-lane-chip pt-pop" style={delay(1500 + i * 90)} key={i}>
                T{i}
              </span>
            ))}
          </div>
          <div className="pt-lane-note">等全部干完，整批一起回</div>
        </div>
        <div className="pt-lane pt-lane--imap pt-rise" style={delay(700)}>
          <div className="pt-lane-name mono">imap</div>
          <div className="pt-lane-track">
            {MAP_ITEMS.map((i) => (
              <span className="pt-lane-chip pt-lane-chip--stream pt-pop" style={delay(1100 + i * 330)} key={i}>
                T{i}
              </span>
            ))}
          </div>
          <div className="pt-lane-note pt-lane-note--on">完成一个，收一个</div>
        </div>
      </div>
      <div className="pt-corner pt-rise" style={delay(2500)}>
        <span className="label-mono">变体</span>
        无序版 imap_unordered——谁先完成谁先出
      </div>
    </div>
  );
}
