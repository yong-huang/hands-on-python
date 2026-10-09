import type { ChapterStepProps } from "../../registry/types";
import "./Orm.css";

/**
 * ch05 · orm — ORM 字段映射（6 steps）
 *
 * step 0  需求卡：类里声明 Field → 表结构自动生成
 * step 1  OrmMeta 代码卡：__new__ 扫描 namespace
 * step 2  时机对比：__call__（实例）vs __new__（类）
 * step 3  真机：User._table / User._fields
 * step 4  SQL 三连终端
 * step 5  零样板点题
 */

const SQL = [
  { tag: "CREATE", line: "CREATE TABLE user (id int PRIMARY KEY, name str, email str)" },
  { tag: "SELECT", line: "SELECT id, name, email FROM user" },
  { tag: "INSERT", line: "INSERT INTO user (id, name, email) VALUES (1, 'Alice', 'alice@example.com')" },
];

export default function OrmChapter({ step }: ChapterStepProps) {
  /* step 0 — 需求卡 */
  if (step === 0) {
    return (
      <div className="scene-pad om-scene om-req-scene">
        <div className="om-req-head om-rise">
          第三件，<b>最实用的</b>
        </div>
        <div className="om-req-body om-rise" style={{ animationDelay: "500ms" }}>
          ORM 字段映射
        </div>
        <div className="om-req-flow om-rise" style={{ animationDelay: "1300ms" }}>
          <span className="om-req-chip">类里声明 Field</span>
          <span className="om-req-arrow">→</span>
          <span className="om-req-chip om-req-chip-acc">表结构自动生成</span>
        </div>
      </div>
    );
  }

  /* step 1 — OrmMeta 代码 */
  if (step === 1) {
    return (
      <div className="scene-pad om-scene om-code-scene">
        <div className="om-codecard om-rise">
          <div className="om-codecard-bar">orm_meta.py</div>
          <pre className="om-code">{`class OrmMeta(type):
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        cls._fields = {k: v for k, v in namespace.items()
                       if isinstance(v, Field)}
        cls._table = name.lower()
        return cls`}</pre>
        </div>
      </div>
    );
  }

  /* step 2 — 时机对比 */
  if (step === 2) {
    return (
      <div className="scene-pad om-scene om-timing-scene">
        <div className="om-timing-lead om-rise">注意，拦截的时机不同</div>
        <div className="om-timing-cols">
          <div className="om-timing-card om-rise" style={{ animationDelay: "600ms" }}>
            <div className="om-timing-tag">单例章</div>
            <div className="om-timing-mono">__call__</div>
            <div className="om-timing-desc">管「实例怎么创建」</div>
          </div>
          <div className="om-timing-card om-timing-card-acc om-rise" style={{ animationDelay: "1400ms" }}>
            <div className="om-timing-tag">本章</div>
            <div className="om-timing-mono">__new__</div>
            <div className="om-timing-desc">管「类怎么创建」</div>
          </div>
        </div>
      </div>
    );
  }

  /* step 3 — 真机字段 */
  if (step === 3) {
    return (
      <div className="scene-pad om-scene om-fields-scene">
        <div className="om-fields-term om-rise">
          <div className="om-fields-bar">python3 metaclass.py</div>
          <div className="om-fields-body">
            <div className="om-fields-line om-line-in" style={{ animationDelay: "400ms" }}>
              User._table: <span className="om-fields-acc">user</span>
            </div>
            <div className="om-fields-line om-line-in" style={{ animationDelay: "1600ms" }}>
              User._fields: ['id', 'name', 'email']
            </div>
          </div>
        </div>
        <div className="om-fields-note om-rise" style={{ animationDelay: "2600ms" }}>
          类一创建，<b>表结构信息就位</b>
        </div>
      </div>
    );
  }

  /* step 4 — SQL 三连 */
  if (step === 4) {
    return (
      <div className="scene-pad om-scene om-sql-scene">
        <div className="om-sql-term om-rise">
          <div className="om-fields-bar">SQL 全部自动生成</div>
          {SQL.map((s, i) => (
            <div key={s.tag} className="om-sql-row">
              <span className="om-sql-tag" style={{ animationDelay: `${500 + i * 900}ms` }}>
                {s.tag}
              </span>
              <span className="om-sql-line" style={{ animationDelay: `${500 + i * 900}ms` }}>
                {s.line}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* step 5 — 零样板 */
  return (
    <div className="scene-pad om-scene om-zero-scene">
      <div className="om-zero-big om-rise">
        用户类里，<b>一行样板都没有</b>
      </div>
      <div className="om-zero-foot om-rise" style={{ animationDelay: "1300ms" }}>
        这就是<b className="om-zero-acc">「类创建之前拦截」</b>的价值
      </div>
    </div>
  );
}
