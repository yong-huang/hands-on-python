import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/* 三行核心代码（steps 0~3 共用，逐行点亮） */
const CODE_LINES = [
  "async with sem:                    # 限流：同时在飞 ≤ 10",
  "    resp = await session.get(url, timeout=5s)",
  "    await asyncio.sleep(0.02 * 2**attempt)  # 退避 20/40/80/160ms",
];

function CodeCard({ hot }: { hot: number }) {
  return (
    <div className="mc-code">
      <div className="mc-code-head mono">fetcher.py — 核心三行</div>
      <pre className="mc-code-body mono">
        {CODE_LINES.map((line, i) => (
          <span
            key={i}
            className={`mc-code-line${i === hot ? " mc-code-line--hot" : ""}`}
          >
            {line}
          </span>
        ))}
      </pre>
    </div>
  );
}

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — 引入 */
  if (step === 0) {
    return (
      <div className="scene-pad mc-scene mc-intro-scene">
        <div className="mc-intro-line mc-rise" style={delay(200)}>
          核心写法，浓缩成<b className="mc-accent hero-num">三行</b>
        </div>
        <div className="mc-intro-ghosts">
          {[0, 1, 2].map((i) => (
            <span key={i} className="mc-ghost mc-rise" style={delay(900 + i * 350)} />
          ))}
        </div>
      </div>
    );
  }

  /* step 1~3 — 代码逐行点亮 */
  if (step === 1) {
    return (
      <div className="scene-pad mc-scene mc-code-scene">
        <CodeCard hot={0} />
        <div className="mc-code-anno mc-rise" style={delay(1200)}>
          <span className="mc-anno-tag mono">第一行 · 进闸门</span>
          先领一张许可，再发请求 —— 限流：同时在飞<b className="mc-accent">不超过 10 个</b>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="scene-pad mc-scene mc-code-scene">
        <CodeCard hot={1} />
        <div className="mc-code-anno mc-rise" style={delay(1200)}>
          <span className="mc-anno-tag mono">第二行 · 发请求</span>
          带 5 秒总超时
        </div>
        <div className="mc-branch">
          <span className="mc-branch-opt mc-pop" style={delay(2400)}>
            5 秒内回话 → <b className="mc-accent">收货</b>
          </span>
          <span className="mc-branch-opt mc-branch-opt--bad mc-pop" style={delay(3300)}>
            超时 → <b className="mc-accent">按失败处理</b>
          </span>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="scene-pad mc-scene mc-code-scene">
        <CodeCard hot={2} />
        <div className="mc-code-anno mc-rise" style={delay(1200)}>
          <span className="mc-anno-tag mono">第三行 · 失败重试</span>
          递增等待 20 / 40 / 80 / 160ms，再试
        </div>
        <div className="mc-loop-close mc-rise" style={delay(3400)}>
          限流 · 超时 · 重试 —— 三件套的完整循环，就这三行
        </div>
      </div>
    );
  }

  /* step 4 — 测试服务：首败必恢复 */
  if (step === 4) {
    return (
      <div className="scene-pad mc-scene mc-server-scene">
        <div className="mc-server-title mc-rise">
          测试服务：把「抖动」变成<b className="mc-accent">确定性</b>
        </div>
        <div className="mc-state-strip">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="mc-state mc-pop" style={delay(800 + i * 80)}>
              <span className="mc-state-id mono">ep{i + 1}</span>
              <span className="mc-state-flow">
                <span className="mc-state-first">500</span>
                <span className="mc-state-arrow mono">→</span>
                <span className="mc-state-ok">恢复</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mc-server-legend mc-rise" style={delay(2600)}>
          <span className="label-mono">记一个状态</span>
          第一次请求 → 故意回 500（网页打不开那种「服务器错误」）· 之后 → 正常
        </div>
      </div>
    );
  }

  /* step 5 — 为什么不用随机失败 */
  if (step === 5) {
    return (
      <div className="scene-pad mc-scene mc-random-scene">
        <div className="mc-random-title mc-rise">为什么不用随机失败？</div>
        <div className="mc-random-fact mc-pop" style={delay(700)}>
          随机失败：重试 5 次仍全败的概率 ——
          <b className="mc-accent hero-num"> 一成多</b>
        </div>
        <div className="mc-random-defs">
          <div className="mc-def mc-pop" style={delay(2200)}>
            <span className="mc-def-tag mono">断言</span>
            替你检查「结果对不对」的那句话
          </div>
          <div className="mc-def mc-pop" style={delay(3300)}>
            <span className="mc-def-tag mono">flake</span>
            失败一随机，检查就时灵时不灵
          </div>
        </div>
        <div className="mc-random-quote mc-rise" style={delay(4600)}>
          做测试工具，<b className="mc-accent">宁可不真实，也要确定</b>
        </div>
      </div>
    );
  }

  /* step 6 — 公平性：全新服务实例 */
  if (step === 6) {
    return (
      <div className="scene-pad mc-scene mc-fair-scene">
        <div className="mc-fair-title mc-rise">公平性：每个模型，一个全新服务</div>
        <div className="mc-fair-row">
          {["串行", "线程池", "异步"].map((m, i) => (
            <div key={m} className="mc-fair-pair mc-pop" style={delay(700 + i * 500)}>
              <span className="mc-fair-model mono">{m}</span>
              <span className="mc-fair-arrow mono">→</span>
              <span className="mc-fair-server">新服务 {i + 1}</span>
            </div>
          ))}
        </div>
        <div className="mc-fair-counter mc-rise" style={delay(2600)}>
          <span className="label-mono">反例 · 共用 1 个实例</span>
          串行先跑 → 15 次首败被它消费掉 → 后面两个模型恢复率全失真
        </div>
        <div className="mc-fair-principle mc-rise" style={delay(4400)}>
          对比实验：每组样本必须从<b className="mc-accent">相同初始状态</b>出发
        </div>
      </div>
    );
  }

  /* step 7 — 踩雷：阻塞冻结整个循环（fallthrough 收尾） */
  return (
    <div className="scene-pad mc-scene mc-mine-scene">
      <div className="mc-mine-title mc-rise">真实踩雷：基准塞进了事件循环</div>
      <div className="mc-mine-loop">
        <div className="mc-mine-rail mc-grow" style={delay(900)} />
        <div className="mc-mine-co mc-pop" style={delay(500)}>
          <span className="mono mc-mine-co-tag">同一根线程</span>
          串行客户端（阻塞）
        </div>
        <div className="mc-mine-co mc-mine-co--server mc-pop" style={delay(1900)}>
          <span className="mono mc-mine-co-tag">同循环</span>
          本地服务端（停摆）
        </div>
      </div>
      <div className="mc-mine-fate mc-rise" style={delay(3100)}>
        互相等死，直到超时 —— <b className="mc-accent">一处阻塞，全部停摆</b>
      </div>
      <div className="mc-mine-fix mc-rise" style={delay(4600)}>
        <span className="label-mono">修复</span>
        阻塞代码 → 丢进工作线程，让循环保持响应
      </div>
    </div>
  );
}
