import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./QaClosing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function QaClosingChapter({ step }: ChapterStepProps) {
  /* step 0 — Future 是什么 */
  if (step === 0) {
    const attrs = [
      { verb: "submit", talk: "立刻给凭据" },
      { verb: "result", talk: "随时来取" },
      { verb: "timeout", talk: "能超时、能收异常" },
    ];
    return (
      <div className="scene-pad qz-scene qz-def-scene">
        <div className="qz-def-head qz-rise" style={delay(300)}>
          <span className="label-mono">最后一问 · Future 到底是什么</span>
        </div>
        <div className="qz-def-card card qz-pop" style={delay(1500)}>
          <div className="mono qz-def-tag">Future</div>
          <div className="qz-def-main">一张结果欠条</div>
        </div>
        <div className="qz-def-attrs">
          {attrs.map((a, i) => (
            <div className="qz-def-attr qz-rise" style={delay(3400 + i * 1300)} key={a.verb}>
              <span className="mono qz-def-verb">{a.verb}</span>
              <span className="qz-def-talk">{a.talk}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 1 — 金句：把等待抽出来 */
  if (step === 1) {
    return (
      <div className="scene-pad qz-scene qz-pull-scene">
        <div className="qz-pull-flow">
          <div className="qz-pull-code card qz-pop" style={delay(400)}>
            <div className="mono qz-pull-tag">业务代码</div>
            <div className="qz-pull-slot">等待（被抽走了）</div>
          </div>
          <span className="qz-pull-arrow qz-grow" style={delay(1600)}>→</span>
          <div className="qz-pull-thing card qz-pop" style={delay(2600)}>
            <div className="qz-pull-thing-main">「等待」</div>
            <div className="qz-pull-thing-talk">变成一件可以拿着走的物件</div>
          </div>
        </div>
        <div className="qz-pull-hero qz-rise" style={delay(4000)}>
          可传递、可组合，<span className="qz-accent">不再拴死在流程里</span>
        </div>
      </div>
    );
  }

  /* step 2 — 什么时候不用：Thread */
  if (step === 2) {
    return (
      <div className="scene-pad qz-scene qz-not-scene">
        <div className="label-mono qz-rise" style={delay(300)}>那什么时候不用它</div>
        <div className="qz-not-card card qz-pop" style={delay(1400)}>
          <div className="qz-not-name">一两个后台小任务</div>
          <div className="qz-not-talk">
            直接 <span className="mono">Thread</span> 更省事
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 什么时候不用：asyncio */
  if (step === 3) {
    return (
      <div className="scene-pad qz-scene qz-async-scene">
        <div className="qz-async-head qz-rise" style={delay(300)}>
          <span className="label-mono">上万条连接同时处理 · 用 asyncio</span>
        </div>
        <div className="qz-async-ring">
          <div className="qz-async-waiter mono qz-pop" style={delay(1200)}>
            接待员
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              className={`qz-async-guest qz-async-guest--${i} qz-pop`}
              style={delay(2200 + i * 200)}
              key={i}
            />
          ))}
        </div>
        <div className="qz-async-hero qz-rise" style={delay(5600)}>
          一个接待员转着圈招呼一屋子客人 —— 这套叫<span className="qz-accent">事件循环</span>
        </div>
      </div>
    );
  }

  /* step 4 — 收尾（fallthrough 兜底步） */
  return (
    <div className="scene-pad qz-scene qz-end-scene">
      <div className="qz-end-note qz-rise" style={delay(200)}>
        完整代码的地址，放在<span className="qz-accent">评论区</span>
      </div>
      <div className="qz-end-hero qz-pop" style={delay(1300)}>
        下期见
      </div>
    </div>
  );
}
