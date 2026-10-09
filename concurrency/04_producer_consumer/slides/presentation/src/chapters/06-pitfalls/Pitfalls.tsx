import type { CSSProperties, ReactNode } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 每步公共节标题：章节名 + 坑序（坑 N / 五 · 名字）。 */
function PitHead({ ord, name }: { ord: string; name: string }) {
  return (
    <>
      <div className="pf-head pf-rise">
        <span className="label-mono">PITFALLS · 五个真实踩过的坑</span>
        <span className="pf-head-right mono">
          <b>{ord}</b> / 五 · {name}
        </span>
      </div>
      <hr className="rule pf-head-rule pf-rise" style={delay(120)} />
    </>
  );
}

/** 解法角标行（accent）：代码名 + 白话同屏。 */
function FixRow({ children, delayMs }: { children: ReactNode; delayMs: number }) {
  return (
    <div className="pf-fix pf-rise" style={delay(delayMs)}>
      <span className="label-mono">解法</span>
      <div className="pf-fix-body">{children}</div>
    </div>
  );
}

/** step 3 的队列格子：读的时候可见 5 件，漂移结束后只剩 3 件。 */
const QUEUE_CELLS = ["1", "2", "3", "4", "5", "", "6", "", "7", "8"];

/** step 4 两块面板共用的队列格子。 */
const STRIP_CELLS = ["1", "2", "3", "4", "5", "6"];

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0 — 坑一 · 整除丢任务：算式坍缩（333→666→999）+ 断言盖章揭穿 */
  if (step === 0) {
    return (
      <div className="scene-pad pf-scene pf-p1">
        <PitHead ord="坑一" name="整除丢任务" />
        <div className="pf-p1-eq pf-rise" style={delay(250)}>
          <span className="mono pf-p1-eq-code">1000 // 3</span>
          <span className="pf-p1-eq-arrow" aria-hidden>
            →
          </span>
          <span>各分 333</span>
          <span className="pf-p1-eq-note">取整＝余数直接扔掉</span>
        </div>
        <div className="pf-p1-row">
          {["生产者一", "生产者二", "生产者三"].map((name, i) => (
            <div className="card pf-p1-cell pf-pop" style={delay(850 + i * 260)} key={name}>
              <span className="mono pf-p1-cell-name">{name}</span>
              <span className="mono pf-p1-cell-num">333</span>
              <span className="pf-p1-cell-unit">条</span>
            </div>
          ))}
        </div>
        <div className="pf-p1-total pf-rise" style={delay(2100)}>
          <span className="pf-p1-total-label">合计</span>
          <span className="hero-num pf-p1-count">
            <span className="pf-p1-count-pass" style={delay(2200)}>
              333
            </span>
            <span className="pf-p1-count-pass" style={delay(3000)}>
              666
            </span>
            <span className="pf-p1-count-stay" style={delay(3800)}>
              999
            </span>
          </span>
          <span className="pf-p1-total-unit">条</span>
          <span className="pf-p1-lost pf-pop" style={delay(4700)}>
            <span className="pf-p1-lost-slot" aria-hidden />
            丢 1 条
          </span>
        </div>
        <div className="pf-p1-assert pf-stamp" style={delay(5800)}>
          <span className="mono">AssertionError: total 999 != 1000</span>
          <span className="pf-p1-assert-note">断言＝程序自己核对结果 —— 当场揭穿</span>
        </div>
        <FixRow delayMs={8800}>
          <span className="mono pf-fix-code">divmod(1000, 3) → (333, 1)</span>
          <span className="pf-fix-talk">商和余数一起拿，把余数也分出去</span>
        </FixRow>
      </div>
    );
  }

  /* step 1 — 坑二 · 毒丸数量写死：少一枚 / 多一枚 两张卡先后翻转 */
  if (step === 1) {
    return (
      <div className="scene-pad pf-scene pf-p2">
        <PitHead ord="坑二" name="毒丸数量写死" />
        <div className="pf-p2-base pf-rise" style={delay(250)}>
          <span className="pf-p2-crew-label">消费者</span>
          <span className="mono pf-p2-person pf-pop" style={delay(600)}>
            消费者一
          </span>
          <span className="mono pf-p2-person pf-pop" style={delay(800)}>
            消费者二
          </span>
          <span className="pf-p2-crew-label">共 2 人</span>
          <span className="mono pf-p2-hardseed pf-pop" style={delay(1100)}>
            毒丸数量：手写死
          </span>
        </div>
        <div className="pf-p2-cases">
          <div className="card pf-p2-case pf-p2-case--stuck pf-flip" style={delay(1500)}>
            <div className="mono pf-p2-case-head">少投一枚 · 只发 1 枚</div>
            <div className="pf-p2-qrow pf-p2-qrow--col" aria-hidden>
              <span className="mono pf-p2-waiter">消费者一 · 取到，退场</span>
              <span className="mono pf-p2-waiter pf-p2-waiter--stuck">消费者二 · 永远等在 get()</span>
            </div>
            <div className="pf-p2-case-text">
              少的那一枚，<b>有人一辈子等不到</b>
            </div>
          </div>
          <div className="card pf-p2-case pf-flip" style={delay(4000)}>
            <div className="mono pf-p2-case-head">多投一枚 · 发了 3 枚</div>
            <div className="pf-p2-qrow" aria-hidden>
              <span className="pf-p2-qcell pf-pop" style={delay(4650)}>
                毒丸
              </span>
              <span className="pf-p2-qcell pf-pop" style={delay(4800)}>
                毒丸
              </span>
              <span className="pf-p2-qcell pf-p2-qcell--left pf-pop" style={delay(4950)}>
                毒丸
              </span>
            </div>
            <div className="pf-p2-case-text">
              2 人各取一枚，<b>多的一枚遗留在队列里</b> —— 无害
            </div>
          </div>
        </div>
        <FixRow delayMs={6500}>
          <span className="mono pf-fix-code">len(consumers)</span>
          <span className="pf-fix-talk">数量取消费者列表长度 —— 有几人发几枚，不要手写数字</span>
        </FixRow>
      </div>
    );
  }

  /* step 2 — 坑三 · 吞异常不交回执：回执行被划掉 + 清点卡在 999/1000 */
  if (step === 2) {
    return (
      <div className="scene-pad pf-scene pf-p3">
        <PitHead ord="坑三" name="吞异常，不交回执" />
        <div className="pf-p3-cols">
          <div className="card pf-p3-code pf-rise" style={delay(250)}>
            <div className="mono pf-p3-code-title">消费者循环 · 出错的那一次</div>
            <div className="pf-p3-line pf-rise" style={delay(700)}>
              取到任务，处理时出了错
            </div>
            <div className="pf-p3-line pf-rise" style={delay(1250)}>
              异常被吞掉，循环当没事继续
            </div>
            <div className="pf-p3-line pf-rise" style={delay(1800)}>
              <span className="mono pf-p3-skipcode">
                q.task_done()
                <span className="pf-p3-skip-line" aria-hidden />
              </span>
              <span className="mono pf-p3-skip-tag pf-pop" style={delay(2900)}>
                被跳过
              </span>
            </div>
          </div>
          <div className="pf-p3-meter pf-rise" style={delay(600)}>
            <span className="label-mono">join() 清点回执</span>
            <div className="pf-p3-read">
              <span className="hero-num pf-p3-read-num pf-pop" style={delay(3400)}>
                999
              </span>
              <span className="pf-p3-read-sep">/</span>
              <span className="hero-num pf-p3-read-total">1000</span>
            </div>
            <div className="pf-p3-track" aria-hidden>
              <span className="pf-p3-fill" />
            </div>
            <div className="pf-p3-stuck pf-pop" style={delay(4200)}>
              停在 <b>999</b> —— 清点永远等不到最后 1 张
            </div>
          </div>
        </div>
        <FixRow delayMs={6600}>
          <span className="mono pf-fix-code">q.task_done() → finally</span>
          <span className="pf-fix-talk">回执放 finally＝不管出不出事都执行的那一行 —— 出错也必达</span>
        </FixRow>
      </div>
    );
  }

  /* step 3 — 坑四 · 队列长度做业务判断：读数即刻过期（闪一次揭穿） */
  if (step === 3) {
    return (
      <div className="scene-pad pf-scene pf-p4">
        <PitHead ord="坑四" name="队列长度做业务判断" />
        <div className="pf-p4-cols">
          <div className="pf-p4-left pf-rise" style={delay(250)}>
            <span className="label-mono">队列 · 一直在变</span>
            <div className="card pf-p4-window" aria-hidden>
              <div className="pf-p4-track">
                {QUEUE_CELLS.map((cell, i) => (
                  <span
                    key={i}
                    className={`mono pf-p4-item${cell === "" ? " pf-p4-item--empty" : ""} pf-pop`}
                    style={delay(500 + i * 60)}
                  >
                    {cell}
                  </span>
                ))}
              </div>
            </div>
            <div className="pf-p4-cap pf-rise" style={delay(4600)}>
              读的时候 <b>5</b> 件 → 一眨眼只剩 <b>3</b> 件
            </div>
          </div>
          <div className="pf-p4-right pf-rise" style={delay(500)}>
            <div className="card mono pf-p4-code pf-rise" style={delay(900)}>
              if q.qsize() &gt; 3:
            </div>
            <div className="pf-p4-read">
              <span className="pf-p4-read-label">读到</span>
              <span className="pf-pop" style={delay(1400)}>
                <span className="hero-num pf-p4-read-num pf-p4-num-flash">5</span>
              </span>
              <span className="mono pf-p4-stale pf-stamp" style={delay(4200)}>
                已过期
              </span>
            </div>
            <div className="pf-p4-doc pf-rise" style={delay(5000)}>
              文档明示：<span className="mono">qsize()</span> 返回「即刻过期」的近似长度
            </div>
          </div>
        </div>
        <FixRow delayMs={5900}>
          <span className="pf-fix-strong">{"✓\uFE0E"} 采样观测 —— 可以</span>
          <span className="pf-fix-talk">{"✗\uFE0E"} 条件判断 —— 不行</span>
        </FixRow>
      </div>
    );
  }

  /* step 4 — 坑五 · 拿列表当队列：list 整队前挪 vs deque 记号一步到位 */
  return (
    <div className="scene-pad pf-scene pf-p5">
      <PitHead ord="坑五" name="拿列表当队列" />
      <div className="pf-p5-cols">
        <div className="card pf-p5-panel pf-p5-panel--list pf-rise" style={delay(250)}>
          <div>
            <div className="mono pf-p5-panel-head">list · pop(0)</div>
            <div className="pf-p5-panel-sub">从头上取</div>
          </div>
          <div className="card pf-p5-strip" aria-hidden>
            <div className="pf-p5-track pf-p5-list-track">
              {STRIP_CELLS.map((cell, i) => (
                <span key={i} className="mono pf-p5-cell pf-pop" style={delay(500 + i * 70)}>
                  {cell}
                </span>
              ))}
            </div>
          </div>
          <div className="pf-p5-cost pf-rise" style={delay(2800)}>
            第 1 次取：整队前挪 <span className="mono">5</span> 位
          </div>
          <div className="pf-p5-cost pf-rise" style={delay(4500)}>
            第 2 次取：又挪 <span className="mono">4</span> 位
          </div>
          <div className="pf-p5-verdict pf-rise" style={delay(5300)}>
            越来越慢 —— <span className="mono">O(n)</span>，跟 append 的争用面也更大
          </div>
        </div>
        <div className="card pf-p5-panel pf-p5-panel--deque pf-rise" style={delay(2200)}>
          <div>
            <div className="mono pf-p5-panel-head">deque · popleft()</div>
            <div className="pf-p5-panel-sub">两头都是一步到位</div>
          </div>
          <div className="card pf-p5-strip" aria-hidden>
            <div className="pf-p5-track">
              {STRIP_CELLS.map((cell, i) => (
                <span
                  key={i}
                  className={`mono pf-p5-cell${i === 0 ? " pf-p5-eat--1" : ""}${i === 1 ? " pf-p5-eat--2" : ""}`}
                >
                  {cell}
                </span>
              ))}
            </div>
            <div className="pf-p5-cursor-row">
              <span className="mono pf-p5-cursor">队头</span>
            </div>
          </div>
          <div className="pf-p5-verdict pf-rise" style={delay(5900)}>
            货不动，记号动 —— <span className="mono">O(1)</span>
          </div>
        </div>
      </div>
      <FixRow delayMs={7200}>
        <span className="mono pf-fix-code">collections.deque</span>
        <span className="pf-fix-talk">标准库双端队列 —— 两头存取都是一步到位；或者直接 queue.Queue</span>
      </FixRow>
    </div>
  );
}
