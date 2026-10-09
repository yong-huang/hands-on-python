import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — 机制路线图 + 队列 API 对照 */
  if (step === 0) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-road">
          <span className="mc-road-stop mc-road-stop--on mc-rise" style={delay(200)}>传送带</span>
          <span className="mc-road-arrow mc-rise" style={delay(500)}>→</span>
          <span className="mc-road-stop mc-rise" style={delay(700)}>闸门</span>
          <span className="mc-road-arrow mc-rise" style={delay(1000)}>→</span>
          <span className="mc-road-stop mc-rise" style={delay(1200)}>背压</span>
        </div>
        <div className="mc-diff">
          <div className="mc-diff-col mc-rise" style={delay(1800)}>
            <div className="mc-diff-head label-mono">线程版 queue.Queue</div>
            <div className="mc-code">
              <div className="mc-code-line mono">q.put(x)</div>
              <div className="mc-code-line mono">q.get()</div>
            </div>
          </div>
          <div className="mc-diff-mid mc-rise" style={delay(2600)}>
            <div className="mc-diff-almost">API 几乎一样</div>
            <div className="mc-diff-plus mono">+ await</div>
          </div>
          <div className="mc-diff-col mc-rise" style={delay(3000)}>
            <div className="mc-diff-head mc-diff-head--acc label-mono">异步版 asyncio.Queue</div>
            <div className="mc-code mc-code--acc">
              <div className="mc-code-line mono">
                <b>await</b> q.put(x)
              </div>
              <div className="mc-code-line mono">
                <b>await</b> q.get()
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 等待的本质：阻塞 vs 让出 */
  if (step === 1) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">区别 · 在等待的本质</span>
        </div>
        <div className="mc-wait">
          <div className="mc-wait-card mc-wait-card--block mc-rise" style={delay(300)}>
            <div className="mc-wait-name">
              线程版 · <b>阻塞</b>
            </div>
            <div className="mc-wait-demo">
              <div className="mc-wait-lane">
                <span className="mc-wait-thread mono">线程</span>
                <span className="mc-wait-frozen mc-pop" style={delay(1200)}>卡住不动</span>
              </div>
              <div className="mc-wait-others mc-rise" style={delay(1800)}>
                别的活儿 · 全在干等
              </div>
            </div>
          </div>
          <div className="mc-wait-card mc-wait-card--yield mc-rise" style={delay(2600)}>
            <div className="mc-wait-name">
              异步版 · <b>让出</b>
            </div>
            <div className="mc-wait-demo">
              <div className="mc-wait-lane">
                <span className="mc-wait-thread mono">协程</span>
                <span className="mc-wait-give mc-pop" style={delay(3600)}>控制权 → 事件循环</span>
              </div>
              <div className="mc-wait-others mc-wait-others--run mc-rise" style={delay(4300)}>
                换<b>别的协程</b>接着干
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 毒丸收尾协议 */
  if (step === 2) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">毒丸收尾协议 · 原样适用</span>
        </div>
        <div className="mc-proto">
          <div className="mc-proto-step mc-rise" style={delay(300)}>
            <div className="mc-proto-num mono">01</div>
            <div className="mc-proto-name">消费者</div>
            <div className="mc-proto-talk">每处理完一条</div>
          </div>
          <span className="mc-proto-arrow mc-rise" style={delay(1100)}>→</span>
          <div className="mc-proto-step mc-proto-step--key mc-rise" style={delay(1400)}>
            <div className="mc-proto-num mono">02</div>
            <div className="mc-proto-code mono">task_done</div>
            <div className="mc-proto-talk">计数 −1</div>
          </div>
          <span className="mc-proto-arrow mc-rise" style={delay(2200)}>→</span>
          <div className="mc-proto-step mc-rise" style={delay(2500)}>
            <div className="mc-proto-num mono">03</div>
            <div className="mc-proto-code mono">join</div>
            <div className="mc-proto-talk">等计数归零</div>
          </div>
          <span className="mc-proto-arrow mc-rise" style={delay(3300)}>→</span>
          <div className="mc-proto-step mc-rise" style={delay(3600)}>
            <div className="mc-proto-num mono">04</div>
            <div className="mc-proto-name">退出</div>
            <div className="mc-proto-talk">确认全部干完</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — get 语义：一条消息只有一个消费者取走 */
  if (step === 3) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">get 语义 · 天然保证</span>
        </div>
        <div className="mc-once">
          <div className="mc-once-msg mc-pop" style={delay(300)}>
            <span className="mono">item</span>
          </div>
          {["消费者 A", "消费者 B", "消费者 C"].map((c, i) => (
            <div className={`mc-once-lane${i === 1 ? " mc-once-lane--win" : ""}`} key={c}>
              <span className="mc-once-dash" />
              <span className="mc-once-who">{c}</span>
              {i === 1 && (
                <span className="mc-once-take mc-pop" style={delay(2600)}>取走</span>
              )}
            </div>
          ))}
        </div>
        <div className="mc-once-note mc-rise" style={delay(3200)}>
          只有一个抢到 · <b>计数字典不用再配锁</b>
        </div>
      </div>
    );
  }

  /* step 4 — 闸门：async with sem */
  if (step === 4) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">闸门 · async with sem</span>
        </div>
        <div className="mc-gate-code-wrap">
          <div className="mc-gate-bracket mc-gate-bracket-draw" style={delay(900)} />
          <div className="mc-code mc-gate-code mc-rise" style={delay(300)}>
            <div className="mc-code-line mono">
              <b>async with sem</b>:
            </div>
            <div className="mc-code-line mc-code-line--in mono">…访问受限资源…</div>
            <div className="mc-code-line mc-code-line--in mono">…就这几行…</div>
          </div>
        </div>
        <div className="mc-gate-queue">
          <span className="mc-gate-wait mc-rise" style={delay(2400)}>第 11 个协程</span>
          <span className="mc-gate-wait mc-gate-wait--at mc-rise" style={delay(3000)}>
            在 <b className="mono">await</b> 处排队
          </span>
        </div>
      </div>
    );
  }

  /* step 5 — 上万协程：没有闸门 vs 有闸门 */
  if (step === 5) {
    return (
      <div className="scene-pad mc-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">单线程 · 挂起上万协程</span>
        </div>
        <div className="mc-flood">
          <div className="mc-flood-grid mc-rise" style={delay(200)}>
            {Array.from({ length: 100 }, (_, i) => (
              <span key={i} className="mc-flood-dot mc-flood-enter" style={delay(400 + i * 14)} />
            ))}
            <span className="mc-flood-scale mono">×100 · 每格再 100 个 ＝ 一万</span>
          </div>
          <div className="mc-flood-out">
            <div className="mc-flood-none mc-rise" style={delay(2400)}>
              <span className="mc-flood-none-word">没有闸门</span>
              <span className="mc-flood-none-talk">一万次请求 · 同时砸向目标</span>
            </div>
            <div className="mc-flood-motto mc-rise" style={delay(3400)}>
              限流 · 是<span className="mc-acc">高吞吐能持续</span>的前提
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 背压定义 + 定时炸弹 */
  return (
    <div className="scene-pad mc-scene">
      <div className="mc-head mc-rise">
        <span className="label-mono">背压 · 定义</span>
      </div>
      <div className="mc-bp">
        <div className="mc-bp-triad">
          <span className="mc-bp-item mc-pop" style={delay(300)}>不丢弃</span>
          <span className="mc-bp-item mc-pop" style={delay(800)}>不报错</span>
          <span className="mc-bp-item mc-bp-item--acc mc-pop" style={delay(1300)}>
            压力传回源头
          </span>
        </div>
        <div className="mc-bp-bomb mc-rise" style={delay(2400)}>
          <div className="mc-bp-fuse" />
          <div className="mc-bp-bomb-body">
            <div className="mc-bp-bomb-title">无界队列 + 慢消费者</div>
            <div className="mc-bp-bomb-talk">＝ 内存里的定时炸弹（实测峰值 4,749）</div>
          </div>
        </div>
      </div>
    </div>
  );
}
