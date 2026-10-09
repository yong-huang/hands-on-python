import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Background.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function BackgroundChapter({ step }: ChapterStepProps) {
  /* step 0 — 串行写法：一条道走到黑 */
  if (step === 0) {
    return (
      <div className="scene-pad bd-scene bd-serial-scene">
        <div className="bd-codecard bd-pop" style={delay(200)}>
          <div className="bd-codecard-head mono">串行 · requests + 循环</div>
          <pre className="bd-code mono">{`for url in urls:
    fetch(url)   # 抓完一个 …`}</pre>
        </div>
        <div className="bd-serial-lane">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className={`bd-serial-dot bd-pop${i === 7 ? " bd-serial-dot--wait" : ""}`}
              style={delay(900 + i * 320)}
            >
              {i === 7 ? "…" : i + 1}
            </span>
          ))}
        </div>
        <div className="bd-serial-note bd-rise" style={delay(3400)}>
          一个抓完，<b className="bd-accent">再抓下一个</b>
        </div>
      </div>
    );
  }

  /* step 1 — 串行付全款：延迟累加成长队 */
  if (step === 1) {
    return (
      <div className="scene-pad bd-scene bd-fullprice-scene">
        <div className="bd-fp-headline bd-rise">时间全花在<b className="bd-accent">等网络</b>上</div>
        <div className="bd-fp-chainwrap">
          <div className="bd-fp-chain">
            {Array.from({ length: 50 }, (_, i) => (
              <span
                key={i}
                className="bd-fp-seg bd-grow"
                style={delay(500 + i * 45)}
              />
            ))}
          </div>
          <div className="bd-fp-scale mono bd-rise" style={delay(2900)}>
            <span>接口 1 · 等 30-80ms</span>
            <span>接口 2 · 等 30-80ms</span>
            <span>…… 一笔笔累加 = 好几秒</span>
            <span>接口 50 · 等 30-80ms</span>
          </div>
        </div>
        <div className="bd-fp-row">
          <span className="bd-fp-cpu bd-pop" style={delay(3300)}>
            <span className="label-mono">CPU</span>干等 · 帮不上忙
          </span>
          <span className="bd-fp-hero bd-rise" style={delay(3900)}>
            串行付的是<b className="bd-accent">全款</b>
          </span>
        </div>
      </div>
    );
  }

  /* step 2 — 线程池：10 路分头抓，等待重叠 */
  if (step === 2) {
    return (
      <div className="scene-pad bd-scene bd-pool-scene">
        <div className="bd-pool-headline bd-rise">
          第一反应：<b className="bd-accent">线程池</b> —— 雇 10 个人，分头去抓
        </div>
        <div className="bd-pool-grid">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="bd-pool-worker bd-pop" style={delay(600 + i * 110)}>
              <span className="bd-pool-face" />
              <span className="bd-pool-tag mono">工人 {i + 1}</span>
              <span className="bd-pool-bar bd-grow" style={delay(1200 + i * 110)} />
            </div>
          ))}
        </div>
        <div className="bd-pool-overlap">
          <div className="bd-pool-lanes">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="bd-pool-lane bd-grow" style={delay(2100 + i * 60)} />
            ))}
          </div>
          <div className="bd-pool-result bd-rise" style={delay(3000)}>
            等待<b className="bd-accent">重叠</b> → 0.4 秒搞定
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 线程池的天花板：每路占一个真实线程 */
  if (step === 3) {
    return (
      <div className="scene-pad bd-scene bd-ceiling-scene">
        <div className="bd-ceiling-headline bd-rise">
          但线程池有<b className="bd-accent">天花板</b>
        </div>
        <div className="bd-ceiling-def bd-pop" style={delay(700)}>
          <span className="label-mono">词义</span>
          同时推进好几件事 —— 也就是<b className="bd-accent">并发</b>
        </div>
        <div className="bd-ceiling-lanes">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bd-ceiling-lane bd-pop" style={delay(1500 + n * 350)}>
              <span className="bd-ceiling-lane-name mono">并发路 {n}</span>
              <span className="bd-ceiling-thread">
                真实线程 <span className="mono">#{n}</span>
              </span>
            </div>
          ))}
          <div className="bd-ceiling-more mono bd-rise" style={delay(2900)}>
            …… 开到几百路？
          </div>
        </div>
        <div className="bd-ceiling-verdict bd-rise" style={delay(3500)}>
          每路占一个真实线程 —— 光<b className="bd-accent">内存</b>和<b className="bd-accent">来回切换</b>，就先把机器拖累
        </div>
      </div>
    );
  }

  /* step 4 — 异步登场：一根线挂起成百上千请求 */
  if (step === 4) {
    return (
      <div className="scene-pad bd-scene bd-async-scene">
        <div className="bd-async-name bd-pop">异步</div>
        <div className="bd-async-def bd-rise" style={delay(500)}>
          <span className="bd-codechip mono">aiohttp</span>
          <span className="bd-async-def-text">
            = 架在 <span className="bd-codechip mono">asyncio</span> 上的异步 HTTP 库
          </span>
        </div>
        <div className="bd-async-rail">
          <div className="bd-async-threadline bd-grow" style={delay(1300)} />
          <div className="bd-async-pendants">
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                className="bd-async-pendant bd-drop"
                style={delay(1700 + i * 55)}
              />
            ))}
          </div>
          <div className="bd-async-threadlabel mono bd-rise" style={delay(1500)}>
            单线程
          </div>
        </div>
        <div className="bd-async-verdict bd-rise" style={delay(3000)}>
          同时<b className="bd-accent">挂起</b>成百上千个请求 —— 等待不占线程
        </div>
      </div>
    );
  }

  /* step 5 — 买票三联画 */
  if (step === 5) {
    return (
      <div className="scene-pad bd-scene bd-ticket-scene">
        <div className="bd-ticket-question bd-rise">为什么便宜？想象排队买票</div>
        <div className="bd-ticket-row">
          <div className="bd-ticket-panel bd-pop" style={delay(500)}>
            <div className="bd-ticket-panel-tag mono">串行</div>
            <div className="bd-ticket-queue bd-ticket-queue--one">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className="bd-person bd-pop" style={delay(900 + i * 60)} />
              ))}
            </div>
            <div className="bd-ticket-panel-note">排 50 次队</div>
          </div>
          <div className="bd-ticket-panel bd-pop" style={delay(1600)}>
            <div className="bd-ticket-panel-tag mono">线程池</div>
            <div className="bd-ticket-queue bd-ticket-queue--ten">
              {Array.from({ length: 30 }, (_, i) => (
                <span key={i} className="bd-person bd-pop" style={delay(2000 + i * 25)} />
              ))}
            </div>
            <div className="bd-ticket-panel-note">雇 10 人分头排</div>
          </div>
          <div className="bd-ticket-panel bd-ticket-panel--best bd-pop" style={delay(2700)}>
            <div className="bd-ticket-panel-tag mono">异步</div>
            <div className="bd-ticket-hold">
              <span className="bd-person bd-person--hold bd-pop" style={delay(3100)} />
              <div className="bd-ticket-tickets">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className="bd-ticket-slip bd-pop" style={delay(3300 + i * 70)}>
                    {i + 1}
                  </span>
                ))}
                <span className="bd-ticket-slip bd-ticket-slip--more bd-pop" style={delay(4200)}>
                  …
                </span>
              </div>
            </div>
            <div className="bd-ticket-panel-note">一人攥 50 张号 · 等叫号</div>
          </div>
        </div>
        <div className="bd-ticket-conclusion bd-rise" style={delay(5000)}>
          拿号等叫，<b className="bd-accent">不占人手</b>
        </div>
      </div>
    );
  }

  /* step 6 — 协程与事件循环：两个名字 */
  if (step === 6) {
    return (
      <div className="scene-pad bd-scene bd-name-scene">
        <div className="bd-name-card bd-pop" style={delay(300)}>
          <div className="bd-name-tag mono">COROUTINE</div>
          <div className="bd-name-word">协程</div>
          <div className="bd-name-def">能暂停、能恢复的任务</div>
        </div>
        <div className="bd-name-card bd-pop" style={delay(1300)}>
          <div className="bd-name-tag mono">EVENT LOOP</div>
          <div className="bd-name-word">事件循环</div>
          <div className="bd-name-def">单线程里来回调度它们的那只手</div>
        </div>
        <div className="bd-name-root bd-rise" style={delay(2700)}>
          等待不占线程 —— 这就是它<b className="bd-accent">并发便宜</b>的根源
        </div>
      </div>
    );
  }

  /* step 7 — 三种乱象（fallthrough 收尾） */
  return (
    <div className="scene-pad bd-scene bd-chaos-scene">
      <div className="bd-chaos-kicker bd-rise">等待便宜了，乱象跟着来</div>
      <div className="bd-chaos-row">
        <div className="bd-chaos-card bd-pop" style={delay(600)}>
          <div className="bd-chaos-num mono">01</div>
          <div className="bd-chaos-cond">并发一大</div>
          <div className="bd-chaos-hit">
            <b className="bd-accent">打爆对方</b>
          </div>
        </div>
        <div className="bd-chaos-card bd-pop" style={delay(1500)}>
          <div className="bd-chaos-num mono">02</div>
          <div className="bd-chaos-cond">接口一慢</div>
          <div className="bd-chaos-hit">
            <b className="bd-accent">拖死整体</b>
          </div>
        </div>
        <div className="bd-chaos-card bd-pop" style={delay(2400)}>
          <div className="bd-chaos-num mono">03</div>
          <div className="bd-chaos-cond">偶发一次失败</div>
          <div className="bd-chaos-hit">
            <b className="bd-accent">传染整批</b>
          </div>
        </div>
      </div>
      <div className="bd-chaos-verdict bd-rise" style={delay(3600)}>
        处理这些乱象，靠<b className="bd-accent">三件套</b> →
      </div>
    </div>
  );
}
