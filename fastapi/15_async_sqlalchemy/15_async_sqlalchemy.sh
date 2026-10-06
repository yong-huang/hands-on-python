#!/usr/bin/env bash
# lab 15 · SQLAlchemy async —— 主演示脚本
#
# 用法:
#   ./15_async_sqlalchemy.sh start   # 建表并启动服务(端口 8915), Ctrl-C 停止
#   ./15_async_sqlalchemy.sh demo    # 教学演示: 自动起停服务, 跑完 5 个章节(含断言)
#   ./15_async_sqlalchemy.sh clean   # 停止服务, 删除 lab15.db 与 .run/ 运行目录
#   ./15_async_sqlalchemy.sh all     # clean + demo + clean 全生命周期
#
# 场景: 笔记 API。create_async_engine + async_sessionmaker 组件层, get_session 以
# yield 依赖给每个请求借还 AsyncSession; demo [3] 用 20 个并发 POST 实测 SQLite
# 单写者锁下的串行化行为(提交时刻一条接一条)与总耗时。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8915
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
LAST_RESP="$RUN_DIR/last_resp.json"
CONC_JSON="$RUN_DIR/concurrency.json"
DB_FILE="$LAB_DIR/lab15.db"
SERVER_PID=""
STATUS=""
ELAPSED=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}

# jget: 从指定 JSON 文件取字段。表达式形如 d["writes"][0]（eval 仅供本脚本自用）
jgetf() { # FILE EXPR
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$2" "$1"
}

show_resp() { # 打印请求描述与最近一次响应(JSON 美化, 纯文本原样打印)
    echo "    \$ $1   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
raw = open(sys.argv[1], encoding="utf-8").read()
try:
    print(json.dumps(json.loads(raw), ensure_ascii=False, indent=2))
except ValueError:
    print(raw)
' "$LAST_RESP" | sed 's/^/        /'
}

# httpx_req: 用 .venv/bin/python + httpx 发请求(教学断言与耗时测量统一走 httpx)。
# 结果: 响应体写入 $LAST_RESP, 状态码/耗时写入 STATUS / ELAPSED。
httpx_req() { # METHOD PATH [JSON_BODY]
    local line
    line="$("$PY" - "$1" "$BASE$2" "${3:-}" "$LAST_RESP" <<'PYEOF'
import json, sys, time
import httpx
method, url, body, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
kwargs: dict = {"timeout": 10}
if body:
    kwargs["json"] = json.loads(body)
t0 = time.perf_counter()
r = httpx.request(method, url, **kwargs)
print(r.status_code, f"{time.perf_counter() - t0:.3f}")
with open(out, "w", encoding="utf-8") as f:
    f.write(r.text)
PYEOF
)"
    STATUS="${line%% *}"
    ELAPSED="${line##* }"
    show_resp "httpx -X $1 $2${3:+ -d '$3'}"
}

# ensure_db: start 之前建表(幂等)。schema 由脚本管理, 不放在应用 lifespan 里,
# 以贴近生产做法——建表/迁移属于部署步骤, 应用启动只连接。
ensure_db() {
    "$PY" - "$LAB_DIR" <<'PYEOF'
import asyncio, sys
sys.path.insert(0, sys.argv[1])
from main import init_db
asyncio.run(init_db())
print("  数据库就绪: lab15.db (表 notes 已创建/已存在)")
PYEOF
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/stats" 2>/dev/null; then
            echo "  服务就绪: $BASE (pid=$SERVER_PID)"
            return 0
        fi
        sleep 0.3
    done
    echo "  [FAIL] 服务 18s 内未就绪, 日志尾部:"; tail -20 "$SERVER_LOG"
    exit 1
}

stop_server() {
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
        SERVER_PID=""
    fi
    # 兜底清扫: 上一个脚本实例可能留下了同端口残留进程
    if command -v lsof >/dev/null 2>&1; then
        local pids
        pids="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
        if [ -n "$pids" ]; then kill $pids 2>/dev/null || true; sleep 0.5; fi
    fi
}
trap 'stop_server' EXIT

# 并发写实测: 单发写打底 -> 20 个 POST 并发 -> 取回提交时刻序列。结果写 $CONC_JSON
# 供 bash 断言; 单发写耗时作为"串行化的基准刻度"一并打印。
concurrency_probe() {
    "$PY" - "$BASE" "$CONC_JSON" <<'PYEOF'
import asyncio, json, sys, time
import httpx

base, out = sys.argv[1], sys.argv[2]

async def main() -> int:
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 清空上一轮写轨迹(/write-trace 读后即清), 让本节数据只含本轮请求
        await client.get(f"{base}/write-trace")
        # 单发一次写: 记录单次写耗时, 作为对照基准
        t0 = time.perf_counter()
        r1 = await client.post(f"{base}/notes", json={"content": "warmup-single"})
        single_ms = (time.perf_counter() - t0) * 1000
        assert r1.status_code == 201, f"warmup POST -> {r1.status_code}"

        # 并发 20 个 POST: 协程同时发起, 提交在数据库文件锁上一条条排队
        async def one(i: int) -> tuple[int, int]:
            r = await client.post(f"{base}/notes", json={"content": f"concurrent-{i:02d}"})
            return r.status_code, r.json()["id"]

        t1 = time.perf_counter()
        results = await asyncio.gather(*(one(i) for i in range(20)))
        elapsed_s = time.perf_counter() - t1
        statuses = [s for s, _ in results]
        ids = [i for _, i in results]
        trace = (await client.get(f"{base}/write-trace")).json()

    done = [w["commit_done_ms"] for w in trace["writes"]]
    monotone = done == sorted(done)
    deltas = [round(b - a, 1) for a, b in zip(done, done[1:])]
    summary = {
        "n": 20,
        "ok_201": statuses.count(201),
        "unique_ids": len(set(ids)),
        "single_ms": round(single_ms, 1),
        "elapsed_s": round(elapsed_s, 3),
        "commit_done_ms": done,
        "deltas_ms": deltas,
        "monotone": monotone,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False)
    print(f"    单发写耗时(基准): {summary['single_ms']} ms")
    print(f"    并发 20 个 POST 总耗时: {summary['elapsed_s']} s")
    print(f"    状态码: 201 x {summary['ok_201']}/20    id 去重: {summary['unique_ids']}/20")
    print(f"    提交完成时刻序列(ms, 相对最早进入, {len(done)} 条 = 1 条单发 + 20 条并发):")
    print("      " + " ".join(f"{v:.1f}" for v in done))
    print("    相邻提交间隔(ms): " + " ".join(f"{v:.1f}" for v in deltas))
    if not monotone:
        print("    [FAIL] 提交时刻序列不是单调不减")
        return 1
    return 0

sys.exit(asyncio.run(main()))
PYEOF
}

demo() {
    stop_server
    banner "lab 15 · SQLAlchemy async —— 异步 ORM 接入, 与它在 SQLite 单写者下的边界"
    echo "  场景: 笔记 API。engine(aiosqlite) + async_sessionmaker 在进程层各建一次,"
    echo "  get_session 作为 yield 依赖给每个请求借还 AsyncSession; 并发写实测用来"
    echo "  看 async 的边界: 数据库文件锁让提交一条条串行, async 并不改变这一点。"

    rm -f "$DB_FILE" "$DB_FILE-journal" "$DB_FILE-wal" "$DB_FILE-shm"
    ensure_db
    start_server

    step "[1/5] 组件总览: engine 挂池, 工厂造 session, 依赖管借还"
    echo "  /stats 返回三个组件的身份: engine(url+方言+池), session 工厂, 以及"
    echo "  session 借还计数。文件型 SQLite 的默认池是 AsyncAdaptedQueuePool。"
    httpx_req GET /stats
    assert_eq "engine 方言 = sqlite+aiosqlite" "$(jgetf "$LAST_RESP" 'd["dialect"]')" "sqlite+aiosqlite"
    assert_eq "文件库默认池 = AsyncAdaptedQueuePool" "$(jgetf "$LAST_RESP" 'd["pool_class"]')" "AsyncAdaptedQueuePool"
    assert_eq "session 工厂 = async_sessionmaker" "$(jgetf "$LAST_RESP" 'd["session_factory"]')" "async_sessionmaker"
    echo "  池状态: $(jgetf "$LAST_RESP" 'd["pool_status"]')"
    echo "  读法: Pool size=5 常备连接, max_overflow 再加 10; SQLite 写串行,"
    echo "  池的收益在连接复用(省反复开/关文件)与读并发, 不在写并行。"

    step "[2/5] 写入与回读: POST commit -> refresh 回读, GET 读回一致"
    httpx_req POST /notes '{"content":"hello lab15"}'
    assert_eq "POST /notes 状态码 201" "$STATUS" "201"
    local note_id
    note_id="$(jgetf "$LAST_RESP" 'd["id"]')"
    assert_eq "commit 后回读到自增 id" "$note_id" "1"
    assert_eq "created_at 由服务端生成" "$(jgetf "$LAST_RESP" 'bool(d["created_at"])')" "true"
    httpx_req GET "/notes/$note_id"
    assert_eq "GET 回读 content 与写入一致" "$(jgetf "$LAST_RESP" 'd["content"]')" "hello lab15"
    httpx_req GET /notes
    assert_eq "列表长度 1(新库)" "$(jgetf "$LAST_RESP" 'len(d["items"] if isinstance(d, dict) else d)')" "1"

    step "[3/5] 并发写实测: 20 个 POST 同时进, 提交一条接一条出"
    echo "  先单发一次写记录基准耗时, 再 20 个 POST 并发(httpx.AsyncClient +"
    echo "  asyncio.gather)。断言: 全部 201, id 唯一, 提交完成时刻单调不减——"
    echo "  最后一条就是 SQLite 单写者串行化的现场: 提交在文件锁上排队。"
    concurrency_probe
    assert_eq "20 个并发 POST 全部 201" "$(jgetf "$CONC_JSON" 'd["ok_201"]')" "20"
    assert_eq "20 个 id 全部唯一" "$(jgetf "$CONC_JSON" 'd["unique_ids"]')" "20"
    assert_eq "提交完成时刻单调不减(串行化)" "$(jgetf "$CONC_JSON" 'd["monotone"]')" "true"
    if "$PY" -c 'import sys; sys.exit(0 if float(sys.argv[1]) < 30 else 1)' "$(jgetf "$CONC_JSON" 'd["elapsed_s"]')"; then
        ok "总耗时 < 30s(无死锁/无饿死)"
    else
        fail "总耗时 >= 30s, 疑似锁等待异常"
    fi
    echo "  诚实预期: 总耗时随机器浮动(磁盘与 fsync 速度主导), 本机多次实测约"
    echo "  0.05~0.25 s, 单发写约 3~6 ms; 相邻提交间隔毫秒级, 偶有几十毫秒抖动。"
    echo "  总耗时接近 20 x 单发耗时, 而不是并行任务的'约等于最慢一个'——"
    echo "  时间上叠不起来, 正是串行。"

    step "[4/5] yield 依赖的生命周期: 响应之后, session 已在 finally 里归还"
    echo "  get_session 与 lab 07 的 yield 依赖同构: yield 前借出(opened+1),"
    echo "  finally 里归还(closed+1); teardown 在响应发送之后执行, 所以等 0.3s"
    echo "  再读 /stats, 让 teardown 先跑完。"
    httpx_req POST /notes '{"content":"lifecycle"}'
    assert_eq "POST /notes 状态码 201" "$STATUS" "201"
    sleep 0.3
    httpx_req GET /stats
    assert_eq "opened == closed(借出即归还)" \
        "$(jgetf "$LAST_RESP" 'd["sessions"]["opened"] == d["sessions"]["closed"]')" "true"
    assert_eq "open_now == 0(没有滞留的 session)" "$(jgetf "$LAST_RESP" 'd["sessions"]["open_now"]')" "0"
    echo "  池状态: $(jgetf "$LAST_RESP" 'd["pool_status"]')"
    echo "  Checked out connections: 0 = 每条连接都回到了池里; session.close()"
    echo "  不关引擎, 只把这条连接还给池——下一次请求借走的还是它。"

    step "[5/5] 边界与对照: SQLite 单写者 vs 生产级 PostgreSQL / MySQL"
    echo "  +--------------------------------+--------------------------------------+"
    echo "  | SQLite(文件库)                  | PostgreSQL / MySQL                   |"
    echo "  +--------------------------------+--------------------------------------+"
    echo "  | 整库一把写锁, 同一时刻一个写者  | 行级锁 / MVCC, 写与写大幅并行        |"
    echo "  | 高并发写吞吐有硬上限(本实验所见)| 高并发写靠锁粒度 + 连接池调优        |"
    echo "  | 锁冲突走 busy timeout 兜底      | 锁等待/死锁检测均可参数化            |"
    echo "  | 适合单机工具/原型/演示          | 适合多实例共享、高并发写             |"
    echo "  +--------------------------------+--------------------------------------+"
    echo "  要真正并行写, 换 postgresql+asyncpg 之类异步驱动: engine/session/"
    echo "  依赖的写法不变, 模型代码不动——这正是异步 ORM 分层带来的可替换性。"
    echo
    echo "  章节速查: [1] 组件与池 | [2] commit+refresh 回读 | [3] 20 并发串行化"
    echo "            [4] finally 归还 session | [5] SQLite vs PG/MySQL"
    echo "  服务端日志保留在 $SERVER_LOG, 数据库文件 $DB_FILE 由 clean 删除"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    stop_server
    ensure_db
    start_server
    echo "  试一试:"
    echo "    curl -X POST $BASE/notes -H 'Content-Type: application/json' -d '{\"content\":\"hi\"}'"
    echo "    curl $BASE/notes"
    echo "    curl $BASE/stats"
    echo "  停止: Ctrl-C(数据库文件保留, clean 才删除)"
    wait "$SERVER_PID"
}

cmd_clean() {
    stop_server
    rm -f "$DB_FILE" "$DB_FILE-journal" "$DB_FILE-wal" "$DB_FILE-shm"
    rm -rf "$RUN_DIR"
    echo "已停止服务并删除 $DB_FILE 与 $RUN_DIR"
}

case "${1:-demo}" in
    start) cmd_start ;;
    demo) demo ;;
    clean) cmd_clean ;;
    all)
        cmd_clean
        demo
        cmd_clean
        ;;
    *)
        echo "用法: $0 start|demo|clean|all"
        exit 1
        ;;
esac
