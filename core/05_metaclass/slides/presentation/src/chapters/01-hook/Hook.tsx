import type { ChapterStepProps } from "../../registry/types";
import "./Hook.css";

/**
 * ch01 · hook — 片头标题页 + 谁在创建类（4 steps）
 *
 * step 0  片头标题页
 * step 1  对比卡：普通函数调用才执行 vs class 定义即创建
 * step 2  悬念：创建类的动作，是谁在干活？
 * step 3  type 点名：换成你自己的 = 元类
 */

export default function HookChapter({ step }: ChapterStepProps) {
  /* step 0 — 片头标题页 */
  if (step === 0) {
    return (
      <div className="scene-pad hk-scene hk-title-scene">
        <div className="hk-title-center">
          <div className="kicker hk-rise">Python · Metaclass</div>
          <hr className="rule hk-title-rule" />
          <h1 className="hk-title-main hk-rise" style={{ animationDelay: "250ms" }}>
            <span className="hk-title-code">class</span> 背后那只手
          </h1>
          <hr className="rule hk-title-rule" style={{ animationDelay: "350ms" }} />
          <div className="hk-title-sub hk-rise" style={{ animationDelay: "600ms" }}>
            Python 元类 · type · 单例与 ORM
          </div>
        </div>
        <div className="hk-titleblock hk-rise" style={{ animationDelay: "1000ms" }}>
          <div className="hk-tb-row">
            <span>Subj</span>
            <b>metaclass</b>
          </div>
          <div className="hk-tb-row">
            <span>Repo</span>
            <b>hands-on-python</b>
          </div>
          <div className="hk-tb-row">
            <span>Lab</span>
            <b>core / 05</b>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 对比卡 */
  if (step === 1) {
    return (
      <div className="scene-pad hk-scene hk-contrast-scene">
        <div className="hk-contrast-cols">
          <div className="hk-contrast-card hk-rise">
            <div className="hk-contrast-tag">普通函数</div>
            <pre className="hk-contrast-code">{`def f():
    return 1

f()  # 调用时才执行`}</pre>
          </div>

          <div className="hk-contrast-card hk-contrast-card-acc hk-rise" style={{ animationDelay: "900ms" }}>
            <div className="hk-contrast-tag">class 语句</div>
            <pre className="hk-contrast-code">{`class Dog:
    species = "Canine"

# 定义那一刻
# 类对象已经创建好`}</pre>
          </div>
        </div>

        <div className="hk-contrast-foot hk-rise" style={{ animationDelay: "2000ms" }}>
          class 语句<b>反过来</b>——定义即创建
        </div>
      </div>
    );
  }

  /* step 2 — 悬念 */
  if (step === 2) {
    return (
      <div className="scene-pad hk-scene hk-ask-scene">
        <div className="hk-ask-line hk-rise">
          <span className="hk-ask-code">class</span> 语句创建类对象——
        </div>
        <div className="hk-ask-big hk-rise" style={{ animationDelay: "500ms" }}>
          这个动作，<span className="hk-ask-em">谁在干活？</span>
        </div>
      </div>
    );
  }

  /* step 3 — type 点名 */
  return (
    <div className="scene-pad hk-scene hk-answer-scene">
      <div className="hk-answer-kicker hk-rise">答案是</div>
      <div className="hk-answer-type hk-pop" style={{ animationDelay: "400ms" }}>
        type
      </div>
      <div className="hk-answer-copy hk-rise" style={{ animationDelay: "1400ms" }}>
        想让一批类自动获得能力，
        <br />
        就把 type <b>换成你自己的</b>
      </div>
    </div>
  );
}
