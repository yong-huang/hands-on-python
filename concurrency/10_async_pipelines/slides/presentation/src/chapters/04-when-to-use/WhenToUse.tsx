import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./WhenToUse.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 三方案对比表（step 4，定宽三栏）。 */
const OPTIONS = [
  {
    pick: "线程 + queue.Queue",
    verdict: "留在线程版",
    talk: "已有线程代码 · 要和阻塞库混用",
    hot: false,
    at: 200,
  },
  {
    pick: "asyncio.Queue",
    verdict: "高并发 IO 流水线",
    talk: "事件循环内 · 单线程协作",
    hot: true,
    at: 1100,
  },
  {
    pick: "multiprocessing.Queue",
    verdict: "CPU 密集 · 多核并行",
    talk: "跨进程传数据得序列化",
    hot: false,
    at: 2000,
  },
] as const;

export default function WhenToUseChapter({ step }: ChapterStepProps) {
  /* step 0 — 主线判断：快慢不一的关卡 */
  if (step === 0) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">判断主线 · 什么活儿值得搭</span>
        </div>
        <div className="wu-checkpoint">
          <div className="wu-station wu-rise" style={delay(250)}>
            <div className="wu-station-name">抓取</div>
            <div className="wu-station-speed mono">快</div>
          </div>
          <div className="wu-gate wu-pop" style={delay(1100)}>
            <div className="wu-gate-name mono">queue</div>
            <div className="wu-gate-tag">解耦</div>
          </div>
          <div className="wu-station wu-rise" style={delay(1500)}>
            <div className="wu-station-name">解析</div>
            <div className="wu-station-speed wu-station-speed--slow mono">慢</div>
          </div>
          <div className="wu-gate wu-pop" style={delay(2300)}>
            <div className="wu-gate-name mono">queue</div>
            <div className="wu-gate-tag">解耦</div>
          </div>
          <div className="wu-station wu-rise" style={delay(2700)}>
            <div className="wu-station-name">入库</div>
            <div className="wu-station-speed wu-station-speed--slow mono">慢</div>
          </div>
        </div>
        <div className="wu-foot wu-rise" style={delay(3500)}>
          关卡多 · 两端速率不齐 → 才需要队列解耦
        </div>
      </div>
    );
  }

  /* step 1 — 场景双卡：高并发抓取 / 日志入库 */
  if (step === 1) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">典型场景 1 / 2</span>
        </div>
        <div className="wu-cases">
          <div className="wu-case wu-rise" style={delay(200)}>
            <div className="wu-case-ord mono">01</div>
            <div className="wu-case-name">高并发抓取</div>
            <div className="wu-case-flow">
              <span className="wu-case-cell">解析协程</span>
              <span className="wu-case-dir">URL 入队 →</span>
              <span className="wu-case-cell wu-case-cell--acc mono">Semaphore 限速</span>
              <span className="wu-case-dir">→ 请求协程</span>
            </div>
            <div className="wu-case-note">lab 11 异步抓取器 · 正是这套骨架</div>
          </div>
          <div className="wu-case wu-rise" style={delay(1600)}>
            <div className="wu-case-ord mono">02</div>
            <div className="wu-case-name">日志 / 事件入库</div>
            <div className="wu-case-flow">
              <span className="wu-case-cell">业务侧 · 产生快</span>
              <span className="wu-case-dir">有界队列 →</span>
              <span className="wu-case-cell wu-case-cell--acc">写库侧 · 自动减速</span>
            </div>
            <div className="wu-case-note">上游自动降速 · 不让内存爆掉</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 场景 3：守速率约束的第三方调用 */
  if (step === 2) {
    return (
      <div className="scene-pad wu-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">典型场景 3</span>
        </div>
        <div className="wu-third">
          <div className="wu-third-left wu-rise" style={delay(200)}>
            <div className="wu-third-name">第三方 API</div>
            <div className="wu-third-note">对方限流 · 超了就拒</div>
          </div>
          <div className="wu-third-gate wu-pop" style={delay(1000)}>
            <div className="mono">Semaphore 钳住在飞请求数</div>
          </div>
          <div className="wu-third-flood">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <span
                key={i}
                className="wu-third-dot wu-third-enter"
                style={delay(1600 + i * 110)}
              />
            ))}
          </div>
        </div>
        <div className="wu-third-motto wu-rise" style={delay(2800)}>
          既是<span className="wu-acc">自我保护</span>，也是<span className="wu-acc">礼貌</span>
        </div>
      </div>
    );
  }

  /* step 3 — 留在线程版决策卡 */
  if (step === 3) {
    return (
      <div className="scene-pad wu-scene wu-stay-scene">
        <div className="wu-head wu-rise">
          <span className="label-mono">反过来 · 怎么选</span>
        </div>
        <div className="wu-stay">
          <div className="wu-stay-cond wu-rise" style={delay(300)}>
            手上已有线程代码
          </div>
          <div className="wu-stay-or wu-rise" style={delay(900)}>／</div>
          <div className="wu-stay-cond wu-stay-cond--tall wu-rise" style={delay(1200)}>
            <span className="wu-stay-main">要用的库，一调就<b>卡住线程</b></span>
            <span className="wu-stay-talk">
              线程版只卡那一条 · asyncio 会卡住整个程序
            </span>
          </div>
        </div>
        <div className="wu-stay-verdict wu-pop" style={delay(2200)}>
          → 留在线程版
        </div>
      </div>
    );
  }

  /* step 4 — 三方案对比表 */
  return (
    <div className="scene-pad wu-scene">
      <div className="wu-head wu-rise">
        <span className="label-mono">三条路 · 一眼看全</span>
      </div>
      <div className="wu-table">
        {OPTIONS.map((o) => (
          <div
            className={`wu-trow wu-rise${o.hot ? " wu-trow--hot" : ""}`}
            style={delay(o.at)}
            key={o.pick}
          >
            <span className="wu-trow-pick mono">{o.pick}</span>
            <span className="wu-trow-verdict">{o.verdict}</span>
            <span className="wu-trow-talk">{o.talk}</span>
          </div>
        ))}
      </div>
      <div className="wu-table-note wu-rise" style={delay(2900)}>
        <span className="label-mono">序列化</span>
        把对象转成字节流 · 到对面再还原
      </div>
    </div>
  );
}
