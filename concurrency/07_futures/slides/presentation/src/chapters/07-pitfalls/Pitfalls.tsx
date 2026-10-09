import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 坑卡骨架：序号 + 现象 + 图示 + 解法。 */
function Pit({
  ord,
  name,
  children,
  fix,
  fixDelay,
}: {
  ord: string;
  name: string;
  children: ReactNode;
  fix: string;
  fixDelay: number;
}) {
  return (
    <div className="scene-pad pk-scene pk-pit-scene">
      <div className="pk-pit-head pk-rise" style={delay(300)}>
        <span className="pk-pit-ord mono">{ord}</span>
        <span className="pk-pit-name">{name}</span>
      </div>
      <div className="pk-pit-body">{children}</div>
      <div className="pk-pit-fix pk-rise" style={delay(fixDelay)}>
        <span className="label-mono">解法</span>
        {fix}
      </div>
    </div>
  );
}

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0 — 转场 */
  if (step === 0) {
    return (
      <div className="scene-pad pk-scene pk-intro-scene">
        <div className="pk-intro-hero pk-rise" style={delay(200)}>
          <span className="pk-accent">五个</span>真实踩过的坑
        </div>
        <div className="pk-intro-nums">
          {["01", "02", "03", "04", "05"].map((n, i) => (
            <span className="pk-intro-num mono pk-pop" style={delay(400 + i * 240)} key={n}>
              {n}
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* step 1 — 坑 1：异常静默蒸发 */
  if (step === 1) {
    return (
      <Pit
        ord="坑 01"
        name="只 submit，不取 result"
        fix="as_completed 统一取，或挂完工回调自动查"
        fixDelay={6400}
      >
        <div className="pk-evap">
          <div className="pk-evap-worker card pk-pop" style={delay(1600)}>
            <span className="pk-evap-dot" />
            <span className="mono">worker</span>
            <span className="pk-evap-chip mono pk-pop" style={delay(2600)}>出错</span>
          </div>
          <span className="pk-evap-arrow pk-grow" style={delay(3400)}>→</span>
          <div className="pk-evap-receipt card pk-pop" style={delay(4000)}>
            <div className="mono pk-evap-tag">Future 欠条</div>
            <div className="pk-evap-lost mono pk-fadeout" style={delay(5200)}>
              异常 · 没人取，静默蒸发
            </div>
          </div>
        </div>
      </Pit>
    );
  }

  /* step 2 — 坑 2：忘了对号入座 */
  if (step === 2) {
    return (
      <Pit
        ord="坑 02"
        name="as_completed 里忘了对号入座"
        fix="提交时建好对号表，收结果查表入座"
        fixDelay={6600}
      >
        <div className="pk-mix">
          <div className="pk-mix-col">
            <div className="pk-mix-label mono pk-rise" style={delay(1400)}>完成出来的顺序</div>
            {["快任务 → 本该配 C", "中任务 → 本该配 B", "慢任务 → 本该配 A"].map((t, i) => (
              <div className="pk-mix-row mono pk-pop" style={delay(2000 + i * 450)} key={t}>
                {t}
              </div>
            ))}
          </div>
          <div className="pk-mix-stamp pk-pop" style={delay(4200)}>
            张冠李戴
          </div>
        </div>
      </Pit>
    );
  }

  /* step 3 — 坑 3：cancel 撤不了运行中的 */
  if (step === 3) {
    return (
      <Pit
        ord="坑 03"
        name="指望 cancel 停掉运行中的任务"
        fix="把停止标志做进任务里，让它自己收工"
        fixDelay={6200}
      >
        <div className="pk-cancel">
          <div className="pk-cancel-btn mono pk-pop" style={delay(1600)}>
            cancel()
          </div>
          <div className="pk-cancel-reply mono pk-pop" style={delay(3200)}>
            回你一句：「撤不了」
          </div>
          <div className="pk-cancel-track">
            <div className="pk-cancel-bar pk-grow" style={delay(4400)} />
            <span className="pk-cancel-keep pk-rise" style={delay(5200)}>
              任务照跑
            </span>
          </div>
        </div>
      </Pit>
    );
  }

  /* step 4 — 坑 4：塞了传不走的东西 */
  if (step === 4) {
    return (
      <Pit
        ord="坑 04"
        name="往进程池里塞传不走的东西"
        fix="跨进程一切都要能打包（pickle）：顶层函数 + 可序列化参数"
        fixDelay={9600}
      >
        <div className="pk-pack">
          <div className="pk-pack-item card pk-pop" style={delay(1600)}>
            <span className="mono pk-pack-name">lambda</span>
            <span className="pk-pack-talk">随手写的临时小函数</span>
          </div>
          <div className="pk-pack-item card pk-pop" style={delay(3400)}>
            <span className="pk-pack-name">打开着的文件</span>
            <span className="pk-pack-talk">握在手里的资源</span>
          </div>
          <div className="pk-pack-reject mono pk-pop" style={delay(6200)}>
            打包员当场报错
          </div>
          <div className="pk-pack-pickle mono pk-rise" style={delay(9200)}>
            干打包这个活的，叫 <span className="pk-accent">pickle</span>
          </div>
        </div>
      </Pit>
    );
  }

  /* step 5 — 坑 5：百人抢一把锤子（fallthrough 兜底步） */
  return (
    <div className="scene-pad pk-scene pk-pit-scene">
      <div className="pk-pit-head pk-rise" style={delay(300)}>
        <span className="pk-pit-ord mono">坑 05</span>
        <span className="pk-pit-name">线程池跑计算，还开一百个线程</span>
      </div>
      <div className="pk-crowd">
        <div className="pk-crowd-dots">
          {Array.from({ length: 12 }).map((_, i) => (
            <span className="pk-crowd-dot pk-pop" style={delay(1600 + i * 120)} key={i} />
          ))}
          <span className="pk-crowd-cap mono pk-rise" style={delay(3400)}>
            一百个线程
          </span>
        </div>
        <div className="pk-crowd-hammer card pk-pop" style={delay(2600)}>
          一把 GIL 大锁
        </div>
        <div className="pk-crowd-stamp pk-pop" style={delay(4600)}>
          纯添乱
        </div>
      </div>
      <div className="pk-crowd-rule pk-rise" style={delay(8200)}>
        <span className="label-mono">开多少</span>
        等待多的活，线程多开些；计算多的活，进程开到 <span className="mono">CPU</span> 核数就到顶
      </div>
    </div>
  );
}
