import type { CSSProperties } from "react";
import type { ChapterStepProps } from "../../registry/types";
import "./Closing.css";

const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties;

const API_ROWS = [
  { api: "async def", use: "定义协程" },
  { api: "await", use: "让出控制权" },
  { api: "asyncio.run", use: "程序主入口，一次就够" },
  { api: "create_task", use: "真并发的入口" },
  { api: "asyncio.sleep", use: "会谦让的睡眠" },
];

/* step 0 · API 速查表：五行按口播点名逐个亮，上一行在下一行出现时转灰 */
function ApiTable() {
  const rows = [
    { delay: 2200, dimDur: 2200 },
    { delay: 4400, dimDur: 2100 },
    { delay: 6500, dimDur: 3000 },
    { delay: 9500, dimDur: 2200 },
    { delay: 11700, dimDur: 0 },
  ];
  return (
    <div className="cz-api">
      <div className="cz-api-title cz-fade">常用入口，就五个</div>
      <div className="cz-api-list">
        {API_ROWS.map((r, i) => {
          const last = i === rows.length - 1;
          return (
            <div
              key={r.api}
              className={"cz-api-row " + (last ? "cz-row-in" : "cz-row-dim")}
              style={{ animationDelay: `${rows[i].delay}ms`, animationDuration: `${last ? 700 : rows[i].dimDur}ms` }}
            >
              <code className="cz-api-name">{r.api}</code>
              <span className="cz-api-use">{r.use}</span>
            </div>
          );
        })}
      </div>
      <div className="cz-api-warn cz-rise" style={delay(14200)}>
        换成 time.sleep —— <span>全店停摆</span>。
      </div>
    </div>
  );
}

/* step 1 · 收尾 */
function Farewell() {
  return (
    <div className="cz-end">
      <div className="cz-end-repo cz-fade">hands-on-python · concurrency / 08_coroutine_loop</div>
      <div className="cz-end-line cz-hero-in" style={delay(400)}>
        一行命令，一跑就有体感。
      </div>
      <div className="cz-end-next cz-rise" style={delay(1600)}>
        下一讲 · 任务编排 —— <b>Task Group、超时、取消</b>
      </div>
      <div className="cz-end-bye cz-rise" style={delay(2800)}>
        下期见。
      </div>
    </div>
  );
}

function ClosingInner({ step }: ChapterStepProps) {
  if (step === 0) return <ApiTable />;
  return <Farewell />;
}

export default function Closing({ step }: ChapterStepProps) {
  return (
    <div className="scene-pad">
      <ClosingInner step={step} />
    </div>
  );
}
