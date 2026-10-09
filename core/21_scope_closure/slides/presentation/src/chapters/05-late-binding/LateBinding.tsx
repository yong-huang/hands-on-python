import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./LateBinding.css";

const letterIndex = (i: number) => ({ "--i": i }) as CSSProperties;

export default function LateBindingChapter({ step }: ChapterStepProps) {
  /* step 0 — 预告卡：一个经典陷阱（~4s · 字距收拢 + 巨型 ? 水印） */
  if (step === 0) {
    return (
      <div className="scene-pad lb-scene lb-teaser-scene">
        <span className="lb-teaser-mark serif-it">?</span>
        <div className="lb-teaser-center">
          <div className="label-mono lb-rise" style={{ animationDelay: "150ms" }}>
            Chapter 05 · The Classic Trap
          </div>
          <h1 className="lb-teaser-title">一个经典陷阱</h1>
          <hr className="rule lb-teaser-rule" />
          <div className="lb-teaser-sub lb-rise" style={{ animationDelay: "1400ms" }}>
            循环里造闭包，会出什么事？
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 陷阱代码卡：[lambda: i for i in range(3)]，预期 0、1、2（~8s） */
  if (step === 1) {
    return (
      <div className="scene-pad lb-scene lb-trap-scene">
        <div className="lb-code-card card lb-rise">
          <div className="lb-code-head">
            <span className="lb-code-dot" />
            <span className="label-mono">late_binding.py · 陷阱</span>
          </div>
          <pre className="lb-code"><code>
            <span className="lb-ln">
              <span>{"fns = ["}</span>
              <span className="lb-ln-key">{"lambda: i"}</span>
              <span>{" for i in range(3)]"}</span>
            </span>
            <span className="lb-ln">{"[f() for f in fns]"}</span>
          </code></pre>
          <div className="lb-code-foot lb-rise" style={{ animationDelay: "3600ms" }}>
            <span className="label-mono">note</span>
            <span className="lb-code-foot-text">
              这个 <span className="mono">{"lambda: i"}</span> 只有一句体，相当于{" "}
              <span className="mono">{"return i"}</span>
            </span>
          </div>
        </div>
        <div className="lb-trap-side">
          <div className="label-mono lb-rise" style={{ animationDelay: "900ms" }}>
            你预期 · expected
          </div>
          <div className="lb-expect">
            <div className="lb-expect-row lb-rise" style={{ animationDelay: "1500ms" }}>
              <span className="mono lb-expect-call">{"fns[0]()"}</span>
              <span className="lb-expect-arrow">→</span>
              <span className="hero-num lb-expect-num lb-pop" style={{ animationDelay: "2000ms" }}>0</span>
            </div>
            <div className="lb-expect-row lb-rise" style={{ animationDelay: "2050ms" }}>
              <span className="mono lb-expect-call">{"fns[1]()"}</span>
              <span className="lb-expect-arrow">→</span>
              <span className="hero-num lb-expect-num lb-pop" style={{ animationDelay: "2550ms" }}>1</span>
            </div>
            <div className="lb-expect-row lb-rise" style={{ animationDelay: "2600ms" }}>
              <span className="mono lb-expect-call">{"fns[2]()"}</span>
              <span className="lb-expect-arrow">→</span>
              <span className="hero-num lb-expect-num lb-pop" style={{ animationDelay: "3100ms" }}>2</span>
            </div>
          </div>
          <div className="lb-expect-note lb-rise" style={{ animationDelay: "3900ms" }}>
            依次调用，一个比一个大
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 结果揭晓：2、2、2 三连砸落 + 异常闪（~3s · 全章最低谷） */
  if (step === 2) {
    return (
      <div className="scene-pad lb-scene lb-reveal-scene">
        <div className="lb-reveal-head lb-rise">
          <span className="mono lb-reveal-call">{"[f() for f in fns]"}</span>
          <span className="label-mono">实际输出 · actual</span>
        </div>
        <div className="lb-reveal-row">
          <div className="lb-two-wrap"><span className="hero-num lb-two">2</span></div>
          <div className="lb-two-wrap"><span className="hero-num lb-two">2</span></div>
          <div className="lb-two-wrap"><span className="hero-num lb-two">2</span></div>
        </div>
        <div className="lb-reveal-foot lb-rise" style={{ animationDelay: "1250ms" }}>
          <span className="lb-was">
            预期 0 · 1 · 2
            <span className="lb-strike" />
          </span>
          <span className="lb-reveal-sep">——</span>
          <span className="lb-reveal-tag">预期落空，三个一模一样</span>
        </div>
      </div>
    );
  }

  /* step 3 — 机制拆解：三个 lambda 连线到同一个 i，调用时才读，i 停在 2（~12s · 连线自绘 + 循环游标） */
  if (step === 3) {
    return (
      <div className="scene-pad lb-scene lb-mech-scene">
        <div className="lb-mech-head">
          <div className="label-mono lb-rise">机制 · why</div>
          <div className="lb-mech-quote lb-rise" style={{ animationDelay: "200ms" }}>
            闭包记住的是<b>变量本身</b>，不是它当时的值
          </div>
        </div>
        <div className="lb-mech-diagram">
          <svg className="lb-mech-wires" viewBox="0 0 1460 430" aria-hidden="true">
            <line className="lb-wire lb-wire-1" x1="320" y1="74" x2="1128" y2="215" pathLength={1} />
            <line className="lb-wire lb-wire-2" x1="320" y1="215" x2="1128" y2="215" pathLength={1} />
            <line className="lb-wire lb-wire-3" x1="320" y1="356" x2="1128" y2="215" pathLength={1} />
            <circle className="lb-converge" cx="1128" cy="215" r="7" />
          </svg>
          <div className="lb-fn-box lb-fn-a card lb-rise" style={{ animationDelay: "500ms" }}>
            <span className="label-mono">fns[0]</span>
            <span className="lb-fn-body mono">{"lambda: i"}</span>
          </div>
          <div className="lb-fn-box lb-fn-b card lb-rise" style={{ animationDelay: "650ms" }}>
            <span className="label-mono">fns[1]</span>
            <span className="lb-fn-body mono">{"lambda: i"}</span>
          </div>
          <div className="lb-fn-box lb-fn-c card lb-rise" style={{ animationDelay: "800ms" }}>
            <span className="label-mono">fns[2]</span>
            <span className="lb-fn-body mono">{"lambda: i"}</span>
          </div>
          <div className="lb-i-box lb-rise" style={{ animationDelay: "1000ms" }}>
            <span className="label-mono">循环变量 · 三人共享同一个</span>
            <div className="lb-i-value">
              <span className="mono lb-i-unknown">{"i = ?"}</span>
              <span className="hero-num lb-i-two">2</span>
            </div>
          </div>
        </div>
        <div className="lb-mech-call lb-rise" style={{ animationDelay: "4300ms" }}>
          <span className="label-mono lb-mech-call-tag">调用 · call</span>
          <span className="lb-mech-call-text">函数体到<b>调用时</b>才去读 i</span>
        </div>
        <div className="lb-mech-loop">
          <div className="lb-loop-track">
            <span className="lb-loop-line" />
            <span className="lb-loop-tick lb-loop-t0" />
            <span className="lb-loop-tick lb-loop-t1" />
            <span className="lb-loop-tick lb-loop-t2" />
            <span className="lb-loop-cursor" />
          </div>
          <div className="lb-loop-labels mono">
            <span className="lb-rise" style={{ animationDelay: "5700ms" }}>{"i = 0"}</span>
            <span className="lb-rise" style={{ animationDelay: "5900ms" }}>{"i = 1"}</span>
            <span className="lb-rise" style={{ animationDelay: "6100ms" }}>{"i = 2"}</span>
          </div>
        </div>
        <div className="lb-loop-endlabel lb-rise" style={{ animationDelay: "8800ms" }}>
          循环结束 —— i 停在 <b>2</b>
        </div>
      </div>
    );
  }

  /* step 4 — 命名卡：迟绑定（~3s · 逐字升起） */
  if (step === 4) {
    return (
      <div className="scene-pad lb-scene lb-name-scene">
        <div className="label-mono lb-rise">这个名字，值得记住</div>
        <h1 className="lb-name-main">
          <span className="letter-stagger">
            <span className="letter" style={letterIndex(0)}>迟</span>
            <span className="letter" style={letterIndex(1)}>绑</span>
            <span className="letter" style={letterIndex(2)}>定</span>
          </span>
        </h1>
        <div className="lb-name-en lb-rise" style={{ animationDelay: "350ms" }}>
          Late Binding
        </div>
        <div className="lb-name-cue lb-rise" style={{ animationDelay: "700ms" }}>
          函数体在调用时，才去读那个变量
        </div>
      </div>
    );
  }

  /* step 5 — 修复卡：lambda i=i 快照对照图（与 step 3 镜像）+ functools.partial（~10s） */
  if (step === 5) {
    return (
      <div className="scene-pad lb-scene lb-fix-scene">
        <div className="label-mono lb-rise">修法 · the fix —— 只改这一处</div>
        <div className="lb-fix-code mono lb-rise" style={{ animationDelay: "250ms" }}>
          <span>{"fns = ["}</span>
          <span className="lb-ln-key">{"lambda i=i: i"}</span>
          <span>{" for i in range(3)]"}</span>
        </div>
        <div className="lb-fix-body">
          <div className="lb-fix-fns">
            <div className="lb-fix-box card lb-rise" style={{ animationDelay: "1000ms" }}>
              <span className="label-mono">fns[0]</span>
              <span className="lb-fix-sig mono">{"lambda i=i: i"}</span>
              <span className="lb-snap mono lb-snap-0">
                <span className="lb-snap-tag">快照</span>
                {"i = 0"}
              </span>
            </div>
            <div className="lb-fix-box card lb-rise" style={{ animationDelay: "1160ms" }}>
              <span className="label-mono">fns[1]</span>
              <span className="lb-fix-sig mono">{"lambda i=i: i"}</span>
              <span className="lb-snap mono lb-snap-1">
                <span className="lb-snap-tag">快照</span>
                {"i = 1"}
              </span>
            </div>
            <div className="lb-fix-box card lb-rise" style={{ animationDelay: "1320ms" }}>
              <span className="label-mono">fns[2]</span>
              <span className="lb-fix-sig mono">{"lambda i=i: i"}</span>
              <span className="lb-snap mono lb-snap-2">
                <span className="lb-snap-tag">快照</span>
                {"i = 2"}
              </span>
            </div>
          </div>
          <div className="lb-fix-why">
            <div className="label-mono lb-rise" style={{ animationDelay: "4700ms" }}>为什么有效</div>
            <div className="lb-fix-line lb-rise" style={{ animationDelay: "5000ms" }}>
              默认参数在<b>定义时</b>求值
            </div>
            <div className="lb-fix-line lb-rise" style={{ animationDelay: "5700ms" }}>
              等于当场<b>拍快照</b>，一人一份
            </div>
            <div className="lb-fix-alt lb-rise" style={{ animationDelay: "6700ms" }}>
              <span className="mono lb-fix-alt-code">{"functools.partial(f, i)"}</span>
              <span className="lb-fix-alt-note">把实参钉死 —— 同样有效</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 复跑结果：0、1、2 数字翻转归位（~3s · rotateX 翻面） */
  if (step === 6) {
    return (
      <div className="scene-pad lb-scene lb-rerun-scene">
        <div className="lb-reveal-head lb-rise">
          <span className="mono lb-reveal-call">{"[f() for f in fns]"}</span>
          <span className="label-mono">复跑 · rerun</span>
        </div>
        <div className="lb-rerun-row">
          <span className="hero-num lb-fixed">0</span>
          <span className="hero-num lb-fixed">1</span>
          <span className="hero-num lb-fixed">2</span>
        </div>
        <div className="lb-rerun-foot lb-rise" style={{ animationDelay: "1300ms" }}>
          快照生效 —— <b>0、1、2，齐了</b>
        </div>
      </div>
    );
  }

  /* step 7 — 迁移提示：回调列表 / 定时器 → 先想到它（~6s · 左右滑入合拢） */
  return (
    <div className="scene-pad lb-scene lb-mig-scene">
      <div className="label-mono lb-rise">迁移 · 同类场景</div>
      <div className="lb-mig-row">
        <div className="lb-mig-card card lb-in-left" style={{ animationDelay: "400ms" }}>
          <span className="label-mono">场景 · 回调列表</span>
          <span className="lb-mig-text">
            循环里注册的回调，<b>全部读到循环末值</b>
          </span>
        </div>
        <div className="lb-mig-link">
          <span className="lb-mig-arrow lb-rise" style={{ animationDelay: "1200ms" }}>→</span>
          <span className="lb-mig-same lb-pop" style={{ animationDelay: "1800ms" }}>同一个值</span>
          <span className="lb-mig-arrow lb-rise" style={{ animationDelay: "1200ms" }}>←</span>
        </div>
        <div className="lb-mig-card card lb-in-right" style={{ animationDelay: "800ms" }}>
          <span className="label-mono">场景 · 定时器</span>
          <span className="lb-mig-text">
            批量注册的定时器，<b>集体读到同一个值</b>
          </span>
        </div>
      </div>
      <div className="lb-mig-lesson">
        <hr className="rule lb-mig-rule" />
        <div className="lb-mig-big lb-rise" style={{ animationDelay: "2900ms" }}>
          先想到它 —— <span className="lb-mig-accent">迟绑定</span>
        </div>
      </div>
    </div>
  );
}
