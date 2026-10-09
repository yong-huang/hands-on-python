import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Channels.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function ChannelsChapter({ step }: ChapterStepProps) {
  /* step 0 — 第一路线：打包 → 字节流 → 管道 → 拆包 */
  if (step === 0) {
    return (
      <div className="scene-pad cn-scene cn-route-scene">
        <div className="cn-head cn-rise">
          <span className="label-mono">四条通道 · 三条路线</span>
          <span className="cn-route-ord">路线 1 / 3</span>
        </div>
        <div className="cn-route-chs cn-rise" style={delay(200)}>
          <span className="cn-chip mono">Pipe</span>
          <span className="cn-chip mono">Queue</span>
        </div>
        <div className="cn-pipeline">
          <div className="cn-pl-node cn-rise" style={delay(600)}>
            <div className="cn-pl-box mono">原件</div>
            <div className="cn-pl-cap label-mono">进程 A 手里</div>
          </div>
          <span className="cn-pl-step cn-pop" style={delay(1200)}>打包</span>
          <div className="cn-pl-run">
            <div className="cn-pl-track" />
            <span className="cn-pl-bits mono cn-bits-run">011010…</span>
          </div>
          <span className="cn-pl-step cn-pop" style={delay(2200)}>拆包</span>
          <div className="cn-pl-node cn-rise" style={delay(900)}>
            <div className="cn-pl-box mono">副本</div>
            <div className="cn-pl-cap label-mono">进程 B 收到</div>
          </div>
        </div>
        <div className="cn-route-foot cn-rise" style={delay(2900)}>
          <span className="cn-foot-slogan">每个字节都要<b>拷贝</b></span>
          <span className="cn-foot-note label-mono">打包 ＝ 序列化（pickle）</span>
        </div>
      </div>
    );
  }

  /* step 1 — 第二路线：同一块物理内存 */
  if (step === 1) {
    return (
      <div className="scene-pad cn-scene cn-route-scene">
        <div className="cn-head cn-rise">
          <span className="label-mono">四条通道 · 三条路线</span>
          <span className="cn-route-ord">路线 2 / 3</span>
        </div>
        <div className="cn-route-chs cn-rise" style={delay(200)}>
          <span className="cn-chip cn-chip-live mono">SharedMemory</span>
        </div>
        <div className="cn-shm">
          <div className="cn-shm-procs">
            {["进程 A", "进程 B", "进程 C"].map((p, i) => (
              <span key={p} className="cn-shm-proc mono cn-rise" style={delay(700 + i * 250)}>{p}</span>
            ))}
          </div>
          <div className="cn-shm-links">
            {[0, 1, 2].map((i) => (
              <span key={i} className="cn-shm-link cn-link-draw" style={delay(1300 + i * 250)} />
            ))}
          </div>
          <div className="cn-shm-block cn-rise" style={delay(2000)}>
            <div className="label-mono">同一块物理内存</div>
            <div className="cn-shm-cells">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className="cn-shm-cell" />)}
            </div>
          </div>
        </div>
        <div className="cn-route-foot cn-rise" style={delay(2700)}>
          <span className="cn-foot-slogan">零拷贝，<b>直接读</b></span>
          <span className="cn-foot-note label-mono">没有打包 · 没有管道</span>
        </div>
      </div>
    );
  }

  /* step 2 — 第三路线：中间人，一个来回 */
  if (step === 2) {
    return (
      <div className="scene-pad cn-scene cn-route-scene">
        <div className="cn-head cn-rise">
          <span className="label-mono">四条通道 · 三条路线</span>
          <span className="cn-route-ord">路线 3 / 3</span>
        </div>
        <div className="cn-route-chs cn-rise" style={delay(200)}>
          <span className="cn-chip cn-chip-live mono">Manager</span>
        </div>
        <div className="cn-mgr">
          <span className="cn-mgr-proc mono cn-rise" style={delay(700)}>你的进程</span>
          <div className="cn-mgr-path">
            <div className="cn-mgr-wire cn-mgr-go" />
            <div className="cn-mgr-mid cn-pop" style={delay(1500)}>中间人</div>
            <div className="cn-mgr-wire cn-mgr-back" />
          </div>
          <span className="cn-mgr-proc mono cn-rise" style={delay(1000)}>共享对象都放它手里</span>
        </div>
        <div className="cn-route-foot cn-rise" style={delay(2600)}>
          <span className="cn-foot-slogan">每次访问，都是<b>一个来回</b></span>
          <span className="cn-foot-note label-mono">去一趟 · 带结果回来</span>
        </div>
      </div>
    );
  }

  /* step 3~5 — 办公室类比：纸条 / 白板 / 秘书 */
  if (step === 3) {
    return (
      <div className="scene-pad cn-scene cn-office-scene">
        <div className="cn-office-head cn-rise">
          <span className="label-mono">想象互相隔音的办公室 · 1 / 3</span>
        </div>
        <div className="cn-office-rooms">
          <div className="cn-room card cn-rise" style={delay(300)}>
            <div className="cn-room-name mono">办公室 A</div>
            <div className="cn-room-note">Pipe · Queue</div>
          </div>
          <div className="cn-room-gap">
            <span className="cn-paper cn-paper-fly mono">纸条</span>
          </div>
          <div className="cn-room card cn-rise" style={delay(550)}>
            <div className="cn-room-name mono">办公室 B</div>
            <div className="cn-room-note">Pipe · Queue</div>
          </div>
        </div>
        <div className="cn-office-foot cn-rise" style={delay(1400)}>
          <div className="cn-office-slogan">互传<b>纸条</b>——内容要先抄一遍</div>
          <div className="cn-office-note">图越大，抄得越久</div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="scene-pad cn-scene cn-office-scene">
        <div className="cn-office-head cn-rise">
          <span className="label-mono">四间隔音办公室 · 2 / 3</span>
        </div>
        <div className="cn-office-rooms">
          <div className="cn-room card cn-rise" style={delay(300)}>
            <div className="cn-room-name mono">办公室 A</div>
            <div className="cn-room-note">SharedMemory</div>
          </div>
          <div className="cn-room-gap">
            <span className="cn-board-link cn-link-draw" style={delay(800)} />
          </div>
          <div className="cn-board card cn-rise" style={delay(500)}>
            <div className="cn-board-face">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={`cn-board-cell${i % 4 === 1 ? " cn-board-on" : ""}`} />
              ))}
            </div>
            <div className="cn-room-note">SharedMemory</div>
          </div>
        </div>
        <div className="cn-office-foot cn-rise" style={delay(1300)}>
          <div className="cn-office-slogan">共用一块<b>白板</b>——大家看到的，是同一块板面</div>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="scene-pad cn-scene cn-office-scene">
        <div className="cn-office-head cn-rise">
          <span className="label-mono">四间隔音办公室 · 3 / 3</span>
        </div>
        <div className="cn-office-rooms">
          <div className="cn-room card cn-rise" style={delay(300)}>
            <div className="cn-room-name mono">你</div>
            <div className="cn-room-note">Manager</div>
          </div>
          <div className="cn-room-gap">
            <span className="cn-secretary cn-pop" style={delay(900)}>秘书</span>
          </div>
          <div className="cn-room card cn-rise" style={delay(550)}>
            <div className="cn-room-name mono">档案</div>
            <div className="cn-room-note">共享对象</div>
          </div>
        </div>
        <div className="cn-office-foot cn-rise" style={delay(1400)}>
          <div className="cn-office-slogan">雇一位<b>秘书</b>——每句吩咐，都是一趟来回</div>
        </div>
      </div>
    );
  }

  /* step 6 — 类比失效边界 + 性能排序 */
  return (
    <div className="scene-pad cn-scene cn-edge-scene">
      <div className="cn-edge-head cn-rise">
        <span className="label-mono">但类比有失效的地方</span>
      </div>
      <div className="cn-edge-row">
        <div className="cn-edge-card card cn-rise" style={delay(400)}>
          <div className="cn-edge-title">白板不管<b>排队</b></div>
          <div className="cn-edge-demo">
            <span className="cn-edge-hand mono cn-pop" style={delay(1100)}>A 正在擦第 3 格</span>
            <span className="cn-edge-hand cn-edge-clash mono cn-pop" style={delay(1700)}>B 也要擦第 3 格</span>
          </div>
          <div className="cn-edge-note">同步要自己解决</div>
        </div>
        <div className="cn-edge-card card cn-rise" style={delay(700)}>
          <div className="cn-edge-title">纸条<b>按字节计费</b></div>
          <div className="cn-edge-demo">
            <span className="cn-edge-sheet cn-pop" style={delay(1400)}>大图纸 → 抄到手酸</span>
          </div>
          <div className="cn-edge-note">大块数据走纸条，越大约慢</div>
        </div>
      </div>
      <div className="cn-ruler cn-rise" style={delay(2100)}>
        <span className="label-mono">性能排序（快 → 慢）</span>
        <div className="cn-ruler-bars">
          <span className="cn-ruler-bar cn-ruler-1 cn-bar-grow" style={delay(2500)}>零拷贝</span>
          <span className="cn-ruler-bar cn-ruler-2 cn-bar-grow" style={delay(2750)}>管道</span>
          <span className="cn-ruler-bar cn-ruler-3 cn-bar-grow" style={delay(3000)}>RPC</span>
        </div>
        <span className="cn-ruler-note cn-rise" style={delay(3400)}>RPC ＝ 把访问转发给别的进程，再带回结果</span>
      </div>
    </div>
  );
}
