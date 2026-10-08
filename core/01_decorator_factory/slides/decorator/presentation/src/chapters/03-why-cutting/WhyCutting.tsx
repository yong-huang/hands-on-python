import type { ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./WhyCutting.css";

/**
 * ch03 · why-cutting — 为什么需要它：横切逻辑（7 steps）
 *
 * step 0  反例：计时代码混进业务函数
 * step 1  命名：横切逻辑
 * step 2~6  五类点名：计时 / 日志 / 重试 / 缓存 / 鉴权（1 项 = 1 step）
 */

function TimerIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="36" r="20" stroke="var(--accent)" strokeWidth="3" />
      <path d="M32 36V25" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 8v8M25 8h14" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 22l4-4" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="16" y="8" width="32" height="48" stroke="var(--accent)" strokeWidth="3" />
      <path d="M24 22h16M24 30h16M24 38h10" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 48h16" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M50 32a18 18 0 1 1-5.3-12.7"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M46 8l-1.5 12L33 17z" fill="var(--accent)" />
      <circle cx="32" cy="32" r="4" stroke="var(--accent)" strokeWidth="3" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function CacheIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <ellipse cx="32" cy="15" rx="20" ry="7" stroke="var(--accent)" strokeWidth="3" />
      <path d="M12 15v34c0 3.9 9 7 20 7s20-3.1 20-7V15" stroke="var(--accent)" strokeWidth="3" />
      <path d="M12 32c0 3.9 9 7 20 7s20-3.1 20-7" stroke="var(--accent)" strokeWidth="3" strokeDasharray="4 3" />
    </svg>
  );
}

function AuthIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="15" y="28" width="34" height="27" stroke="var(--accent)" strokeWidth="3" />
      <path d="M22 28v-7a10 10 0 0 1 20 0v7" stroke="var(--accent)" strokeWidth="3" />
      <circle cx="32" cy="40" r="4" stroke="var(--accent)" strokeWidth="3" />
      <path d="M32 44v6" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface CuttingItem {
  key: string;
  name: string;
  desc: string;
  icon: ReactNode;
}

const ITEMS: CuttingItem[] = [
  { key: "timer", name: "计时", desc: "函数跑了多久，一眼看到", icon: <TimerIcon /> },
  { key: "log", name: "日志", desc: "谁调用过、传了什么，留个痕", icon: <LogIcon /> },
  { key: "retry", name: "重试", desc: "网络抖一下，自己再试一次", icon: <RetryIcon /> },
  { key: "cache", name: "缓存", desc: "算过的结果，不算第二遍", icon: <CacheIcon /> },
  { key: "auth", name: "鉴权", desc: "没登录？后面免谈", icon: <AuthIcon /> },
];

export default function WhyCuttingChapter({ step }: ChapterStepProps) {
  /* step 0 — 反例：写进函数里 */
  if (step === 0) {
    return (
      <div className="scene-pad wc-scene wc-horizontal">
        <div className="wc-codecard wc-rise">
          <div className="wc-codecard-bar">save_order.py</div>
          <div className="wc-code">
            <div className="wc-line">def save_order():</div>
            <div className="wc-line wc-line-indent">db.execute(sql)</div>
            <div className="wc-line wc-line-indent wc-line-marked">
              t0 = time.perf_counter()
            </div>
            <div className="wc-line wc-line-indent">result = db.commit()</div>
            <div className="wc-line wc-line-indent wc-line-marked">
              print(f"耗时 ...")
            </div>
          </div>
        </div>
        <div className="wc-verdict">
          <div className="wc-question wc-rise" style={{ animationDelay: "500ms" }}>
            直接写进去，不就完了？
          </div>
          <div className="wc-verdict-text wc-rise" style={{ animationDelay: "1600ms" }}>
            这几行，跟<em>本职工作</em>
            <br />
            没有半点关系
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 命名：横切逻辑 */
  if (step === 1) {
    return (
      <div className="scene-pad wc-scene">
        <div className="wc-duo">
          <div className="wc-duo-chip wc-rise">本职 · 干活</div>
          <div className="wc-duo-chip wc-rise" style={{ animationDelay: "350ms" }}>
            额外 · 监视
          </div>
        </div>
        <div className="wc-name-hero wc-rise" style={{ animationDelay: "950ms" }}>
          横切逻辑
        </div>
        <div className="wc-duo wc-duo-bottom">
          <div className="wc-duo-attr wc-rise" style={{ animationDelay: "1600ms" }}>
            跟业务无关
          </div>
          <div className="wc-duo-x">+</div>
          <div className="wc-duo-attr wc-rise" style={{ animationDelay: "1850ms" }}>
            到处都需要
          </div>
        </div>
      </div>
    );
  }

  /* step 2~6 — 五类点名 */
  const idx = step - 2;
  const item = ITEMS[idx];
  return (
    <div className="scene-pad wc-scene">
      <div className="wc-item">
        <div className="wc-icon wc-icon-in">{item.icon}</div>
        <div className="wc-item-name wc-rise" style={{ animationDelay: "350ms" }}>
          {item.name}
        </div>
        <div className="wc-item-desc wc-rise" style={{ animationDelay: "700ms" }}>
          {item.desc}
        </div>
      </div>
      <div className="wc-rail">
        {ITEMS.map((it, i) => (
          <span
            key={it.key}
            className={
              i === idx ? "wc-rail-item wc-rail-lit" : i < idx ? "wc-rail-item wc-rail-past" : "wc-rail-item"
            }
          >
            {it.name}
          </span>
        ))}
      </div>
    </div>
  );
}
