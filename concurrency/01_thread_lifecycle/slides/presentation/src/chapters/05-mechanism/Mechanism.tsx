import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — start() 做两件事 */
  if (step === 0) {
    return (
      <div className="scene-pad mc-scene mc-start-scene">
        <div className="mc-thesis mc-rise">start 和 run 就差一步 —— start() 到底做了什么？</div>
        <div className="mc-start-flow">
          <div className="mc-start-node mono mc-rise" style={delay(300)}>start()</div>
          <span className="mc-flow-arrow mc-rise" style={delay(900)}>→</span>
          <div className="mc-start-step mc-pop" style={delay(1300)}>
            <span className="mc-step-ord mono">01</span>
            <span className="mc-step-text">请操作系统创建<b className="mc-accent">真正的线程</b></span>
          </div>
          <span className="mc-flow-arrow mc-rise" style={delay(1900)}>→</span>
          <div className="mc-start-step mc-pop" style={delay(2300)}>
            <span className="mc-step-ord mono">02</span>
            <span className="mc-step-text">在<b className="mc-accent">新线程</b>里跑 run()</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — run() 直调：主角是 t.run()，start 行降为对照 */
  if (step === 1) {
    return (
      <div className="scene-pad mc-scene mc-who-scene">
        <div className="mc-who-row mc-who-row--dim mc-rise" style={delay(200)}>
          <span className="mc-who-call mono">t.start()</span>
          <span className="mc-who-arrow">→</span>
          <span className="mc-who-exec">新线程执行</span>
        </div>
        <div className="mc-who-row mc-who-row--active mc-rise" style={delay(900)}>
          <span className="mc-who-call mono">t.run()</span>
          <span className="mc-who-arrow">→</span>
          <span className="mc-who-exec">只是普通方法调用</span>
        </div>
        <div className="mc-who-verdict mc-rise" style={delay(1800)}>
          执行者：<b className="mc-accent">你（当前线程）</b>
        </div>
      </div>
    );
  }

  /* step 2 — join()：喊一嗓子，原地停住 */
  if (step === 2) {
    return (
      <div className="scene-pad mc-scene mc-join-scene">
        <div className="mc-join-call mono mc-rise">join()</div>
        <div className="mc-join-quote mc-rise" style={delay(500)}>
          「我等你跑完再走」
        </div>
        <div className="mc-join-lanes">
          <div className="mc-join-lane mc-rise" style={delay(1300)}>
            <span className="mc-join-who mono">调用者</span>
            <div className="mc-join-blocked">
              <span className="mc-join-blocked-label">原地停住 · 阻塞</span>
            </div>
          </div>
          <div className="mc-join-lane mc-rise" style={delay(1800)}>
            <span className="mc-join-who mono">目标线程</span>
            <div className="mc-join-working">
              <span className="mc-join-work-label">干完活 → 放行</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — join 两个推论 */
  if (step === 3) {
    return (
      <div className="scene-pad mc-scene mc-infer-scene">
        <div className="mc-infer-card mc-pop" style={delay(200)}>
          <span className="label-mono">推论一</span>
          <div className="mc-infer-text">对<b className="mc-accent">已经干完</b>的线程 join —— 马上返回</div>
        </div>
        <div className="mc-infer-card mc-pop" style={delay(1400)}>
          <span className="label-mono">推论二</span>
          <div className="mc-infer-text">
            join 设了超时，到点只是<b className="mc-accent">你不等了</b> —— 对方照跑，不会被杀
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 不写 join：隐式 join 兜底 */
  if (step === 4) {
    return (
      <div className="scene-pad mc-scene mc-shutdown-scene">
        <div className="mc-shutdown-hero mc-rise">
          不写 join？<b className="mc-accent">普通线程不用慌</b>
        </div>
        <div className="mc-shutdown-row mc-pop" style={delay(1200)}>
          <span className="mc-shutdown-when mono">程序退出前</span>
          <span className="mc-shutdown-what">Python 自动等它们<b className="mc-accent">全部跑完</b></span>
        </div>
        <div className="mc-shutdown-row mc-shutdown-row--no mc-pop" style={delay(2400)}>
          <span className="mc-shutdown-when mono">daemon</span>
          <span className="mc-shutdown-what">{"✗\uFE0E"} 后台线程没有这个待遇</span>
        </div>
      </div>
    );
  }

  /* step 5 — daemon 强杀时刻（竖直截断线切过两条时间线） */
  if (step === 5) {
    return (
      <div className="scene-pad mc-scene mc-kill-scene">
        <div className="mc-thesis mc-rise">daemon 的规矩：daemon=True 要在 start() 之前设</div>
        <div className="mc-kill-wrap mc-rise" style={delay(500)}>
          <span className="mc-kill-line" style={delay(2000)} />
          <div className="mc-kill-lane">
            <span className="mc-kill-who mono">主线程</span>
            <div className="mc-kill-track">
              <div className="mc-kill-bar mc-kill-bar--main" style={delay(800)} />
              <span className="mc-kill-flag mono mc-rise" style={delay(1800)}>退出</span>
            </div>
          </div>
          <div className="mc-kill-lane">
            <span className="mc-kill-who mono">daemon</span>
            <div className="mc-kill-track">
              <div className="mc-kill-bar mc-kill-bar--daemon" style={delay(1200)} />
              <div className="mc-kill-ghost" style={delay(1700)} />
            </div>
          </div>
        </div>
        <div className="mc-kill-torn mc-rise" style={delay(2800)}>
          主线程一退，daemon 被立即掐掉 —— 文件停在<b className="mc-accent">半个字节</b>上
        </div>
      </div>
    );
  }

  /* step 6 — 分界线两栏 */
  return (
    <div className="scene-pad mc-scene mc-line-scene">
      <div className="mc-thesis mc-rise">所以，分界线很清楚</div>
      <div className="mc-line-cols">
        <div className="mc-line-col mc-line-col--yes mc-rise" style={delay(400)}>
          <div className="mc-line-colhead mono">{"✓\uFE0E"} 交给 daemon</div>
          <div className="mc-line-item">每隔几秒报个平安</div>
          <div className="mc-line-item">顺手记个监控数字</div>
          <div className="mc-line-foot">死了无所谓的活</div>
        </div>
        <div className="mc-line-col mc-line-col--no mc-rise" style={delay(1400)}>
          <div className="mc-line-colhead mono">{"✗\uFE0E"} 一概不行</div>
          <div className="mc-line-item">写硬盘（落盘）</div>
          <div className="mc-line-item">写数据库（提交事务）</div>
          <div className="mc-line-foot">要可靠收尾 → 普通线程 + join()</div>
        </div>
      </div>
    </div>
  );
}
