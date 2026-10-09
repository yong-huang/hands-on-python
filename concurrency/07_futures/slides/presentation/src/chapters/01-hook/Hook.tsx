import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 「地基」一拍里的两组造型：线程 = 一间屋里的小分队；进程 = 一人一间屋。 */
function Crews() {
  return (
    <div className="fk-crew">
      <div className="fk-crew-room">
        <span className="fk-dot" />
        <span className="fk-dot" />
        <span className="fk-dot" />
      </div>
      <div className="fk-crew-cap mono">线程 · 一个程序里的干活小分队</div>
    </div>
  );
}

function Rooms() {
  return (
    <div className="fk-rooms">
      <div className="fk-rooms-row">
        {[0, 1, 2].map((i) => (
          <div className="fk-room" key={i}>
            <span className="fk-dot fk-dot--lone" />
          </div>
        ))}
      </div>
      <div className="fk-crew-cap mono">进程 · 多开几个程序，一人一间屋子</div>
    </div>
  );
}

/** 三口气引用卡的公共骨架（口播拍 4~6 逐句一致，视觉注脚各不相同）。 */
function GroanFrame({ ord, children, foot }: { ord: string; children: ReactNode; foot: ReactNode }) {
  return (
    <div className="scene-pad fk-scene fk-quote-scene">
      <div className="fk-quote-head fk-rise">
        <span className="label-mono">写并发 · 三口气</span>
        <span className="fk-quote-ord mono">{ord} / 03</span>
      </div>
      <hr className="rule fk-quote-rule fk-rise" style={delay(200)} />
      <blockquote className="fk-quote fk-rise" style={delay(420)}>
        {children}
      </blockquote>
      <div className="fk-quote-foot">{foot}</div>
    </div>
  );
}

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页（宣布句落标题页，PLAYBOOK 硬规则） */
  if (step === 0) {
    return (
      <div className="scene-pad fk-scene fk-title-scene">
        <div className="fk-title-center">
          <div className="label-mono fk-rise">PYTHON · CONCURRENCY 07</div>
          <hr className="rule fk-title-rule fk-rise" style={delay(180)} />
          <h1 className="fk-title-main fk-rise" style={delay(320)}>
            Future<span className="fk-title-sep">：</span>
            <span className="fk-title-accent">一张结果欠条</span>
          </h1>
          <div className="fk-title-en fk-rise" style={delay(680)}>
            concurrent.futures — the unified executor
          </div>
          <div className="fk-title-sub fk-rise" style={delay(900)}>
            提交、取结果、按完成序收集 —— 两个抽象全管了
          </div>
        </div>
        <div className="fk-titleblock fk-rise" style={delay(1150)}>
          <div className="fk-tb-row"><span>Series</span><b>hands-on-python</b></div>
          <div className="fk-tb-row"><span>Lab</span><b>concurrency / 07</b></div>
          <div className="fk-tb-row"><span>API</span><b>Executor · Future</b></div>
        </div>
      </div>
    );
  }

  /* step 1 — 十秒地基：并发 / 线程 / 进程（随口播三段推进） */
  if (step === 1) {
    return (
      <div className="scene-pad fk-scene fk-base-scene">
        <div className="fk-base-head">
          <span className="label-mono fk-rise">先立十秒地基</span>
          <div className="fk-base-hero fk-rise" style={delay(300)}>
            让一堆活儿同时干，叫<span className="fk-accent">并发</span>
          </div>
        </div>
        <div className="fk-base-diagram">
          <div className="fk-tasks fk-pop" style={delay(2400)}>
            <div className="fk-tasks-label mono">一堆活儿</div>
            <div className="fk-task-bar fk-grow" style={delay(2600)} />
            <div className="fk-task-bar fk-grow" style={delay(2750)} />
            <div className="fk-task-bar fk-grow" style={delay(2900)} />
            <div className="fk-task-bar fk-grow" style={delay(3050)} />
          </div>
          <div className="fk-base-arrow fk-rise" style={delay(4200)}>→</div>
          <div className="fk-crew-wrap fk-pop" style={delay(5400)}>
            <Crews />
          </div>
          <div className="fk-rooms-wrap fk-pop" style={delay(9400)}>
            <Rooms />
          </div>
        </div>
        <div className="fk-base-note mono fk-rise" style={delay(11800)}>
          Python 的两条路：线程 · 进程
        </div>
      </div>
    );
  }

  /* step 2 — 「池」：预先雇好一批、反复用 */
  if (step === 2) {
    return (
      <div className="scene-pad fk-scene fk-pool-scene">
        <div className="fk-pool-diagram">
          <div className="fk-pool-group fk-pop" style={delay(500)}>
            <div className="fk-pool-tag mono">预先雇好一批</div>
            <div className="fk-pool-inner">
              <div className="fk-crew-room fk-crew-room--sm">
                <span className="fk-dot" />
                <span className="fk-dot" />
                <span className="fk-dot" />
              </div>
              <div className="fk-rooms-row">
                <div className="fk-room fk-room--sm"><span className="fk-dot fk-dot--lone" /></div>
                <div className="fk-room fk-room--sm"><span className="fk-dot fk-dot--lone" /></div>
                <div className="fk-room fk-room--sm"><span className="fk-dot fk-dot--lone" /></div>
              </div>
            </div>
          </div>
          <div className="fk-pool-hero fk-pop" style={delay(3400)}>
            这就是<span className="fk-accent">「池」</span>
          </div>
          <div className="fk-pool-reuse mono fk-rise" style={delay(4200)}>
            反复用 —— 用完不销毁，下一个任务接着使
          </div>
        </div>
        <div className="fk-pool-turn fk-rise" style={delay(5200)}>
          写并发的人，多半<span className="fk-accent">咽过三口气</span>
        </div>
      </div>
    );
  }

  /* step 3 — 第一口气：换后端 = 业务代码跟着重写 */
  if (step === 3) {
    return (
      <GroanFrame
        ord="01"
        foot={
          <div className="fk-rewrite">
            <div className="fk-chip fk-pop" style={delay(2600)}>线程池 · 写死的</div>
            <div className="fk-rewrite-mid fk-rise" style={delay(3600)}>
              <span className="fk-rewrite-arrow">→</span>
              <span className="fk-rewrite-tag mono">想换？</span>
            </div>
            <div className="fk-chip fk-pop" style={delay(4400)}>进程池</div>
            <div className="fk-rewrite-stamp fk-pop" style={delay(5400)}>业务代码跟着重写</div>
          </div>
        }
      >
        「派活儿的代码，是照着<span className="fk-accent">线程池</span>写死的。想换进程池比一比？业务代码跟着重写。」
      </GroanFrame>
    );
  }

  /* step 4 — 第二口气：快任务被慢任务摁住（时间条示意） */
  if (step === 4) {
    return (
      <GroanFrame
        ord="02"
        foot={
          <div className="fk-gantt">
            <div className="fk-gantt-bars">
              {Array.from({ length: 9 }).map((_, i) => (
                <div className="fk-gantt-fast fk-grow" key={i} style={delay(2200 + i * 70)} />
              ))}
              <div className="fk-gantt-slow-col">
                <div className="fk-gantt-slow fk-grow" style={delay(3200)} />
                <div className="fk-gantt-slow-tag mono fk-rise" style={delay(5000)}>
                  慢任务
                </div>
              </div>
            </div>
            <div className="fk-gantt-cap fk-rise" style={delay(5200)}>
              全被摁着 —— 一起才出来
            </div>
          </div>
        }
      >
        「九个任务早跑完了，就差一个慢的——结果全被摁着，<span className="fk-accent">一起才出来</span>。」
      </GroanFrame>
    );
  }

  /* step 5 — 第三口气：报错没了踪影（错误气泡凭空消失） */
  if (step === 5) {
    return (
      <GroanFrame
        ord="03"
        foot={
          <div className="fk-vanish-row">
            <div className="fk-vanish-worker fk-pop" style={delay(2600)}>
              <span className="fk-dot fk-dot--lone" />
              <span className="mono fk-vanish-tag">worker</span>
            </div>
            <div className="fk-vanish-bubble mono fk-vanish" style={delay(3200)}>
              报错！
            </div>
            <div className="fk-quote-note fk-rise" style={delay(6000)}>
              <span className="label-mono">名词</span>
              worker ＝ 池子里干活的工人
            </div>
          </div>
        }
      >
        「worker 里明明炸了，报错却<span className="fk-accent">没了踪影</span>。」
      </GroanFrame>
    );
  }

  /* step 6 — 病根：调度焊死在业务代码里 */
  if (step === 6) {
    return (
      <div className="scene-pad fk-scene fk-weld-scene">
        <div className="fk-weld-head fk-rise">
          <span className="label-mono">三个痛点 · 同一个病根</span>
        </div>
        <div className="fk-weld-card fk-pop" style={delay(800)}>
          <div className="fk-weld-card-label mono">业务代码</div>
          <div className="fk-weld-block fk-rise" style={delay(2200)}>
            <div className="fk-weld-block-name">派活儿 · 收结果的整套安排</div>
            <div className="fk-weld-block-tag mono">行话叫「调度」</div>
          </div>
          <div className="fk-weld-seam fk-grow" style={delay(3600)} />
          <div className="fk-weld-stamp fk-pop" style={delay(4600)}>焊死</div>
        </div>
      </div>
    );
  }

  /* step 7 — 解法：两个角色分工 */
  if (step === 7) {
    return (
      <div className="scene-pad fk-scene fk-roles-scene">
        <div className="fk-roles-head fk-rise">
          <span className="label-mono">解法 · 让两个角色分工</span>
        </div>
        <div className="fk-roles">
          <div className="fk-role-card card fk-pop" style={delay(2200)}>
            <div className="fk-role-en mono">Executor</div>
            <div className="fk-role-cn">执行器</div>
            <hr className="rule fk-role-rule" />
            <div className="fk-role-duty">管「怎么跑」</div>
          </div>
          <div className="fk-role-card card fk-pop" style={delay(6000)}>
            <div className="fk-role-en mono">Future</div>
            <div className="fk-role-cn">欠条</div>
            <hr className="rule fk-role-rule" />
            <div className="fk-role-duty">管「结果在哪」</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 8 — 两个动词：submit / result（欠条居中，一来一回） */
  if (step === 8) {
    return (
      <div className="scene-pad fk-scene fk-verbs-scene">
        <div className="fk-verbs-head fk-rise">
          <span className="label-mono">业务代码 · 只认识两个动词</span>
        </div>
        <div className="fk-verbs-flow">
          <div className="fk-verbs-code card fk-pop" style={delay(400)}>
            <div className="fk-verbs-code-label mono">业务代码</div>
            <div className="fk-verb fk-rise" style={delay(2000)}>
              <span className="fk-verb-name mono">submit</span>
              <span className="fk-verb-talk">提交</span>
            </div>
            <div className="fk-verb fk-rise" style={delay(4400)}>
              <span className="fk-verb-name mono">result</span>
              <span className="fk-verb-talk">取结果</span>
            </div>
          </div>
          <div className="fk-verbs-io">
            <div className="fk-verbs-line">
              <span className="fk-verbs-arrow fk-grow" style={delay(2600)}>→</span>
              <span className="fk-verbs-cap mono fk-rise" style={delay(2900)}>立刻返回 · 不等执行完</span>
            </div>
            <div className="fk-verbs-line">
              <span className="fk-verbs-arrow fk-grow" style={delay(5600)}>←</span>
              <span className="fk-verbs-cap mono fk-rise" style={delay(5900)}>唯一取货口 · 可带超时</span>
            </div>
          </div>
          <div className="fk-verbs-future card fk-pop" style={delay(3000)}>
            <div className="fk-verbs-future-en mono">Future</div>
            <div className="fk-verbs-future-cn">欠条</div>
          </div>
        </div>
        <div className="fk-verbs-backend mono fk-rise" style={delay(8200)}>
          背后用线程还是进程 —— 也就是后端 —— 它一概不问
        </div>
      </div>
    );
  }

  /* step 9 — 预告：三个痛点逐个演示（fallthrough 兜底步） */
  return (
    <div className="scene-pad fk-scene fk-next-scene">
      <div className="fk-next-groans">
        {["口 01 · 写死", "口 02 · 等最慢", "口 03 · 吞报错"].map((g, i) => (
          <span className="fk-next-chip mono fk-pop" style={delay(i * 260)} key={g}>
            {g}
          </span>
        ))}
      </div>
      <div className="fk-next-hero fk-rise" style={delay(1200)}>
        三个痛点，<span className="fk-accent">逐个演示</span>
      </div>
      <div className="fk-next-sub fk-rise" style={delay(3000)}>
        先补一分钟前情：这个病根，是怎么落下的 ↓
      </div>
    </div>
  );
}
