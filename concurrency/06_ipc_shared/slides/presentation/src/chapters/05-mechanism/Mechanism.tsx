import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Mechanism.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

export default function MechanismChapter({ step }: ChapterStepProps) {
  /* step 0 — 第一路线拆解：副本 + Queue 三件套 */
  if (step === 0) {
    return (
      <div className="scene-pad mc-scene mc-copy-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">拆开看 · 路线 1</span>
        </div>
        <div className="mc-copy-flow">
          <div className="mc-copy-node mc-rise" style={delay(400)}>
            <div className="mc-box mc-box-solid mono">原件</div>
            <div className="mc-cap label-mono">进程 A</div>
          </div>
          <div className="mc-copy-mid">
            <span className="mc-step mc-pop" style={delay(1100)}>打包</span>
            <div className="mc-copy-wire"><span className="mc-copy-ghost mc-ghost-run mono">副本</span></div>
            <span className="mc-copy-note mc-rise" style={delay(2200)}>到 B 手里已是复印件</span>
          </div>
          <div className="mc-copy-node mc-rise" style={delay(700)}>
            <div className="mc-box mono">副本</div>
            <div className="mc-cap label-mono">进程 B</div>
          </div>
        </div>
        <div className="mc-copy-verdict mc-rise" style={delay(2900)}>
          改<b>副本</b>，<b>原件</b>纹丝不动
        </div>
        <div className="mc-queue mc-rise" style={delay(3600)}>
          <span className="label-mono">Queue 内部三件套</span>
          <span className="mc-qchip mono mc-pop" style={delay(4100)}>管道</span>
          <span className="mc-plus mono">+</span>
          <span className="mc-qchip mono mc-pop" style={delay(4350)}>锁</span>
          <span className="mc-plus mono">+</span>
          <span className="mc-qchip mono mc-pop" style={delay(4600)}>后台搬运线程</span>
        </div>
      </div>
    );
  }

  /* step 1 — 第二路线：父写一次、子读一次，没有第三份拷贝 */
  if (step === 1) {
    return (
      <div className="scene-pad mc-scene mc-mem-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">拆开看 · 路线 2</span>
        </div>
        <div className="mc-mem-flow">
          <div className="mc-mem-actor mc-rise" style={delay(400)}>
            <div className="mc-box mc-box-solid mono">父进程</div>
            <span className="mc-mem-op mono mc-pop" style={delay(1300)}>① 写入</span>
          </div>
          <div className="mc-mem-block mc-rise" style={delay(800)}>
            <div className="label-mono">同一块内存</div>
            <div className="mc-mem-cells">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="mc-mem-cell mc-mem-fill" style={delay(1700 + i * 120)} />
              ))}
            </div>
          </div>
          <div className="mc-mem-actor mc-rise" style={delay(1000)}>
            <div className="mc-box mc-box-solid mono">子进程</div>
            <span className="mc-mem-op mono mc-pop" style={delay(3200)}>② 读出</span>
          </div>
        </div>
        <div className="mc-mem-verdict mc-rise" style={delay(3900)}>
          一共<b>两次内存复制</b>——没有打包、没有管道、<b>没有第三份拷贝</b>
        </div>
      </div>
    );
  }

  /* step 2 — SharedMemory 两条纪律 */
  if (step === 2) {
    return (
      <div className="scene-pad mc-scene mc-disc-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">SharedMemory · 两条纪律</span>
        </div>
        <div className="mc-disc-row">
          <div className="mc-disc card mc-rise" style={delay(500)}>
            <div className="mc-disc-ord mono">纪律 1</div>
            <div className="mc-disc-title">生命周期自己管</div>
            <div className="mc-disc-demo">
              <span className="mc-btn mono mc-pop" style={delay(1400)}>close · 断开</span>
              <span className="mc-btn-word mono">≠</span>
              <span className="mc-btn mc-btn-danger mono mc-pop" style={delay(1900)}>unlink · 删除</span>
            </div>
            <div className="mc-disc-note">断开只是「我不用了」；不删，内存块一直占着</div>
          </div>
          <div className="mc-disc card mc-rise" style={delay(900)}>
            <div className="mc-disc-ord mono">纪律 2</div>
            <div className="mc-disc-title">排队自己安排</div>
            <div className="mc-disc-demo">
              <span className="mc-disc-hands mono mc-pop" style={delay(1800)}>两人同时改同一格</span>
              <span className="mc-btn mc-btn-danger mono mc-pop" style={delay(2400)}>它不管排队</span>
            </div>
            <div className="mc-disc-note">原子性 ＝ 一口气做完、中间插不进手——要自己上锁</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — Manager：读回来 + 写回去，空当被穿插 */
  if (step === 3) {
    return (
      <div className="scene-pad mc-scene mc-rpc-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">拆开看 · 路线 3</span>
        </div>
        <div className="mc-rpc-title mc-rise" style={delay(200)}>
          改一个共享的数 ＝ <b>两个来回</b>
        </div>
        <div className="mc-rpc-lane">
          <span className="mc-rpc-actor mono mc-rise" style={delay(500)}>你的进程</span>
          <div className="mc-rpc-steps">
            <div className="mc-rpc-step mc-rise" style={delay(900)}>
              <span className="mc-rpc-tag mono">来回 ①</span>
              <span className="mc-rpc-talk">读回旧值（count = 5）</span>
            </div>
            <div className="mc-rpc-window mc-rise" style={delay(1800)}>
              <span className="mc-rpc-window-tag mc-pop" style={delay(2300)}>空当</span>
              <span className="mc-rpc-intrude mc-pop" style={delay(2700)}>别人抢先改成 9</span>
            </div>
            <div className="mc-rpc-step mc-rise" style={delay(3100)}>
              <span className="mc-rpc-tag mono">来回 ②</span>
              <span className="mc-rpc-talk">写回新值（count = 6 ✕ 覆盖了 9）</span>
            </div>
          </div>
          <span className="mc-rpc-actor mono mc-rise" style={delay(700)}>Manager</span>
        </div>
        <div className="mc-rpc-verdict mc-rise" style={delay(4100)}>
          窗口大开——<b>更新就这么丢的</b>（一万次丢六千多次）
        </div>
        <div className="mc-probe-meta label-mono mc-rise" style={delay(4600)}>
          远程调用 ＝ 派人跑一趟（术语 RPC，屏幕用）
        </div>
      </div>
    );
  }

  /* step 4 — 基准方法一（反例）：笨验货把总账占满，差距被淹没 */
  if (step === 4) {
    return (
      <div className="scene-pad mc-scene mc-probe-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">测量心得 · 第一条</span>
        </div>
        <div className="mc-probe-lead mc-rise" style={delay(200)}>
          每条通道的<b>总账</b> ＝ 验货 ＋ 运输
        </div>
        <div className="mc-acct">
          <div className="mc-acct-row mc-rise" style={delay(700)}>
            <span className="mc-acct-name mono">通道 A · SharedMemory</span>
            <div className="mc-acct-bar">
              <span className="mc-acct-seg mc-acct-probe mc-bar-grow" style={delay(1300)}>验货 2 s</span>
              <span className="mc-acct-seg mc-acct-run mc-bar-grow" style={delay(1800)} />
            </div>
            <span className="mc-acct-total mono mc-pop" style={delay(2300)}>总 ≈ 2.0 s</span>
          </div>
          <div className="mc-acct-row mc-rise" style={delay(1000)}>
            <span className="mc-acct-name mono">通道 B · pickle+Pipe</span>
            <div className="mc-acct-bar">
              <span className="mc-acct-seg mc-acct-probe mc-bar-grow" style={delay(1900)}>验货 2 s</span>
              <span className="mc-acct-seg mc-acct-seg-b mc-bar-grow" style={delay(2400)} />
            </div>
            <span className="mc-acct-total mono mc-pop" style={delay(2900)}>总 ≈ 2.4 s</span>
          </div>
          <div className="mc-acct-legend mc-rise" style={delay(3200)}>
            <span className="label-mono">深灰＝笨验货（逐字节求和，两边各付 2 s）· 蓝＝运输本身（A 0.02 s / B 0.37 s）</span>
          </div>
        </div>
        <div className="mc-probe-verdict mc-rise" style={delay(3900)}>
          账被验货占满——真实的 <b>18.5×</b>，测出来只剩 <b className="mono">1.2×</b>
        </div>
      </div>
    );
  }

  /* step 5 — 方法一正解：毫秒级指纹 */
  if (step === 5) {
    return (
      <div className="scene-pad mc-scene mc-probe-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">测量心得 · 第一条（正解）</span>
        </div>
        <div className="mc-probe-bars mc-probe-bars-good">
          <div className="mc-probe-row mc-rise" style={delay(500)}>
            <span className="mc-probe-name mono">快验货（zlib.crc32 · C 实现）</span>
            <span className="mc-probe-bar mc-probe-fast mc-bar-grow" style={delay(1100)}>毫秒级</span>
          </div>
          <div className="mc-probe-row mc-rise" style={delay(800)}>
            <span className="mc-probe-name mono">运输一趟（50MB）</span>
            <span className="mc-probe-bar mc-probe-light mc-bar-grow" style={delay(1700)}>0.37 s</span>
          </div>
        </div>
        <div className="mc-probe-slogan mc-rise" style={delay(2500)}>
          测量的尺子，不能比<b>量到的东西</b>还贵
        </div>
      </div>
    );
  }

  /* step 6 — 基准方法二（反例）：spawn 对称成本 */
  if (step === 6) {
    return (
      <div className="scene-pad mc-scene mc-spawn-scene">
        <div className="mc-head mc-rise">
          <span className="label-mono">测量心得 · 第二条</span>
        </div>
        <div className="mc-spawn-lead mc-rise" style={delay(200)}>
          <b>两边都要付的开销</b>，别算进成绩
        </div>
        <div className="mc-spawn-lanes">
          {["SharedMemory", "pickle+Pipe"].map((n, i) => (
            <div key={n} className="mc-spawn-lane mc-rise" style={delay(700 + i * 350)}>
              <span className="mc-spawn-name mono">{n}</span>
              <div className="mc-spawn-track">
                <span className="mc-spawn-fee mc-pop" style={delay(1500 + i * 350)}>spawn 0.3~0.5 s</span>
                <span className="mc-spawn-run" />
              </div>
              <span className="mc-spawn-note">起跑前先付一遍</span>
            </div>
          ))}
        </div>
        <div className="mc-spawn-verdict mc-rise" style={delay(2900)}>
          各付一遍起步费——<b>加速比被稀释</b>
        </div>
        <div className="mc-probe-meta label-mono mc-rise" style={delay(3400)}>
          spawn ＝ 启动一个全新子进程
        </div>
      </div>
    );
  }

  /* step 7 — 方法二正解：起跑线发令 */
  return (
    <div className="scene-pad mc-scene mc-start-scene">
      <div className="mc-head mc-rise">
        <span className="label-mono">测量心得 · 第二条（正解）</span>
      </div>
      <div className="mc-start-line">
        {["子进程 A", "子进程 B"].map((n, i) => (
          <div key={n} className="mc-start-runner mc-rise" style={delay(500 + i * 300)}>
            <span className="mc-start-card mono">{n}</span>
            <span className="mc-start-ready">先把共享内存接好，停在起跑线上</span>
          </div>
        ))}
        <div className="mc-start-flag mc-pop" style={delay(2200)}>发令旗 Event</div>
      </div>
      <div className="mc-start-verdict mc-rise" style={delay(3000)}>
        发令之后再计时——<b>只测纯传输</b>，差异才可见
      </div>
      <div className="mc-probe-meta label-mono mc-rise" style={delay(3500)}>
        Event ＝ 跨进程发令旗 · 挂载 ＝ 把共享内存接好
      </div>
    </div>
  );
}
