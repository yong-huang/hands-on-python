import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LiveDemo.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/**
 * 终端高亮状态：按「当前聚焦小节」给出每行的类名。
 * sec: 1=Pipe / 2=Queue / 3=SharedMemory / 4=Manager；focus = 当前 step（1~6）。
 * 非聚焦小节整体 ld-dim 灰化，聚焦小节的当前行 ld-hl 高亮。
 * 终端文本逐字取自 ipc_shared.py 真实输出（article §Quick Start 同源）。
 */
function lineCls(step: number, sec: 1 | 2 | 3 | 4, focusSec: 1 | 2 | 3 | 4, active: boolean) {
  if (sec !== focusSec) return "ld-dim";
  return active ? "ld-hl" : undefined;
}

function Terminal({ step }: { step: number }) {
  const focusSec: 1 | 2 | 3 | 4 = step === 1 ? 1 : step === 2 ? 2 : step <= 4 ? 3 : 4;
  return (
    <div className="ld-term card ld-rise">
      <div className="ld-term-bar">
        <span className="ld-dot" /><span className="ld-dot" /><span className="ld-dot" />
        <span className="ld-term-title mono">python3 ipc_shared.py</span>
      </div>
      <div className="ld-term-body">
        <div className="ld-cmd mono ld-rise" style={delay(200)}>
          <span className="ld-prompt">$</span> python3 ipc_shared.py
        </div>

        <div className={`ld-sec mono ld-rise ${focusSec === 1 ? "ld-hl-3" : "ld-dim"}`} style={delay(500)}>
          [1. Pipe：父子双向一来一回]
        </div>
        <div className="ld-line mono ld-rise" style={delay(800)}>
          <span className={lineCls(step, 1, focusSec, step === 1)}>
            {"  三次往返全部按序返回；双端各持一半，用完的一端要及时 close"}
          </span>
        </div>

        <div className={`ld-sec mono ld-rise ${focusSec === 2 ? "ld-hl-3" : "ld-dim"}`} style={delay(1100)}>
          [2. Queue：100,000 条消息批量传递]
        </div>
        <div className="ld-line mono ld-rise" style={delay(1400)}>
          <span className={lineCls(step, 2, focusSec, step === 2)}>
            {"  100,000 条分毫不差，耗时 0.39s（≈256,866 条/秒，含 pickle 开销）"}
          </span>
        </div>

        <div className={`ld-sec mono ld-rise ${focusSec === 3 ? "ld-hl-3" : "ld-dim"}`} style={delay(1700)}>
          [3. SharedMemory vs pickle+Pipe：50MB 大数组]
        </div>
        <div className="ld-line mono ld-rise" style={delay(2000)}>
          <span className={lineCls(step, 3, focusSec, step === 3)}>
            {"  SharedMemory 子进程侧: 20ms（零拷贝直读，父端写 21ms 全程）"}
          </span>
        </div>
        <div className="ld-line mono ld-rise" style={delay(2300)}>
          <span className={lineCls(step, 3, focusSec, step === 4)}>
            {"  pickle+Pipe  子进程侧: 366ms（序列化+管道+反序列化）"}
          </span>
        </div>
        <div className="ld-line mono ld-rise" style={delay(2600)}>
          <span className={lineCls(step, 3, focusSec, false)}>
            {"  子进程侧加速 18.5×，两边 CRC32 一致（50MB 数据完好）"}
          </span>
        </div>

        <div className={`ld-sec mono ld-rise ${focusSec === 4 ? "ld-hl-3" : "ld-dim"}`} style={delay(2900)}>
          [4. Manager：4 进程 × 2,500 次并发更新同一 key]
        </div>
        <div className="ld-line mono ld-rise" style={delay(3200)}>
          <span className={lineCls(step, 4, focusSec, step === 5)}>
            {"  无锁:   最终 count = 3,596（丢失 6,404 次，RPC 窗口被穿插）"}
          </span>
        </div>
        <div className="ld-line mono ld-rise" style={delay(3500)}>
          <span className={lineCls(step, 4, focusSec, step === 6)}>
            {"  加锁:   最终 count = 10,000（10,000 次分毫不差）"}
          </span>
        </div>
        <div className={`ld-ok mono ld-rise ${step >= 5 ? "ld-dim" : undefined}`} style={delay(3800)}>
          ✓ 全部断言通过
        </div>
      </div>
    </div>
  );
}

export default function LiveDemoChapter({ step }: ChapterStepProps) {
  /* step 0 — 进终端：四个小节标题 */
  if (step === 0) {
    return (
      <div className="scene-pad ld-scene">
        <div className="ld-term card ld-rise">
          <div className="ld-term-bar">
            <span className="ld-dot" /><span className="ld-dot" /><span className="ld-dot" />
            <span className="ld-term-title mono">python3 ipc_shared.py</span>
          </div>
          <div className="ld-term-body">
            <div className="ld-cmd mono ld-rise" style={delay(200)}>
              <span className="ld-prompt">$</span> python3 ipc_shared.py
            </div>
            <div className="ld-sec mono ld-rise" style={delay(600)}>[1. Pipe：父子双向一来一回]</div>
            <div className="ld-sec mono ld-rise" style={delay(900)}>[2. Queue：100,000 条消息批量传递]</div>
            <div className="ld-sec mono ld-rise" style={delay(1200)}>[3. SharedMemory vs pickle+Pipe：50MB 大数组]</div>
            <div className="ld-sec mono ld-rise" style={delay(1500)}>[4. Manager：4 进程 × 2,500 次并发更新同一 key]</div>
            <div className="ld-ok mono ld-rise" style={delay(1900)}>✓ 全部断言通过</div>
          </div>
        </div>
        <div className="ld-note ld-rise" style={delay(2300)}>
          <span className="label-mono">说明</span>跑完自动核对结果
        </div>
      </div>
    );
  }

  /* step 1 — 节选 [1]：Pipe 双向对话 */
  if (step === 1) {
    return (
      <div className="scene-pad ld-scene ld-split">
        <Terminal step={step} />
        <div className="ld-side">
          <div className="ld-chlabel label-mono ld-rise" style={delay(500)}>Pipe · 点对点通道</div>
          <div className="ld-side-note ld-rise" style={delay(1000)}>
            父进程<b>发一句</b>，子进程<b>回一句</b>——双端各持一半
          </div>
          <hr className="rule ld-side-rule ld-rise" style={delay(1600)} />
          <div className="ld-side-note ld-rise" style={delay(2000)}>
            确定性协议：<b>怎么跑都该全过</b>——三次往返，按序返回
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 节选 [2]：Queue 十万条 */
  if (step === 2) {
    return (
      <div className="scene-pad ld-scene ld-split">
        <Terminal step={step} />
        <div className="ld-side">
          <div className="ld-bignum mono ld-rise" style={delay(900)}>25.7<span className="ld-big-unit">万条/秒</span></div>
          <hr className="rule ld-side-rule ld-rise" style={delay(1400)} />
          <div className="ld-side-note ld-rise" style={delay(1700)}>每条都过<b>打包、拷贝、拆包</b>，依然够用</div>
          <div className="ld-side-meta label-mono ld-rise" style={delay(2100)}>0.39 s / 100,000 条</div>
        </div>
      </div>
    );
  }

  /* step 3 — 节选 [3] 上半：SharedMemory 20ms */
  if (step === 3) {
    return (
      <div className="scene-pad ld-scene ld-split">
        <Terminal step={step} />
        <div className="ld-side">
          <div className="ld-chlabel label-mono ld-rise" style={delay(500)}>SharedMemory · 子进程侧</div>
          <div className="ld-bignum mono ld-rise" style={delay(900)}>20<span className="ld-big-unit">ms</span></div>
          <hr className="rule ld-side-rule ld-rise" style={delay(1400)} />
          <div className="ld-side-note ld-rise" style={delay(1700)}><b>零拷贝直读</b>——父端写完，这边直接看</div>
        </div>
      </div>
    );
  }

  /* step 4 — 节选 [3] 下半：pickle+Pipe 366ms，18.5× */
  if (step === 4) {
    return (
      <div className="scene-pad ld-scene ld-split">
        <Terminal step={step} />
        <div className="ld-side">
          <div className="ld-versus ld-rise" style={delay(600)}>
            <span className="ld-vs-item mono">20 ms</span>
            <span className="ld-vs-word">对</span>
            <span className="ld-vs-item ld-vs-slow mono">366 ms</span>
          </div>
          <div className="ld-bignum ld-x ld-rise" style={delay(1200)}>18.5×</div>
          <hr className="rule ld-side-rule ld-rise" style={delay(1800)} />
          <div className="ld-side-note ld-rise" style={delay(2100)}>
            <b>pickle ＝ 打包工具</b>；两边校验和一致 ＝ 数据完好
          </div>
        </div>
      </div>
    );
  }

  /* step 5 / 6 — 节选 [4]：无锁丢更新 → 加锁分毫不差 */
  const locked = step === 6;
  return (
    <div className="scene-pad ld-scene ld-split">
      <Terminal step={step} />
      <div className="ld-side">
        <div className="ld-chlabel label-mono ld-rise" style={delay(400)}>
          {locked ? "加锁 · Manager 自带" : "无锁 · 裸共享"}
        </div>
        <div className={`ld-grid ld-rise${locked ? " ld-grid-full" : ""}`} style={delay(800)}>
          {Array.from({ length: 100 }, (_, i) => {
            const on = locked || i < 36;
            return (
              <span key={i} className={`ld-cell${on ? " ld-cell-on" : ""}`}
                style={locked ? delay(900 + i * 6) : i < 36 ? delay(900 + i * 14) : undefined} />
            );
          })}
        </div>
        <div className="ld-grid-legend ld-rise" style={delay(2200)}>
          {locked ? (
            <>
              <span className="ld-lg-on">■ count = 10,000</span>
              <span className="ld-lg-note label-mono">1 格 ≈ 100 次 · 一次没丢</span>
            </>
          ) : (
            <>
              <span className="ld-lg-on">■ 写入 3,596</span>
              <span className="ld-lg-off">□ 丢失 6,404</span>
              <span className="ld-lg-note label-mono">1 格 ≈ 100 次</span>
            </>
          )}
        </div>
        <hr className="rule ld-side-rule ld-rise" style={delay(2600)} />
        <div className="ld-side-note ld-rise" style={delay(2900)}>
          {locked
            ? <>同一份代码，截然不同的结果——<b>就差一把锁</b></>
            : <>四个进程同时抢着加一，更新的<b>空当被别人插队</b></>}
        </div>
      </div>
    </div>
  );
}
