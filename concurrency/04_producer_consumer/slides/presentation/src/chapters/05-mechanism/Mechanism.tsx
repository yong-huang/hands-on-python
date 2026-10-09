import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** step3 专用：回执从左侧循环图飞入右侧清点格（--fx/--fy 供 mc-fly 取起点）。 */
const fly = (ms: number) =>
  ({
    animationDelay: `${ms}ms`,
    "--fx": "-480px",
    "--fy": "-36px",
  }) as CSSProperties;

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — 打包对照两栏：自己写四件逐条列出 vs Queue 全内置 */
  if (step === 0) {
    const diy = [
      { ord: "01", name: "共享容器", talk: "任务摆在哪、怎么传" },
      { ord: "02", name: "加锁", talk: "一次只许一个人碰" },
      { ord: "03", name: "等待通知", talk: "没货等着 · 来货叫醒" },
      { ord: "04", name: "状态标志", talk: "什么时候收尾" },
    ];
    return (
      <div className="scene-pad mc-scene mc-pack-scene">
        <div className="mc-pack-head mc-rise">
          <span className="label-mono">拆开看 · WHAT QUEUE PACKS</span>
          <div className="mc-pack-question">
            <span className="mono">queue.Queue</span>{" "}
            到底替你<b className="mc-accent">打包</b>了什么？
          </div>
        </div>
        <div className="mc-pack-cols">
          <div className="mc-pack-diy">
            <div className="mc-pack-colhead mono mc-rise" style={delay(500)}>
              自己写 · 四件一样都不能少
            </div>
            {diy.map((d, i) => (
              <div className="mc-pack-item mc-rise" style={delay(1000 + i * 850)} key={d.ord}>
                <span className="mc-pack-ord mono">{d.ord}</span>
                <span className="mc-pack-name">{d.name}</span>
                <span className="mc-pack-talk">{d.talk}</span>
              </div>
            ))}
          </div>
          <div className="mc-pack-built mc-pop" style={delay(4900)}>
            <div className="mc-pack-built-name mono">queue.Queue</div>
            <div className="mc-pack-built-hero">全部内置</div>
            <div className="mc-pack-built-note">
              容器 · 锁 · 通知 · 收尾协议
              <br />
              开箱即用
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 全内置：线程安全 + 先进先出（格子自动点亮）+ 隐藏身份章 */
  if (step === 1) {
    return (
      <div className="scene-pad mc-scene mc-builtin-scene">
        <div className="mc-kicker-line mc-rise">
          <span className="label-mono">全内置 · 你只管放和取</span>
        </div>
        <div className="mc-builtin-hero mono mc-rise" style={delay(250)}>
          queue.Queue
        </div>
        <div className="mc-builtin-plates">
          <div className="mc-plate mc-rise" style={delay(2400)}>
            <div className="mc-plate-name">线程安全</div>
            <div className="mc-plate-talk">
              多个线程一起用也不会乱——排队、等位，它内部自己加锁、自己办
            </div>
          </div>
          <div className="mc-plate mc-rise" style={delay(5600)}>
            <div className="mc-plate-name">先进先出</div>
            <div className="mc-fifo" aria-hidden>
              <span className="mc-fifo-cap mono">先来</span>
              {[1, 2, 3].map((n) => (
                <span className="mc-fifo-cell mono mc-pop" style={delay(6600 + (n - 1) * 480)} key={n}>
                  {n}
                </span>
              ))}
              <span className="mc-fifo-cap mono">先办</span>
            </div>
            <div className="mc-plate-talk">顺序严格，先来的先办</div>
          </div>
        </div>
        <div className="mc-builtin-hidden mc-pop" style={delay(9200)}>
          <span className="label-mono">隐藏身份</span>
          <span className="mc-hidden-name">背压阀门</span>
        </div>
      </div>
    );
  }

  /* step 2 — 背压阀门：槽位逐格注满 → 阀杆落下 → put 被按住 → 峰值=10 证据 */
  if (step === 2) {
    return (
      <div className="scene-pad mc-scene mc-valve-scene">
        <div className="mc-kicker-line mc-rise">
          <span className="label-mono">隐藏身份 · 背压阀门 MAXSIZE = 10</span>
        </div>
        <div className="mc-valve-flow">
          <div className="mc-valve-actor mc-rise" style={delay(300)}>
            <span className="mc-valve-actor-name mono">生产者</span>
            <span className="mc-valve-call mono">put()</span>
            <span className="mc-valve-held mc-pop" style={delay(4900)}>
              被按住
            </span>
          </div>
          <div className="mc-valve-gate mc-rise" style={delay(600)}>
            <div className="mc-valve-gate-top">
              <span className="mc-valve-arrow mono">→</span>
              <span className="mc-valve-bar" style={delay(4300)} aria-hidden />
            </div>
            <span className="mc-valve-shut mono mc-pop" style={delay(4900)}>
              满 · 放的那一下自动停住
            </span>
          </div>
          <div className="mc-valve-queue mc-rise" style={delay(800)}>
            <div className="mc-valve-slots">
              {Array.from({ length: 10 }, (_, i) => (
                <span className="mc-slot" key={i}>
                  <span className="mc-slot-fill" style={delay(1000 + i * 260)} />
                </span>
              ))}
            </div>
            <div className="mc-valve-count mono mc-rise" style={delay(3900)}>
              10 / 10 · 队列已满
            </div>
          </div>
          <div className="mc-valve-gate mc-valve-gate--open mc-rise" style={delay(900)}>
            <div className="mc-valve-gate-top">
              <span className="mc-valve-arrow mono">→</span>
            </div>
            <span className="mc-valve-shut mc-valve-shut--open mono mc-rise" style={delay(6300)}>
              取一件 · 才放进一件
            </span>
          </div>
          <div className="mc-valve-actor mc-rise" style={delay(1000)}>
            <span className="mc-valve-actor-name mono">消费者</span>
            <span className="mc-valve-call mono">get()</span>
          </div>
        </div>
        <div className="mc-valve-tagline mc-rise" style={delay(7600)}>
          生产多快，<b className="mc-accent">得听消费的</b>
        </div>
        <div className="mc-valve-foot">
          <span className="mc-valve-note mc-rise" style={delay(9200)}>
            内存不会再涨个没完
          </span>
          <span className="mc-valve-evidence mc-rise" style={delay(10600)}>
            <span className="label-mono">场景二实测</span>
            <b className="hero-num mc-valve-peak">10</b>
            <span className="mc-valve-evtext">队列长度峰值 = maxsize —— 阀门工作的直接证据</span>
          </span>
        </div>
      </div>
    );
  }

  /* step 3 — 回执协议（核心演示）：循环图 → 回执一张张飞入清点格 → 放行 */
  if (step === 3) {
    return (
      <div className="scene-pad mc-scene mc-receipt-scene">
        <div className="mc-kicker-line mc-rise">
          <span className="label-mono">回执协议 · TASK_DONE / JOIN</span>
        </div>
        <div className="mc-receipt-body">
          <div className="mc-receipt-loop">
            <div className="mc-panel-head mono mc-rise" style={delay(250)}>
              消费者 · 每件一轮
            </div>
            <div className="mc-loop-nodes">
              <div className="mc-loop-node mc-rise" style={delay(500)}>
                <span className="mc-node-code mono">get()</span>
                <span className="mc-node-talk">取一件</span>
              </div>
              <span className="mc-loop-down mc-rise" style={delay(950)}>↓</span>
              <div className="mc-loop-node mc-rise" style={delay(1300)}>
                <span className="mc-node-code">处理</span>
                <span className="mc-node-talk">干这件活</span>
              </div>
              <span className="mc-loop-down mc-rise" style={delay(1750)}>↓</span>
              <div className="mc-loop-node mc-loop-node--hot mc-rise" style={delay(2100)}>
                <span className="mc-node-code mono">task_done()</span>
                <span className="mc-node-talk">交一张回执</span>
              </div>
            </div>
            <div className="mc-loop-back mc-rise" style={delay(2900)}>
              <span className="mono">↺</span>
              <span>每处理完一件必须交——一张都不能少</span>
            </div>
          </div>
          <div className="mc-receipt-counter mc-rise" style={delay(3400)}>
            <div className="mc-panel-head mono">主线程 · join() 清点</div>
            <div className="mc-counter-need mono">当初放入 5 件</div>
            <div className="mc-counter-slots">
              {[1, 2, 3, 4, 5].map((n, i) => (
                <span className="mc-cslot" key={n}>
                  <span className="mc-cslot-ord mono">{n}</span>
                  <span className="mc-cslot-chip" style={fly(4600 + i * 850)}>
                    <span className="mono">{n}</span>
                  </span>
                </span>
              ))}
            </div>
            <div className="mc-counter-law mc-rise" style={delay(9400)}>
              回执张数 <b className="mc-accent">=</b> 放入件数 · 才放行
            </div>
          </div>
        </div>
        <div className="mc-receipt-verdict">
          <span className="mc-verdict-stamp mono mc-pop" style={delay(11300)}>
            join() 返回 · 放行
          </span>
          <span className="mc-verdict-line mc-rise" style={delay(12200)}>
            活干没干完，<b className="mc-accent">数它说了算</b>
          </span>
        </div>
      </div>
    );
  }

  /* step 4 — 两个易断点（冻结计数徽章）+ finally 兜底 */
  if (step === 4) {
    return (
      <div className="scene-pad mc-scene mc-break-scene">
        <div className="mc-kicker-line mc-rise">
          <span className="label-mono">易断点 · 回执协议最怕漏</span>
        </div>
        <div className="mc-break-card mc-rise" style={delay(600)}>
          <span className="mc-break-ord mono">断点 01</span>
          <span className="mc-break-cause">漏交一次回执</span>
          <span className="mc-break-arrow">→</span>
          <span className="mc-break-effect">
            清点<b className="mc-accent">永不返回</b>
          </span>
          <span className="mc-break-stuck mono mc-pop" style={delay(1500)}>
            999 / 1000 · 永远差一张
          </span>
        </div>
        <div className="mc-break-card mc-break-card--dim mc-rise" style={delay(4200)}>
          <span className="mc-break-ord mono">断点 02</span>
          <span className="mc-break-cause">毒丸忘了交回执</span>
          <span className="mc-break-arrow">→</span>
          <span className="mc-break-effect">
            同样<b className="mc-accent">卡死</b>
          </span>
          <span className="mc-break-stuck mono mc-pop" style={delay(5100)}>
            POISON 取到了 · 回执没交
          </span>
        </div>
        <div className="mc-finally mc-rise" style={delay(7400)}>
          <div className="mc-finally-head mono">本实验的写法</div>
          <div className="mc-finally-code mono">
            <div>
              <span className="mc-code-kw">try:</span>
              {" 取一件 · 处理一件"}
            </div>
            <div>
              <span className="mc-code-kw">finally:</span>
              {" q.task_done()"}
              <span className="mc-code-note">{"  # 不管出不出事都执行"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 5 — 毒丸细节一：投丸数量 = 消费者数（2 人 2 丸） */
  if (step === 5) {
    return (
      <div className="scene-pad mc-scene mc-dose-scene">
        <div className="mc-kicker-line mc-rise">
          <span className="label-mono">毒丸协议 · 细节一 / 三</span>
        </div>
        <div className="mc-dose-law mc-rise" style={delay(350)}>
          投丸数量 <b className="mc-accent">=</b> 消费者数
        </div>
        <div className="mc-dose-eq">
          <div className="mc-dose-side mc-pop" style={delay(1200)}>
            <span className="hero-num mc-dose-num">2</span>
            <span className="mc-dose-who mono">消费者 · 2 人</span>
          </div>
          <span className="mc-dose-sign mc-pop" style={delay(1600)}>=</span>
          <div className="mc-dose-side mc-dose-side--pills mc-pop" style={delay(2000)}>
            <div className="mc-dose-pills">
              <span className="mc-pill mono mc-pop" style={delay(2500)}>毒丸</span>
              <span className="mc-pill mono mc-pop" style={delay(2900)}>毒丸</span>
            </div>
            <span className="mc-dose-who mono">投 2 丸</span>
          </div>
        </div>
        <div className="mc-dose-cases">
          <div className="mc-dose-case mc-rise" style={delay(3800)}>
            <span className="mono">少一枚</span>
            <span>有人永远在等</span>
          </div>
          <div className="mc-dose-case mc-rise" style={delay(4500)}>
            <span className="mono">多一枚</span>
            <span>浪费 · 遗留在队列里</span>
          </div>
        </div>
      </div>
    );
  }

  /* step 6 — 毒丸细节二三：毒丸也交回执 + is 认身份（下划线扫入 + 白话对盘） */
  if (step === 6) {
    return (
      <div className="scene-pad mc-scene mc-ident-scene">
        <div className="mc-ident-second mc-rise" style={delay(500)}>
          <span className="label-mono">细节二</span>
          <span>
            毒丸也要交回执 <span className="mono mc-accent">task_done()</span> · 配合清点
          </span>
        </div>
        <div className="mc-ident-main">
          <div className="mc-codecard mc-rise" style={delay(2600)}>
            <div className="mc-panel-head mono">细节三 · 判定写法</div>
            <div className="mc-code mono">
              <div>item = q.get()</div>
              <div className="mc-code-hotline">
                {"if item "}
                <span className="mc-code-hot">
                  {"is POISON"}
                  <span className="mc-ident-underline" style={delay(4500)} aria-hidden />
                </span>
                {":"}
              </div>
              <div className="mc-code-indent">
                {"q.task_done()"}
                <span className="mc-code-note">{"  # 毒丸也交回执"}</span>
              </div>
              <div className="mc-code-indent">return</div>
            </div>
          </div>
          <div className="mc-ident-vernacular">
            <div className="mc-vern mc-vern--is mc-rise" style={delay(5300)}>
              <span className="mc-vern-op mono">is</span>
              <span className="mc-vern-ask">
                「是不是<b className="mc-accent">同一枚</b>？」
              </span>
              <span className="mc-vern-talk">认身份</span>
            </div>
            <div className="mc-vern mc-vern--eq mc-rise" style={delay(6800)}>
              <span className="mc-vern-op mono">==</span>
              <span className="mc-vern-ask">「长得像不像？」</span>
              <span className="mc-vern-talk">认相等 · 不用它判定毒丸</span>
            </div>
          </div>
        </div>
        <div className="mc-ident-foot mc-rise" style={delay(8600)}>
          毒丸是个空记号——<b className="mc-accent">认身份最保险</b>
        </div>
      </div>
    );
  }

  /* step 7 — 队列安全 ≠ 全程安全：读-改-写三段点亮 + 锁徽章 + 收束 */
  return (
    <div className="scene-pad mc-scene mc-safe-scene">
      <div className="mc-safe-slogan mc-rise">
        队列安全 <b className="mc-accent">≠</b> 全程安全
      </div>
      <div className="mc-safe-codecard mc-rise" style={delay(2000)}>
        <div className="mc-panel-head mono">记账那行 · 计数 dict + Lock</div>
        <div className="mc-code mono">
          <div>
            <span className="mc-code-kw">with</span>
            {" counter_lock:"}
          </div>
          <div className="mc-code-indent">results[item] = results.get(item, 0) + 1</div>
        </div>
      </div>
      <div className="mc-safe-phases">
        <div className="mc-phase mc-rise" style={delay(3800)}>
          <span className="mc-phase-ord mono">01</span>
          <span className="mc-phase-name">读出来</span>
          <span className="mc-phase-frag mono">.get(item, 0)</span>
        </div>
        <div className="mc-phase mc-rise" style={delay(5000)}>
          <span className="mc-phase-ord mono">02</span>
          <span className="mc-phase-name">加一</span>
          <span className="mc-phase-frag mono">+ 1</span>
        </div>
        <div className="mc-phase mc-rise" style={delay(6200)}>
          <span className="mc-phase-ord mono">03</span>
          <span className="mc-phase-name">写回去</span>
          <span className="mc-phase-frag mono">results[item] =</span>
        </div>
      </div>
      <div className="mc-safe-notes">
        <span className="mc-safe-note mc-rise" style={delay(7400)}>
          发生在<b>拿到任务之后</b>——队列管不着
        </span>
        <span className="mc-safe-lock mc-pop" style={delay(8400)}>
          照样用锁护住
        </span>
      </div>
      <div className="mc-safe-close mc-rise" style={delay(9700)}>
        消息传递把共享面<b className="mc-accent">缩小了，但没有消灭</b>
      </div>
    </div>
  );
}
