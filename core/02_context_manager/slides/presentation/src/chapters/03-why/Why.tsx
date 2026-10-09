import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Why.css";

/**
 * ch03 · why — 忘了还能出多大的事，with 是标准答案（8 steps）
 *
 * step 0  反问：能出多大的事？
 * step 1  点名一：句柄泄漏（一天累积 + 连接被拒）
 * step 2  点名二：锁挂死（持有者 + 等待队列）
 * step 3  点名三：事务悬挂（BEGIN 后无人收尾）
 * step 4  try/finally 能救
 * step 5  两个下场：重复 ×N / 总有人忘
 * step 6  标准答案：残局逻辑写一遍，交给 with
 * step 7  出场兜底：无论成败都走一遍
 */

const LEAKS = Array.from({ length: 24 }, (_, i) => `fd_${String(i + 1).padStart(2, "0")}`);
const WAITERS = ["B", "C", "D", "E"];

export default function WhyChapter({ step }: ChapterStepProps) {
  /* step 0 — 反问 */
  if (step === 0) {
    return (
      <div className="scene-pad wy-scene wy-ask-scene">
        <div className="kicker wy-rise">有人会说</div>
        <div className="wy-ask-line wy-rise" style={{ animationDelay: "400ms" }}>
          忘关就忘关呗，
        </div>
        <div className="wy-ask-line wy-ask-big wy-rise" style={{ animationDelay: "900ms" }}>
          能出多大的事
          <span className="wy-ask-q">？</span>
        </div>
      </div>
    );
  }

  /* step 1 — 句柄泄漏 */
  if (step === 1) {
    return (
      <div className="scene-pad wy-scene wy-leak-scene">
        <div className="wy-term-head wy-rise">
          <span className="wy-term-dot" />
          server.log — 服务跑一整天
        </div>

        <div className="wy-leak-grid">
          {LEAKS.map((fd, i) => (
            <div key={fd} className="wy-leak-cell" style={{ animationDelay: `${400 + i * 130}ms` }}>
              {fd}
            </div>
          ))}
        </div>

        <div className="wy-refuse wy-pop" style={{ animationDelay: "3900ms" }}>
          ConnectionRefusedError · 新连接全被拒
        </div>

        <div className="wy-leak-foot wy-rise" style={{ animationDelay: "4600ms" }}>
          漏一两个看不出来，<b>架不住天天漏</b>
        </div>
      </div>
    );
  }

  /* step 2 — 锁挂死 */
  if (step === 2) {
    return (
      <div className="scene-pad wy-scene wy-lock-scene">
        <div className="wy-lock-row">
          <div className="wy-lock-holder wy-rise">
            <div className="wy-lock-badge">LOCK</div>
            <div className="wy-lock-name">进程 A</div>
            <div className="wy-lock-state">拿着不还</div>
          </div>

          <div className="wy-lock-queue">
            {WAITERS.map((n, i) => (
              <div key={n} className="wy-lock-waiter wy-rise" style={{ animationDelay: `${700 + i * 180}ms` }}>
                <span className="wy-lock-waiter-name">进程 {n}</span>
                <span className="wy-lock-dots">
                  <i /><i /><i />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="wy-lock-foot wy-rise" style={{ animationDelay: "2100ms" }}>
          其他的全在等 —— <b>这叫锁挂死</b>
        </div>
      </div>
    );
  }

  /* step 3 — 事务悬挂 */
  if (step === 3) {
    return (
      <div className="scene-pad wy-scene wy-tx-scene">
        <div className="wy-tx-flow">
          <div className="wy-tx-card wy-tx-begin wy-rise">BEGIN</div>
          <span className="wy-tx-arrow wy-rise" style={{ animationDelay: "500ms" }}>→</span>
          <div className="wy-tx-card wy-tx-crash wy-rise" style={{ animationDelay: "900ms" }}>
            崩在半路
            <span className="wy-tx-crash-x">✕</span>
          </div>
        </div>

        <div className="wy-tx-ends">
          <div className="wy-tx-card wy-tx-end wy-rise" style={{ animationDelay: "1700ms" }}>
            COMMIT
            <span className="wy-tx-end-note">提交？</span>
          </div>
          <div className="wy-tx-card wy-tx-end wy-rise" style={{ animationDelay: "2000ms" }}>
            ROLLBACK
            <span className="wy-tx-end-note">回滚？</span>
          </div>
        </div>

        <div className="wy-tx-stamp wy-stamp-in" style={{ animationDelay: "2800ms" }}>
          无人收尾
        </div>

        <div className="wy-tx-foot wy-rise" style={{ animationDelay: "3500ms" }}>
          事务就这么<b>悬挂</b>着
        </div>
      </div>
    );
  }

  /* step 4 — try/finally 能救 */
  if (step === 4) {
    return (
      <div className="scene-pad wy-scene wy-finally-scene">
        <div className="wy-codecard wy-rise">
          <div className="wy-codecard-bar">manual_fix.py</div>
          <pre className="wy-code">{`f = open("data.txt")
try:
    do_something(f)
finally:
    f.close()   # 收尾保住了`}</pre>
          <span className="wy-finally-stamp wy-stamp-in" style={{ animationDelay: "1000ms" }}>
            能救
          </span>
        </div>
      </div>
    );
  }

  /* step 5 — 两个下场 */
  if (step === 5) {
    return (
      <div className="scene-pad wy-scene wy-price-scene">
        <div className="wy-price-cols">
          <div className="wy-price-col">
            <div className="wy-price-tag wy-rise">下场一 · 重复</div>
            <div className="wy-dup">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="wy-dup-card"
                  style={{ "--tx": `${i * 22}px`, "--ty": `${i * 56}px`, animationDelay: `${500 + i * 240}ms` } as CSSProperties}
                >
                  <pre className="wy-dup-code">{`try:
    use(res)
finally:
    res.close()`}</pre>
                </div>
              ))}
            </div>
            <div className="wy-price-note wy-rise" style={{ animationDelay: "1500ms" }}>
              每处都得写一遍 · <b>代码翻倍</b>
            </div>
          </div>

          <div className="wy-price-col">
            <div className="wy-price-tag wy-price-tag-2 wy-rise" style={{ animationDelay: "300ms" }}>
              下场二 · 遗忘
            </div>
            <div className="wy-miss">
              <pre className="wy-miss-card wy-rise" style={{ animationDelay: "900ms" }}>{`try:
    use(res)
finally:
    res.close()`}</pre>
              <pre className="wy-miss-card wy-miss-card-ohno wy-rise" style={{ animationDelay: "1300ms" }}>{`try:
    use(res)`}</pre>
              <pre className="wy-miss-card wy-rise" style={{ animationDelay: "1700ms" }}>{`try:
    use(res)
finally:
    res.close()`}</pre>
            </div>
            <div className="wy-price-note wy-rise" style={{ animationDelay: "2200ms" }}>
              中间那块忘了 finally · <b>总有人忘</b>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 标准答案 */
  if (step === 6) {
    return (
      <div className="scene-pad wy-scene wy-answer-scene">
        <div className="wy-answer-kicker wy-rise">
          with，就是这件事的<b>标准答案</b>
        </div>

        <div className="wy-answer-flow">
          <div className="wy-answer-srcs">
            <span className="wy-src wy-rise">文件句柄</span>
            <span className="wy-src wy-rise" style={{ animationDelay: "250ms" }}>锁</span>
            <span className="wy-src wy-rise" style={{ animationDelay: "500ms" }}>事务</span>
          </div>

          <div className="wy-answer-leader" />

          <div className="wy-once-card wy-pop" style={{ animationDelay: "1300ms" }}>
            收拾残局的逻辑
            <span className="wy-once-badge">只写一遍</span>
          </div>

          <span className="wy-answer-arrow wy-fade" style={{ animationDelay: "2000ms" }}>→</span>

          <div className="wy-answer-with wy-pop" style={{ animationDelay: "2400ms" }}>
            with
          </div>
        </div>

        <div className="wy-answer-foot wy-rise" style={{ animationDelay: "3000ms" }}>
          交给 with，<b>业务代码一行不动</b>
        </div>
      </div>
    );
  }

  /* step 7 — 出场兜底 */
  return (
    <div className="scene-pad wy-scene wy-safe-scene">
      <div className="wy-safe-code wy-rise">
        <div className="wy-safe-code-bar">你的业务代码</div>
        <pre className="wy-code">{`process(order)
send_report(refund)`}</pre>
      </div>

      <div className="wy-safe-drop">
        <div className="wy-safe-drop-lane">
          <span className="wy-drop-line wy-drop-grow" style={{ animationDelay: "500ms" }} />
          <span className="wy-drop-label wy-fade" style={{ animationDelay: "800ms" }}>
            成功 · 走一遍
          </span>
        </div>
        <div className="wy-safe-drop-lane wy-safe-drop-lane-r">
          <span className="wy-drop-line wy-drop-line-fail wy-drop-grow" style={{ animationDelay: "800ms" }} />
          <span className="wy-drop-label wy-fade" style={{ animationDelay: "1100ms" }}>
            失败 · 也走一遍
          </span>
        </div>
      </div>

      <div className="wy-safe-band wy-pop" style={{ animationDelay: "1500ms" }}>
        <span className="wy-safe-band-mono">__exit__</span>
        出场兜底 · 无论成败
      </div>
    </div>
  );
}
