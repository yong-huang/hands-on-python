import type { ChapterStepProps } from "../../registry/types";
import "./Protocol.css";

/**
 * ch02 · protocol — 协议三方法（5 steps）
 *
 * step 0  协议代码卡：三方法逐个高亮 + 读/写/删角色标签
 * step 1  __get__ 签名解剖：obj / objtype 引线 + 两种调用对照
 * step 2  类访问陷阱：User.age → obj=None → obj.__dict__ 崩
 * step 3  放哪：实例身上 ✕ vs 类属性身上 ✓
 * step 4  __set_name__：属性名自动送入
 */

export default function ProtocolChapter({ step }: ChapterStepProps) {
  /* step 0 — 协议代码卡 */
  if (step === 0) {
    return (
      <div className="scene-pad pt-scene">
        <div className="pt-codecard pt-rise">
          <div className="pt-codecard-bar">descriptor_protocol.py</div>
          <pre className="pt-code">{`class MyDescriptor:

    def __get__(self, obj, objtype=None): ...

    def __set__(self, obj, value): ...

    def __delete__(self, obj): ...`}</pre>

          <span className="pt-role pt-role-1 pt-pop" style={{ animationDelay: "1300ms" }}>
            读
          </span>
          <span className="pt-role pt-role-2 pt-pop" style={{ animationDelay: "2100ms" }}>
            写
          </span>
          <span className="pt-role pt-role-3 pt-pop" style={{ animationDelay: "2900ms" }}>
            删
          </span>
        </div>
      </div>
    );
  }

  /* step 1 — __get__ 签名解剖 */
  if (step === 1) {
    return (
      <div className="scene-pad pt-scene pt-sig-scene">
        <div className="pt-sig pt-rise">
          <span className="pt-sig-token">def __get__</span>
          (<span className="pt-sig-obj">obj</span>, <span className="pt-sig-type">objtype</span>=None):
        </div>

        <div className="pt-sig-notes">
          <div className="pt-sig-note pt-sig-note-1 pt-rise" style={{ animationDelay: "900ms" }}>
            <span className="pt-sig-note-key">obj</span>
            发起访问的实例
          </div>
          <div className="pt-sig-note pt-sig-note-2 pt-rise" style={{ animationDelay: "1400ms" }}>
            <span className="pt-sig-note-key">objtype</span>
            所在的类
          </div>
        </div>

        <div className="pt-calls">
          <div className="pt-call pt-rise" style={{ animationDelay: "2000ms" }}>
            <code>u.age</code>
            <span className="pt-call-arrow">→</span>
            <code>__get__(u, User)</code>
          </div>
          <div className="pt-call pt-rise" style={{ animationDelay: "2500ms" }}>
            <code>User.age</code>
            <span className="pt-call-arrow">→</span>
            <code>__get__(None, User)</code>
          </div>
        </div>
      </div>
    );
  }

  /* step 2 — 类访问 None 陷阱 */
  if (step === 2) {
    return (
      <div className="scene-pad pt-scene pt-crash-scene">
        <div className="pt-crash-flow">
          <div className="pt-crash-card pt-rise">
            <span className="pt-crash-mono">User.age</span>
            <span className="pt-crash-note">类访问</span>
          </div>
          <span className="pt-crash-arrow pt-fade" style={{ animationDelay: "700ms" }}>→</span>
          <div className="pt-crash-card pt-crash-none pt-rise" style={{ animationDelay: "1100ms" }}>
            <span className="pt-crash-mono">obj = None</span>
            <span className="pt-crash-note">没有实例</span>
          </div>
          <span className="pt-crash-arrow pt-fade" style={{ animationDelay: "1500ms" }}>→</span>
          <div className="pt-crash-card pt-crash-dict pt-rise" style={{ animationDelay: "1900ms" }}>
            <span className="pt-crash-mono">obj.__dict__</span>
            <span className="pt-crash-x">✕</span>
          </div>
        </div>

        <div className="pt-crash-trace pt-pop" style={{ animationDelay: "2500ms" }}>
          <div className="pt-crash-trace-bar">AttributeError</div>
          <pre className="pt-crash-trace-code">
            {"'NoneType' object has no attribute '__dict__'"}
          </pre>
        </div>

        <div className="pt-crash-stamp pt-stamp-in" style={{ animationDelay: "3300ms" }}>
          当场崩
        </div>
      </div>
    );
  }

  /* step 3 — 放哪：实例 ✕ vs 类属性 ✓ */
  if (step === 3) {
    return (
      <div className="scene-pad pt-scene pt-place-scene">
        <div className="pt-place-lead pt-rise">写好的描述符，往哪放？</div>

        <div className="pt-place-cols">
          <div className="pt-place-col">
            <div className="pt-place-tag pt-place-tag-bad pt-rise" style={{ animationDelay: "500ms" }}>
              实例身上 ✕
            </div>
            <pre className="pt-place-code pt-place-code-dim pt-rise" style={{ animationDelay: "800ms" }}>
              {`u = User()
u.desc = MyDescriptor()
# 只是普通实例属性，拦不住`}
            </pre>
          </div>

          <div className="pt-place-col">
            <div className="pt-place-tag pt-place-tag-ok pt-rise" style={{ animationDelay: "1100ms" }}>
              类属性身上 ✓
            </div>
            <pre className="pt-place-code pt-place-code-acc pt-rise" style={{ animationDelay: "1400ms" }}>
              {`class User:
    desc = MyDescriptor()
# 读写全部经过它`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  /* step 4 — __set_name__ */
  return (
    <div className="scene-pad pt-scene pt-name-scene">
      <div className="pt-name-card pt-rise">
        <div className="pt-namecard-bar">typed_field.py</div>
        <pre className="pt-code">{`class TypedField:
    def __set_name__(self, owner, name):
        self.name = name

class User:
    age = TypedField()`}</pre>

        <span className="pt-name-arrow pt-fade" style={{ animationDelay: "1600ms" }}>
          age ⇢ name
        </span>
      </div>

      <div className="pt-name-result pt-pop" style={{ animationDelay: "2200ms" }}>
        <span className="pt-name-result-mono">age.name</span>
        <span className="pt-name-result-val">"age"</span>
      </div>

      <div className="pt-name-foot pt-rise" style={{ animationDelay: "3000ms" }}>
        不用手动传名字，<b>报错信息还精确</b>
      </div>
    </div>
  );
}
