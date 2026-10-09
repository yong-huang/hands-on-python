import type { ChapterStepProps } from "../../registry/types";
import "./Singleton.css";

/**
 * ch04 · singleton — 单例拦截（6 steps）
 *
 * step 0  需求卡：单例
 * step 1  SingletonMeta 代码卡（注册表 / 判断 / 缓存三段高亮）
 * step 2  为什么拦 __call__：实例创建必经之路
 * step 3  首次 vs 之后：双通道流程
 * step 4  真机：db1 is db2 True
 * step 5  预期陷阱：first creation wins
 */

export default function SingletonChapter({ step }: ChapterStepProps) {
  /* step 0 — 需求卡 */
  if (step === 0) {
    return (
      <div className="scene-pad sg-scene sg-req-scene">
        <div className="sg-req-head sg-rise">
          元类能干什么？<b>第二件</b>
        </div>
        <div className="sg-req-body sg-rise" style={{ animationDelay: "500ms" }}>
          单例
        </div>
        <div className="sg-req-sub sg-rise" style={{ animationDelay: "1200ms" }}>
          需求：一个类，全局只有一个实例
        </div>
      </div>
    );
  }

  /* step 1 — 代码卡 */
  if (step === 1) {
    return (
      <div className="scene-pad sg-scene sg-code-scene">
        <div className="sg-codecard sg-rise">
          <div className="sg-codecard-bar">singleton_meta.py</div>
          <pre className="sg-code">{`class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = \\
                super().__call__(*args, **kwargs)
        return cls._instances[cls]`}</pre>

          <span className="sg-mark sg-mark-1 sg-fade" style={{ animationDelay: "1500ms" }}>注册表</span>
          <span className="sg-mark sg-mark-2 sg-fade" style={{ animationDelay: "2300ms" }}>首次判断</span>
          <span className="sg-mark sg-mark-3 sg-fade" style={{ animationDelay: "3100ms" }}>缓存返回</span>
        </div>
      </div>
    );
  }

  /* step 2 — 拦截点 */
  if (step === 2) {
    return (
      <div className="scene-pad sg-scene sg-gate-scene">
        <div className="sg-gate-flow">
          <div className="sg-gate-node sg-rise">
            <span className="sg-gate-mono">Database()</span>
            <span className="sg-gate-sub">ClassName() 写法</span>
          </div>
          <span className="sg-gate-arrow sg-fade" style={{ animationDelay: "900ms" }}>→</span>
          <div className="sg-gate-node sg-gate-node-acc sg-pop" style={{ animationDelay: "1500ms" }}>
            <span className="sg-gate-mono">type(cls).__call__</span>
            <span className="sg-gate-sub">元类的 __call__</span>
          </div>
          <span className="sg-gate-arrow sg-fade" style={{ animationDelay: "2100ms" }}>→</span>
          <div className="sg-gate-node sg-rise" style={{ animationDelay: "2500ms" }}>
            <span className="sg-gate-sub">实例创建</span>
          </div>
        </div>
        <div className="sg-gate-foot sg-rise" style={{ animationDelay: "3200ms" }}>
          拦这里，就是拦<b>实例创建的必经之路</b>
        </div>
      </div>
    );
  }

  /* step 3 — 首次 vs 缓存 */
  if (step === 3) {
    return (
      <div className="scene-pad sg-scene sg-cache-scene">
        <div className="sg-cache-cols">
          <div className="sg-cache-card sg-rise">
            <div className="sg-cache-tag">首次调用</div>
            <div className="sg-cache-body">真正执行 __new__ / __init__</div>
            <div className="sg-cache-res">实例 → 存入 _instances</div>
          </div>
          <div className="sg-cache-card sg-cache-card-2 sg-rise" style={{ animationDelay: "900ms" }}>
            <div className="sg-cache-tag">之后每次</div>
            <div className="sg-cache-body">不再创建</div>
            <div className="sg-cache-res">直接返回缓存</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — 真机 */
  if (step === 4) {
    return (
      <div className="scene-pad sg-scene sg-term-scene">
        <div className="sg-term sg-rise">
          <div className="sg-term-bar">python3 metaclass.py</div>
          <div className="sg-term-body">
            <div className="sg-term-line sg-line-in" style={{ animationDelay: "250ms" }}>
              db1 is db2: <span className="sg-term-acc">True</span>
            </div>
            <div className="sg-term-line sg-line-in" style={{ animationDelay: "1200ms" }}>
              db1.host: localhost&nbsp;&nbsp;(first creation wins)
            </div>
            <div className="sg-term-line sg-line-in" style={{ animationDelay: "2300ms" }}>
              db1.query('SELECT 1'): [localhost] executing: SELECT 1
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 5 — 预期陷阱 */
  return (
    <div className="scene-pad sg-scene sg-trap-scene">
      <div className="sg-trap-line sg-rise">
        第二次 <span className="sg-trap-mono">Database("remotehost")</span>
      </div>
      <div className="sg-trap-big sg-pop" style={{ animationDelay: "900ms" }}>
        参数被忽略了
      </div>
      <div className="sg-trap-foot sg-rise" style={{ animationDelay: "2100ms" }}>
        首次创建胜出——<b>单例的预期行为，不是 bug</b>
      </div>
    </div>
  );
}
