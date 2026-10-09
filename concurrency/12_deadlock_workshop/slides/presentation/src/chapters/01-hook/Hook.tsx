import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** step 2 — 监控面板三读数：程序「健康」与挂起的反差。 */
const GAUGES = [
  { key: "cpu", label: "CPU", value: "空闲", sub: "usage ≈ 0%" },
  { key: "proc", label: "PROCESS", value: "健康", sub: "uptime · 36h" },
  { key: "log", label: "LOG", value: "0 条", sub: "新增 · 自上次告警" },
] as const;

/** step 5 — 事后补不到的现场：每个线程停在哪一行。 */
const THREADS = [
  { name: "Thread-1", wait: "在等 LOCK_B" },
  { name: "Thread-2", wait: "在等 LOCK_A" },
] as const;

/** step 6 — 调度器落点：13 次尝试只命中 1 次（确定性坐标，禁 random）。 */
const RUNS = [3, 10, 17, 25, 33, 41, 48, 56, 63, 71, 79, 87, 94] as const;
const WINDOW = { from: 43, to: 53 } as const;
const HIT_AT = 48;

/** step 7 — 四步路线图（为后续章节埋种子）。 */
const ROADMAP = [
  { cn: "复现", en: "REPRODUCE" },
  { cn: "取证", en: "FORENSICS" },
  { cn: "修复", en: "LOCK ORDER" },
  { cn: "回归", en: "REGRESS ×100" },
] as const;

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页） */
  if (step === 0) {
    return (
      <div className="scene-pad dk-scene dk-title-scene">
        <div className="dk-title-center">
          <div className="label-mono dk-rise">PYTHON · CONCURRENCY 12</div>
          <hr className="rule dk-title-rule dk-rise" style={delay(180)} />
          <h1 className="dk-title-main dk-rise" style={delay(320)}>
            死<span className="dk-title-accent">锁</span>
          </h1>
          <div className="dk-title-en dk-rise" style={delay(620)}>
            Deadlock · A Hands-On Autopsy
          </div>
          <div className="dk-title-sub dk-rise" style={delay(820)}>
            复现、取证、修复——死锁诊断工坊
          </div>
        </div>
        <div className="dk-titleblock dk-rise" style={delay(1050)}>
          <div className="dk-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="dk-tb-row"><span>Lab</span><b>concurrency / 12</b></div>
          <div className="dk-tb-row"><span>Script</span><b>deadlock_workshop.py</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 冷开场：一条没有错误码的告警 */
  if (step === 1) {
    return (
      <div className="scene-pad dk-scene dk-quote-scene">
        <div className="dk-quote-head dk-rise">
          <span className="label-mono">线上 · 告警</span>
          <span className="label-mono dk-quote-flag">alert · 无错误码</span>
        </div>
        <hr className="rule dk-quote-rule dk-rise" style={delay(200)} />
        <blockquote className="dk-quote dk-rise" style={delay(420)}>
          「服务还活着，也不报错，
          <br />
          就是永远不返回。」
        </blockquote>
        <div className="dk-quote-meta mono dk-rise" style={delay(1400)}>
          <span>error: —</span>
          <span>exit: —</span>
          <span className="dk-quote-meta-hit">return: 永不来</span>
        </div>
        <div className="dk-quote-note dk-rise" style={delay(2100)}>
          <span className="label-mono">注</span>
          一条没有错误码的告警
        </div>
      </div>
    );
  }

  /* step 2 — 监控三读数：CPU 空闲 / 进程健康 / 日志零新增 */
  if (step === 2) {
    return (
      <div className="scene-pad dk-scene dk-gauge-scene">
        <div className="dk-gauge-head dk-rise">
          <span className="label-mono">监控 · 此刻</span>
        </div>
        <div className="dk-gauges">
          {GAUGES.map((g, i) => (
            <div className="dk-gauge card dk-pop" style={delay(i * 260)} key={g.key}>
              <div className="label-mono dk-gauge-label">{g.label}</div>
              {g.key === "cpu" && (
                <svg className="dk-cpu-ring" viewBox="0 0 120 120" aria-hidden>
                  <circle className="dk-ring-track" cx="60" cy="60" r="52" />
                  <circle
                    className="dk-ring-arc"
                    cx="60"
                    cy="60"
                    r="52"
                    strokeDasharray="7 320"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
              )}
              {g.key === "proc" && (
                <div className="dk-proc-dot" aria-hidden />
              )}
              {g.key === "log" && (
                <div className="dk-log-rows" aria-hidden>
                  <i /><i /><i />
                </div>
              )}
              <div className="dk-gauge-value">{g.value}</div>
              <div className="dk-gauge-sub mono">{g.sub}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 3 — 重启循环：重启 → 复活 → 又挂 →（循环） */
  if (step === 3) {
    return (
      <div className="scene-pad dk-scene dk-loop-scene">
        <div className="dk-loop-row">
          <div className="dk-loop-node dk-pop">
            <div className="dk-loop-cn">重启</div>
            <div className="dk-loop-en mono">restart</div>
          </div>
          <span className="dk-loop-arrow dk-rise" style={delay(450)}>→</span>
          <div className="dk-loop-node dk-pop" style={delay(250)}>
            <div className="dk-loop-cn">满血复活</div>
            <div className="dk-loop-en mono">looks fine</div>
          </div>
          <span className="dk-loop-arrow dk-rise" style={delay(700)}>→</span>
          <div className="dk-loop-node dk-loop-node--bad dk-pop" style={delay(500)}>
            <div className="dk-loop-cn">又挂</div>
            <div className="dk-loop-en mono">2 days later</div>
          </div>
        </div>
        <div className="dk-loop-back dk-rise" style={delay(950)}>
          <span className="dk-loop-backline" aria-hidden />
          <span className="dk-loop-backlabel mono">↩ repeat</span>
        </div>
      </div>
    );
  }

  /* step 4 — 标语三连：不报错 / 不退出 / 只挂起 */
  if (step === 4) {
    const stamps = [
      { cn: "不报错", en: "no error" },
      { cn: "不退出", en: "no exit" },
      { cn: "只挂起", en: "hangs forever", hit: true },
    ];
    return (
      <div className="scene-pad dk-scene dk-stamp-scene">
        <div className="dk-stamp-kicker dk-rise">
          <span className="label-mono">死锁 · 症状</span>
        </div>
        <div className="dk-stamps">
          {stamps.map((s, i) => (
            <div
              className={`dk-stamp${s.hit ? " dk-stamp--hit" : ""} dk-pop`}
              style={delay(i * 700)}
              key={s.en}
            >
              <div className="dk-stamp-cn">{s.cn}</div>
              <div className="dk-stamp-en mono">{s.en}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 5 — 现场缺失：每个线程停在哪一行，日志里不会有 */
  if (step === 5) {
    return (
      <div className="scene-pad dk-scene dk-miss-scene">
        <div className="dk-miss-head dk-rise">
          <span className="label-mono">现场 · 事后补拍</span>
        </div>
        <div className="dk-miss-card card dk-pop" style={delay(260)}>
          {THREADS.map((t, i) => (
            <div className="dk-miss-row mono dk-rise" style={delay(600 + i * 350)} key={t.name}>
              <span className="dk-miss-thread">{t.name}</span>
              <span className="dk-miss-wait">{t.wait}</span>
              <span className="dk-miss-line">
                停在第 <b className="dk-miss-q">？？</b> 行
              </span>
            </div>
          ))}
          <div className="dk-miss-log mono dk-rise" style={delay(1500)}>
            <span className="dk-miss-thread">日志</span>
            <span className="dk-miss-wait">──────</span>
            <span className="dk-miss-line">一条都不会有</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 概率性：窄窗口 + 调度器落点，13 次命中 1 次 */
  if (step === 6) {
    return (
      <div className="scene-pad dk-scene dk-race-scene">
        <div className="dk-race-head dk-rise">
          <span className="label-mono">缺陷 · 概率性</span>
        </div>
        <div className="dk-race-track-wrap dk-rise" style={delay(250)}>
          <div className="dk-race-window" style={{ left: `${WINDOW.from}%`, width: `${WINDOW.to - WINDOW.from}%` }}>
            <span className="dk-race-window-label mono">竞争窗口 ≈ 10ms</span>
          </div>
          <div className="dk-race-track" aria-hidden />
          {RUNS.map((at, i) => {
            const hit = at === HIT_AT;
            return (
              <span
                className={`dk-race-dot${hit ? " dk-race-dot--hit dk-pop" : " dk-rise"}`}
                style={{ left: `${at}%`, ...delay(700 + i * 120) }}
                key={at}
                aria-hidden
              />
            );
          })}
        </div>
        <div className="dk-race-count mono dk-rise" style={delay(2400)}>
          调度器落点 · 13 次尝试 · 命中 <b>1</b> 次
        </div>
        <div className="dk-race-tagline dk-rise" style={delay(3000)}>
          再想复现，<span className="dk-tag-accent">怎么也撞不上</span>
        </div>
      </div>
    );
  }

  /* step 7 — 四步路线图（复现 → 取证 → 修复 → 回归） */
  return (
    <div className="scene-pad dk-scene dk-road-scene">
      <div className="dk-road-kicker dk-rise">
        <span className="label-mono">DEADLOCK · WORKFLOW</span>
      </div>
      <div className="dk-pipeline">
        {ROADMAP.map((s, i) => (
          <div className="dk-pipe-item" key={s.en}>
            {i > 0 && (
              <span className="dk-pipe-arrow dk-rise" style={delay(500 + i * 480)}>
                →
              </span>
            )}
            <div className="dk-pipe-node dk-pop" style={delay(i * 480)}>
              <div className="dk-pipe-ord mono">{`0${i + 1}`}</div>
              <div className="dk-pipe-cn">{s.cn}</div>
              <div className="dk-pipe-en mono">{s.en}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="dk-road-tagline dk-rise" style={delay(2200)}>
        一步都<span className="dk-tag-accent">不能少</span>
      </div>
    </div>
  );
}
