import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

/**
 * ch06 · closing — 为什么要搞懂它（3 steps）
 *
 * step 0  你早就在用：open / threading.Lock / 数据库 session，头顶逐个亮起 with
 * step 1  三个疑难杂症逐个盖「看穿」章
 * step 2  CTA：仓库 + 零依赖 + 下期见
 */

const USERS = [
  { name: "open 文件", usage: 'with open("data.txt") as f:', delay: "1500ms" },
  { name: "threading 的锁", usage: "with threading.Lock():", delay: "5000ms" },
  { name: "数据库 session", usage: "with session.begin():", delay: "8200ms" },
];

const PAINS = [
  { name: "句柄泄漏", delay: "1800ms" },
  { name: "锁挂死", delay: "2900ms" },
  { name: "事务悬挂", delay: "4000ms" },
];

export default function ClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — 你早就在用 */
  if (step === 0) {
    return (
      <div className="scene-pad cl-scene cl-users-scene">
        <div className="cl-users-head cl-rise">
          为什么值得搞懂它？<b>你早就在用了</b>
        </div>

        <div className="cl-users">
          {USERS.map((u) => (
            <div key={u.name} className="cl-user cl-rise">
              <span className="cl-user-with">with</span>
              <div className="cl-user-body">
                <div className="cl-user-name">{u.name}</div>
                <code className="cl-user-code">{u.usage}</code>
              </div>
              <span
                className="cl-user-lit"
                style={{ animationDelay: u.delay }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 1 — 看穿 */
  if (step === 1) {
    return (
      <div className="scene-pad cl-scene cl-see-scene">
        <div className="cl-see-head cl-rise">
          把 with 背后的<b>三步</b>想明白
        </div>

        <div className="cl-pains">
          {PAINS.map((p) => (
            <div key={p.name} className="cl-pain cl-rise">
              <span className="cl-pain-name">{p.name}</span>
              <span className="cl-pain-stamp cl-stamp-in" style={{ animationDelay: p.delay }}>
                看穿
              </span>
            </div>
          ))}
        </div>

        <div className="cl-see-foot cl-rise" style={{ animationDelay: "4200ms" }}>
          之前的三种疑难杂症，<b>一眼看穿</b>
        </div>
      </div>
    );
  }

  /* step 2 — CTA（与 decorator 系列 CTA 同款终端样式） */
  return (
    <div className="scene-pad cl-scene">
      <div className="cl-cta">
        <div className="cl-term cl-rise">
          <div className="cl-term-bar">hands-on-python</div>
          <div className="cl-term-body">
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> cd core/02_context_manager
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span> python3 context_manager.py
            </div>
            <div className="cl-cmd cl-cmd-out">
              [1] Timer:
            </div>
            <div className="cl-cmd cl-cmd-out">
              &nbsp;&nbsp;[sort_10k] 0.0001s
            </div>
            <div className="cl-cmd">
              <span className="cl-prompt">$</span>
              <span className="cl-cursor" />
            </div>
          </div>
        </div>
        <div className="cl-cta-foot">
          <span className="cl-cta-chip cl-rise" style={{ animationDelay: "1800ms" }}>
            零依赖 · python3 一跑就有体感
          </span>
          <span className="cl-cta-chip cl-cta-chip-accent cl-rise" style={{ animationDelay: "3000ms" }}>
            链接在评论区 · 下期见
          </span>
        </div>
      </div>
    </div>
  );
}
