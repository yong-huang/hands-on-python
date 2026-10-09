import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./ThreeTools.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function ThreeToolsChapter({ step }: ChapterStepProps) {
  /* step 0 — 限流：Semaphore 闸门 */
  if (step === 0) {
    return (
      <div className="scene-pad tt-scene tt-limit-scene">
        <div className="tt-tool-kicker tt-kicker">
          <span className="tt-tool-no mono">第一件</span>
          <span className="tt-tool-name">限流</span>
        </div>
        <div className="tt-limit-cols">
          <div className="tt-gate">
            <div className="tt-gate-beam tt-grow" style={delay(700)} />
            <div className="tt-permits">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className="tt-permit tt-pop" style={delay(1200 + i * 90)}>
                  {i + 1}
                </span>
              ))}
            </div>
            <div className="tt-gate-caption tt-rise" style={delay(2300)}>
              只发 <b className="tt-accent hero-num">10</b> 张许可证的闸门
            </div>
          </div>
          <div className="tt-limit-right">
            <div className="tt-limit-name tt-pop" style={delay(200)}>
              <span className="mono tt-limit-en">Semaphore</span>
              <span className="tt-limit-cn">信号量</span>
            </div>
            <div className="tt-inflight tt-rise" style={delay(2900)}>
              <span className="label-mono">在飞</span>
              已发出 · 还没等到回复
            </div>
            <div className="tt-limit-verdict tt-rise" style={delay(3800)}>
              同时「在飞」的请求数，被死死限制在{" "}
              <b className="tt-accent hero-num">10</b> 以内
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 防两头 */
  if (step === 1) {
    return (
      <div className="scene-pad tt-scene tt-twohead-scene">
        <div className="tt-twohead-card tt-pop" style={delay(300)}>
          <div className="tt-twohead-tag mono">护对方</div>
          <div className="tt-twohead-text">
            <b className="tt-accent">打不死</b>别人
          </div>
        </div>
        <div className="tt-twohead-mid mono tt-pop" style={delay(900)}>
          ·
        </div>
        <div className="tt-twohead-card tt-pop" style={delay(1300)}>
          <div className="tt-twohead-tag mono">护自己</div>
          <div className="tt-twohead-text">
            <b className="tt-accent">撑不爆</b>自己
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 超时：死线 */
  if (step === 2) {
    return (
      <div className="scene-pad tt-scene tt-timeout-scene">
        <div className="tt-tool-kicker">
          <span className="tt-tool-no mono">第二件</span>
          <span className="tt-tool-name">超时</span>
        </div>
        <div className="tt-deadline">
          <div className="tt-deadline-track">
            <span className="tt-deadline-fill tt-grow" style={delay(600)} />
            <span className="tt-deadline-mark tt-pop" style={delay(1600)}>
              <span className="mono">5s</span> 放弃
            </span>
          </div>
          <div className="tt-deadline-scale mono tt-rise" style={delay(1000)}>
            <span>发出</span>
            <span>…… 等回复 ……</span>
          </div>
        </div>
        <div className="tt-timeout-compare">
          <div className="tt-timeout-card tt-pop" style={delay(2400)}>
            <span className="mono tt-timeout-tag">失败</span>
            <span>还能重试</span>
          </div>
          <div className="tt-timeout-card tt-timeout-card--worse tt-pop" style={delay(3000)}>
            <span className="mono tt-timeout-tag">挂死</span>
            <span>只能干等</span>
          </div>
        </div>
        <div className="tt-timeout-hero tt-rise" style={delay(3800)}>
          挂死，比失败<b className="tt-accent">更贵</b>
        </div>
      </div>
    );
  }

  /* step 3 — 重试：递增等待阶梯 */
  if (step === 3) {
    return (
      <div className="scene-pad tt-scene tt-retry-scene">
        <div className="tt-tool-kicker">
          <span className="tt-tool-no mono">第三件</span>
          <span className="tt-tool-name">重试</span>
        </div>
        <div className="tt-retry-loop">
          <span className="tt-retry-step tt-pop" style={delay(400)}>
            失败
          </span>
          <span className="tt-retry-arrow tt-rise" style={delay(1000)}>
            →
          </span>
          <span className="tt-retry-step tt-retry-step--wait tt-pop" style={delay(1400)}>
            等一等
          </span>
          <span className="tt-retry-arrow tt-rise" style={delay(2000)}>
            →
          </span>
          <span className="tt-retry-step tt-retry-step--again tt-pop" style={delay(2400)}>
            再试一次
          </span>
        </div>
        <div className="tt-retry-ladder">
          {[
            { ms: "20ms", h: 26 },
            { ms: "40ms", h: 52 },
            { ms: "80ms", h: 104 },
            { ms: "160ms", h: 208 },
          ].map(({ ms, h }, i) => (
            <div key={ms} className="tt-retry-bar-col">
              <span
                className="tt-retry-bar tt-riseup"
                style={{ ...delay(3200 + i * 450), height: h }}
              />
              <span className="tt-retry-ms mono">{ms}</span>
            </div>
          ))}
        </div>
        <div className="tt-retry-note tt-rise" style={delay(5200)}>
          等待一次比一次长
        </div>
      </div>
    );
  }

  /* step 4 — 指数退避命名 */
  if (step === 4) {
    return (
      <div className="scene-pad tt-scene tt-backoff-scene">
        <div className="tt-backoff-name tt-pop" style={delay(300)}>
          每次等待翻倍 = <b className="tt-accent">指数退避</b>
        </div>
        <div className="tt-backoff-row">
          <div className="tt-backoff-card tt-pop" style={delay(1400)}>
            <div className="tt-backoff-card-title">给抖动的服务</div>
            <div className="tt-backoff-card-text">留出恢复时间</div>
          </div>
          <div className="tt-backoff-card tt-pop" style={delay(2300)}>
            <div className="tt-backoff-card-title">避免重试风暴</div>
            <div className="tt-backoff-card-text">
              不让所有人挤在同一瞬间疯狂重试
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 5 — 三件套收束：分工表 */
  if (step === 5) {
    return (
      <div className="scene-pad tt-scene tt-division-scene">
        <div className="tt-division-title tt-rise">三件套，各管一类失败</div>
        <div className="tt-division-table">
          <div className="tt-division-row tt-pop" style={delay(500)}>
            <span className="tt-division-tool">限流</span>
            <span className="tt-division-arrow mono">→</span>
            <span className="tt-division-fight">
              防<b className="tt-accent">打爆</b>
            </span>
          </div>
          <div className="tt-division-row tt-pop" style={delay(1300)}>
            <span className="tt-division-tool">超时</span>
            <span className="tt-division-arrow mono">→</span>
            <span className="tt-division-fight">
              防<b className="tt-accent">挂死</b>
            </span>
          </div>
          <div className="tt-division-row tt-pop" style={delay(2100)}>
            <span className="tt-division-tool">重试</span>
            <span className="tt-division-arrow mono">→</span>
            <span className="tt-division-fight">
              防<b className="tt-accent">抖动</b>
            </span>
          </div>
        </div>
        <div className="tt-division-verdict tt-rise" style={delay(3200)}>
          组合起来，才算<b className="tt-accent">能上线</b>的客户端 ——
          <span className="tt-division-raw">只有裸请求：只是快，不是稳</span>
        </div>
      </div>
    );
  }

  /* step 6 — 值得上的三个场景 */
  if (step === 6) {
    return (
      <div className="scene-pad tt-scene tt-when-scene">
        <div className="tt-when-title tt-rise">什么活值得上它？</div>
        <div className="tt-when-row">
          <div className="tt-when-card tt-pop" style={delay(600)}>
            <div className="tt-when-num mono">01</div>
            <div className="tt-when-text">
              <b className="tt-accent">几百上千</b>个接口要调用
            </div>
          </div>
          <div className="tt-when-card tt-pop" style={delay(1700)}>
            <div className="tt-when-num mono">02</div>
            <div className="tt-when-text">
              服务器不稳 —— 要能<b className="tt-accent">处理抖动</b>
            </div>
          </div>
          <div className="tt-when-card tt-pop" style={delay(2800)}>
            <div className="tt-when-num mono">03</div>
            <div className="tt-when-text">
              给抓取器写<b className="tt-accent">自动测试</b>
              <span className="tt-when-sub">起个本地假服务器，喂它</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 7 — 别用边界 + httpx（fallthrough 收尾） */
  return (
    <div className="scene-pad tt-scene tt-not-scene">
      <div className="tt-not-title tt-rise">什么时候别用？</div>
      <div className="tt-not-rows">
        <div className="tt-not-row tt-pop" style={delay(500)}>
          <span className="tt-not-case">就抓两三个页面</span>
          <span className="tt-not-arrow mono">→</span>
          <span className="tt-not-why">串行最省事</span>
        </div>
        <div className="tt-not-row tt-pop" style={delay(1800)}>
          <span className="tt-not-case">页面要跑浏览器脚本才出内容</span>
          <span className="tt-not-arrow mono">→</span>
          <span className="tt-not-why">异步库拿不到完整结果</span>
        </div>
        <div className="tt-not-row tt-pop" style={delay(3100)}>
          <span className="tt-not-case">计算占大头的活</span>
          <span className="tt-not-arrow mono">→</span>
          <span className="tt-not-why">
            瓶颈不在等待 · 异步<b className="tt-accent">无能为力</b>
          </span>
        </div>
      </div>
      <div className="tt-httpx tt-rise" style={delay(4600)}>
        <span className="mono tt-httpx-name">httpx</span>
        想一套代码通吃两种模式可选它 —— 写法和 <span className="mono">requests</span> 一样，
        老写法、异步写法都能跑
      </div>
    </div>
  );
}
