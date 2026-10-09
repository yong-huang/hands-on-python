import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Pitfalls.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

/** 五坑收束清单（step 4 底部全览）。 */
const ALL = [
  { ord: "01", name: "忘删共享内存块", fix: "unlink" },
  { ord: "02", name: "用完的一端不关", fix: "close" },
  { ord: "03", name: "代理当本地对象翻", fix: "先整本拷回" },
  { ord: "04", name: "在共享内存上留引用", fix: "先拷成字节串" },
  { ord: "05", name: "以为 Queue 传原件", fix: "全是副本" },
] as const;

export default function PitfallsChapter({ step }: ChapterStepProps) {
  /* step 0 — 坑 1：close ≠ unlink */
  if (step === 0) {
    return (
      <div className="scene-pad pf-scene pf-one-scene">
        <div className="pf-head pf-rise">
          <span className="label-mono">五个真实的坑</span>
          <span className="pf-ord mono">坑 1 / 5</span>
        </div>
        <h2 className="pf-title pf-rise" style={delay(200)}>
          忘删共享内存块——<b>一直泄漏</b>
        </h2>
        <div className="pf-one-demo">
          <div className="pf-btns">
            <div className="pf-btn-card pf-rise" style={delay(700)}>
              <span className="pf-btn mono">close()</span>
              <span className="pf-btn-note">只是「我不用了」——断开映射</span>
            </div>
            <div className="pf-btn-word mono pf-rise" style={delay(1000)}>≠</div>
            <div className="pf-btn-card pf-rise" style={delay(1300)}>
              <span className="pf-btn pf-btn-live mono">unlink()</span>
              <span className="pf-btn-note">才是删除——系统不会替你收拾</span>
            </div>
          </div>
          <div className="pf-leak pf-rise" style={delay(2000)}>
            <span className="label-mono">忘了 unlink</span>
            <div className="pf-leak-pile">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="pf-leak-block pf-leak-drop" style={delay(2400 + i * 250)} />
              ))}
            </div>
            <span className="pf-leak-note mono">/dev/shm 里越堆越多 · 重启才清得掉</span>
          </div>
        </div>
        <div className="pf-punch pf-rise" style={delay(3800)}>
          断开和删除是<b>两个动作</b>——删除要专门写一行代码
        </div>
      </div>
    );
  }

  /* step 1 — 坑 2：用完的一端不关 */
  if (step === 1) {
    return (
      <div className="scene-pad pf-scene pf-one-scene">
        <div className="pf-head pf-rise">
          <span className="label-mono">五个真实的坑</span>
          <span className="pf-ord mono">坑 2 / 5</span>
        </div>
        <h2 className="pf-title pf-rise" style={delay(200)}>
          用完的一端不关——对端<b>永远等不到</b>「说完了」
        </h2>
        <div className="pf-pipe">
          <div className="pf-pipe-end card pf-rise" style={delay(600)}>
            <div className="mono">进程 A</div>
            <div className="pf-pipe-state">写完了，但没 close</div>
          </div>
          <div className="pf-pipe-gap">
            <div className="pf-pipe-wire" />
            <span className="pf-pipe-wait mono pf-rise" style={delay(1800)}>EOF 永远不来…</span>
          </div>
          <div className="pf-pipe-end card pf-rise" style={delay(900)}>
            <div className="mono">进程 B</div>
            <div className="pf-pipe-state pf-pipe-waiting">还在等数据结束信号</div>
          </div>
        </div>
        <div className="pf-punch pf-rise" style={delay(2600)}>
          EOF ＝ 数据流结束信号——<b>用完要 close</b>
        </div>
      </div>
    );
  }

  /* step 2 — 坑 3：代理当本地对象遍历 */
  if (step === 2) {
    return (
      <div className="scene-pad pf-scene pf-one-scene">
        <div className="pf-head pf-rise">
          <span className="label-mono">五个真实的坑</span>
          <span className="pf-ord mono">坑 3 / 5</span>
        </div>
        <h2 className="pf-title pf-rise" style={delay(200)}>
          代理当本地对象<b>逐项翻</b>——一项一趟，慢成灾难
        </h2>
        <div className="pf-traverse">
          <div className="pf-tr-way pf-rise" style={delay(700)}>
            <div className="pf-tr-name mono">逐项翻（for k in d）</div>
            <div className="pf-tr-rounds">
              {["k1", "k2", "k3", "k4"].map((k, i) => (
                <span key={k} className="pf-tr-chip mono pf-pop" style={delay(1300 + i * 300)}>{k}：一趟</span>
              ))}
            </div>
            <div className="pf-tr-note">每迭代一项，请秘书跑一趟</div>
          </div>
          <div className="pf-tr-way pf-tr-good pf-rise" style={delay(1000)}>
            <div className="pf-tr-name mono">整本抄回（d.copy()）</div>
            <div className="pf-tr-rounds">
              <span className="pf-tr-chip pf-tr-chip-live mono pf-pop" style={delay(2400)}>一趟全抄回</span>
              <span className="pf-tr-chip mono pf-pop" style={delay(2800)}>之后随便翻</span>
            </div>
            <div className="pf-tr-note">一次来回，剩下的都是本地速度</div>
          </div>
        </div>
        <div className="pf-punch pf-rise" style={delay(3400)}>
          要翻，<b>先一次性拷回来</b>，再遍历
        </div>
      </div>
    );
  }

  /* step 3 — 坑 4：视图 vs 拷贝 */
  if (step === 3) {
    return (
      <div className="scene-pad pf-scene pf-one-scene">
        <div className="pf-head pf-rise">
          <span className="label-mono">五个真实的坑</span>
          <span className="pf-ord mono">坑 4 / 5</span>
        </div>
        <h2 className="pf-title pf-rise" style={delay(200)}>
          留引用——删块之后是<b>悬空内存</b>
        </h2>
        <div className="pf-view">
          <div className="pf-view-way pf-rise" style={delay(700)}>
            <div className="pf-view-name mono">留视图（shm.buf）</div>
            <div className="pf-view-demo">
              <span className="pf-view-ref mono pf-pop" style={delay(1300)}>记下的位置</span>
              <span className="pf-view-wire pf-wire-cut" style={delay(2100)} />
              <span className="pf-view-block pf-block-gone pf-pop" style={delay(1800)}>内存块</span>
            </div>
            <div className="pf-view-note pf-view-bad pf-rise" style={delay(2900)}>照着位置去读 → <b className="mono">全是错数据</b></div>
          </div>
          <div className="pf-view-way pf-rise" style={delay(1000)}>
            <div className="pf-view-name mono">先拷成字节串（bytes）</div>
            <div className="pf-view-demo">
              <span className="pf-view-ref pf-view-safe mono pf-pop" style={delay(1500)}>自己的完整副本</span>
            </div>
            <div className="pf-view-note pf-rise" style={delay(2600)}>块删了也不影响——<b>要留存，先拷出来</b></div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 坑 5 + 五坑收束 */
  return (
    <div className="scene-pad pf-scene pf-one-scene">
      <div className="pf-head pf-rise">
        <span className="label-mono">五个真实的坑</span>
        <span className="pf-ord mono">坑 5 / 5</span>
      </div>
      <h2 className="pf-title pf-title-sm pf-rise" style={delay(200)}>
        Queue 传过去的是<b>副本</b>——改「传过去的」，原件纹丝不动
      </h2>
      <div className="pf-copy-demo pf-rise" style={delay(700)}>
        <span className="pf-copy-box mono">进程 A 的原件</span>
        <span className="pf-copy-arrow pf-arrow-run" />
        <span className="pf-copy-box pf-copy-live mono">进程 B 改副本</span>
        <span className="pf-copy-verdict mono pf-pop" style={delay(2000)}>原件：纹丝不动</span>
      </div>
      <div className="pf-all pf-rise" style={delay(2600)}>
        <div className="label-mono pf-all-title">五坑收束 · 要真正共享，用 SharedMemory 或 Manager</div>
        <div className="pf-all-row">
          {ALL.map((a, i) => (
            <div key={a.ord} className="pf-all-item pf-pop" style={delay(3000 + i * 200)}>
              <span className="pf-all-ord mono">{a.ord}</span>
              <span className="pf-all-name">{a.name}</span>
              <span className="pf-all-fix mono">{a.fix}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
