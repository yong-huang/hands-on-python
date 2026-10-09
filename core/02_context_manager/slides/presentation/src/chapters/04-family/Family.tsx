import type { ChapterStepProps } from "../../registry/types";
import "./Family.css";

/**
 * ch04 · family — 两条实现路（5 steps）
 *
 * step 0  过渡设问：岔口两条路
 * step 1  类式：__enter__ / __exit__ 双钩结构，逐个点亮
 * step 2  Transaction 双轨：BEGIN→COMMIT / BEGIN→ROLLBACK
 * step 3  函数式：yield 前后切出进出场
 * step 4  选型地图：等价徽章 + 两张选项卡
 */

export default function FamilyChapter({ step }: ChapterStepProps) {
  /* step 0 — 岔口 */
  if (step === 0) {
    return (
      <div className="scene-pad fm-scene fm-fork-scene">
        <div className="fm-fork-q fm-rise">
          这套机制，<b>怎么写</b>？
        </div>
        <div className="fm-fork">
          <div className="fm-fork-stem" />
          <div className="fm-fork-arms">
            <div className="fm-fork-arm fm-fork-arm-1">
              <span className="fm-fork-num">路一</span>
              <span className="fm-fork-name">类式</span>
            </div>
            <div className="fm-fork-arm fm-fork-arm-2">
              <span className="fm-fork-num">路二</span>
              <span className="fm-fork-name">函数式</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* step 1 — 类式双钩 */
  if (step === 1) {
    return (
      <div className="scene-pad fm-scene fm-class-scene">
        <div className="fm-class-head fm-rise">
          <span className="fm-route-tag">路一</span>类式
        </div>

        <div className="fm-class-code fm-rise" style={{ animationDelay: "300ms" }}>
          <pre className="fm-code">{`class MyResource:

    def __enter__(self):
        return resource

    def __exit__(self, exc_type, exc_val, exc_tb):
        cleanup()`}</pre>

          <span className="fm-hook fm-hook-1 fm-pop" style={{ animationDelay: "1600ms" }}>
            进场 · 拿资源
          </span>
          <span className="fm-hook fm-hook-2 fm-pop" style={{ animationDelay: "2800ms" }}>
            出场 · 做清理
          </span>
        </div>

        <div className="fm-class-foot fm-rise" style={{ animationDelay: "3600ms" }}>
          定义两个方法，<b>一进一出</b>
        </div>
      </div>
    );
  }

  /* step 2 — Transaction 双轨 */
  if (step === 2) {
    return (
      <div className="scene-pad fm-scene fm-tx-scene">
        <div className="fm-tx-head fm-rise">
          最典型的应用 · <b>数据库事务</b>
        </div>

        <div className="fm-tx-rails">
          <div className="fm-tx-rail fm-rise">
            <span className="fm-tx-rail-tag fm-tx-rail-tag-ok">正常</span>
            <div className="fm-term fm-term-ok">
              <div className="fm-term-line fm-line-in" style={{ animationDelay: "500ms" }}>
                <span className="fm-term-mark">[TX:insert_user]</span> BEGIN
              </div>
              <div className="fm-term-line fm-line-in" style={{ animationDelay: "1500ms" }}>
                <span className="fm-term-mark">[TX:insert_user]</span> COMMIT (2 ops)
              </div>
              <div className="fm-term-line fm-line-in fm-term-result" style={{ animationDelay: "2500ms" }}>
                committed=True
              </div>
            </div>
          </div>

          <div className="fm-tx-rail fm-rise" style={{ animationDelay: "800ms" }}>
            <span className="fm-tx-rail-tag">中途抛异常</span>
            <div className="fm-term">
              <div className="fm-term-line fm-line-in" style={{ animationDelay: "2600ms" }}>
                <span className="fm-term-mark">[TX:fail]</span> BEGIN
              </div>
              <div className="fm-term-line fm-line-in" style={{ animationDelay: "3600ms" }}>
                <span className="fm-term-mark">[TX:fail]</span> ROLLBACK (RuntimeError: connection lost)
              </div>
              <div className="fm-term-line fm-line-in fm-term-result" style={{ animationDelay: "4600ms" }}>
                rolled_back=True
              </div>
            </div>
          </div>
        </div>

        <div className="fm-tx-foot fm-rise" style={{ animationDelay: "5600ms" }}>
          成败两条路，<b>它都想好了</b>
        </div>
      </div>
    );
  }

  /* step 3 — 函数式 yield 前后 */
  if (step === 3) {
    return (
      <div className="scene-pad fm-scene fm-gen-scene">
        <div className="fm-class-head fm-rise">
          <span className="fm-route-tag fm-route-tag-2">路二</span>函数式
        </div>

        <div className="fm-gen-code fm-rise" style={{ animationDelay: "300ms" }}>
          <pre className="fm-code">{`@contextmanager
def my_resource():
    resource = acquire()
    yield resource
    release(resource)`}</pre>

          <span className="fm-gen-hl fm-zone-in" style={{ animationDelay: "2400ms" }} />

          <span className="fm-hook fm-hook-enter fm-zone-in" style={{ animationDelay: "1800ms" }}>
            进场 · 相当于 __enter__
          </span>
          <span className="fm-hook fm-hook-exit fm-zone-in" style={{ animationDelay: "3000ms" }}>
            出场 · 相当于 __exit__
          </span>
        </div>

        <div className="fm-gen-foot fm-rise" style={{ animationDelay: "3900ms" }}>
          几十行的类，<b>三行就写完</b>
        </div>
      </div>
    );
  }

  /* step 4 — 选型地图 */
  return (
    <div className="scene-pad fm-scene fm-map-scene">
      <div className="fm-map-cards">
        <div className="fm-map-card fm-rise">
          <div className="fm-map-card-head">
            <span className="fm-map-ord">路一</span>类式
          </div>
          <div className="fm-map-item">复杂状态 · self.xxx 显式维护</div>
          <div className="fm-map-item">__exit__ 返回值控制异常</div>
        </div>

        <div className="fm-map-eq fm-pop" style={{ animationDelay: "1300ms" }}>
          功能等价
        </div>

        <div className="fm-map-card fm-map-card-2 fm-rise" style={{ animationDelay: "500ms" }}>
          <div className="fm-map-card-head">
            <span className="fm-map-ord">路二</span>函数式
          </div>
          <div className="fm-map-item">@contextmanager + yield</div>
          <div className="fm-map-item">简单获取 / 释放 · 三行搞定</div>
        </div>
      </div>

      <div className="fm-map-foot fm-rise" style={{ animationDelay: "2500ms" }}>
        不用背，<b>知道有这两条路就行</b>
      </div>
    </div>
  );
}
