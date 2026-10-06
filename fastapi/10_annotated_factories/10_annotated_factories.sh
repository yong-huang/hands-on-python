#!/usr/bin/env bash
# lab 10 · Annotated 与依赖工厂 —— 主演示脚本
#
# 用法:
#   ./10_annotated_factories.sh start   # 启动服务(端口 8910), Ctrl-C 停止
#   ./10_annotated_factories.sh demo    # 教学演示: 自动起停服务, 跑完 5 个章节(含断言)
#   ./10_annotated_factories.sh clean   # 停止服务并删除 .run/
#   ./10_annotated_factories.sh all     # clean + demo + clean 全生命周期
#
# 场景: 报表 API。Annotated 别名把类型与依赖合在一处; 依赖工厂把配置收进闭包;
# 依赖缓存键是工厂产出的函数对象本身 —— 同一对象在依赖树里出现两次只执行一次,
# 同参数调用工厂两次却是两个键、各执行一次。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8910
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }

# hx: 用 httpx 发一个请求, 打印响应, 并断言状态码与 JSON 字段
# 用法: hx METHOD "PATH?QUERY" WANT_STATUS [json表达式 期望值]...
#   表达式在 python 里 eval, 可用变量: d=响应JSON(非 JSON 响应时为 None), r=httpx 响应对象
hx() {
    local out rc n
    if out="$("$PY" - "$1" "$BASE$2" "$3" "${@:4}" <<'HXEOF'
import json, sys
import httpx

method, url, want_status, *pairs = sys.argv[1:]
r = httpx.request(method, url)
print(f'    $ httpx.request("{method}", "{url}")   ->   HTTP {r.status_code}')
try:
    d = r.json()
except ValueError:
    d = None
if d is not None:
    pretty = json.dumps(d, ensure_ascii=False, indent=2)
    print("\n".join("        " + ln for ln in pretty.splitlines()))
fails = 0
if str(r.status_code) == want_status:
    print(f"        [PASS] 状态码 {want_status}")
else:
    print(f"        [FAIL] 状态码 {r.status_code} != 期望 {want_status}")
    fails += 1
assert len(pairs) % 2 == 0, "表达式与期望值必须成对出现"
for i in range(0, len(pairs), 2):
    expr, want = pairs[i], pairs[i + 1]
    got = str(eval(expr, {"d": d, "r": r}))
    if got == want:
        print(f"        [PASS] {expr} == {want}")
    else:
        print(f"        [FAIL] {expr} = {got} != 期望 {want}")
        fails += 1
sys.exit(1 if fails else 0)
HXEOF
)"; then
        rc=0
    else
        rc=$?
    fi
    printf '%s\n' "$out"
    n="$(grep -c '\[PASS\]' <<<"$out" || true)"
    PASS_COUNT=$((PASS_COUNT + n))
    if [ "$rc" -ne 0 ]; then
        echo "    [FAIL] httpx 断言未全部通过"
        exit 1
    fi
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/trace" 2>/dev/null; then
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

demo() {
    stop_server
    banner "lab 10 · Annotated 与依赖工厂 —— 类型与依赖合一, 配置收进闭包"
    echo "  场景: 报表 API。make_pagination(max_size) 是依赖工厂: 每调用一次就在闭包里"
    echo "  铸出一个新依赖函数。普通报表用上限 50 的那一件, 管理报表用上限 200 的那一件;"
    echo "  GET /trace 暴露进程内计数器, 每个依赖槽位真实执行几次, 数字说了算。"

    start_server

    step "[1/5] Annotated 写法对照: 类型在注解位, 依赖也在注解位"
    echo "  旧写法(默认值位放依赖构造器, 类型信息与依赖元数据拆在两处):"
    echo "      def list_reports(pg: PageInfo = Depends(pagination_50)) -> dict: ..."
    echo "  新写法(推荐): 类型与依赖合进一个 Annotated, 起个别名, 声明处只写一个词:"
    echo "      Page = Annotated[PageInfo, Depends(pagination_50)]"
    echo "      def list_reports(pg: Page) -> dict: ..."
    echo "  两种写法运行期行为完全相同, 默认 page=1、size=10:"
    hx GET "/reports" 200 \
        'd["report"]' "normal" \
        'd["page"]' "1" \
        'd["size"]' "10" \
        'd["max_size"]' "50" \
        'd["offset"]' "0"

    step "[2/5] 同工厂不同参数: 两套上限彼此独立"
    echo "  普通报表的分页依赖由 make_pagination(50) 铸出: size=100 超过上限 50, 422:"
    hx GET "/reports?size=100" 422 \
        'd["detail"][0]["type"]' "less_than_equal" \
        'd["detail"][0]["loc"]' "['query', 'size']" \
        'd["detail"][0]["ctx"]["le"]' "50"
    echo "  管理报表的分页依赖由 make_pagination(200) 铸出: 同名参数 size=100 放行:"
    hx GET "/admin/reports?page=2&size=100" 200 \
        'd["size"]' "100" \
        'd["max_size"]' "200" \
        'd["offset"]' "100"
    echo "  两套约束互不干涉的边界值: 50 是普通报表的上限, 200 是管理报表的上限:"
    hx GET "/reports?size=50" 200 \
        'd["size"]' "50" \
        'd["max_size"]' "50"
    hx GET "/admin/reports?size=201" 422 \
        'd["detail"][0]["ctx"]["le"]' "200"

    step "[3/5] 类型别名复用: 同一个 Page 用在多个路由, 行为一致"
    echo "  Page 别名同时声明在 /reports 与 /reports/dup 上, 约束跟着别名走:"
    hx GET "/reports/dup?size=100" 422 \
        'len(d["detail"])' "2" \
        'd["detail"][0]["ctx"]["le"]' "50"
    echo "  (422 里出现两条错误: /reports/dup 除了直连 Page, 嵌套依赖 page_tag 内部"
    echo "   也声明了 Page, 两处都做校验。) 合法请求则两处协同产出同一份 PageInfo:"
    hx GET "/reports/dup?size=30" 200 \
        'd["tag"]' "p1-s30" \
        'd["size"]' "30" \
        'd["max_size"]' "50"

    step "[4/5] 缓存键: 键是函数对象, 工厂每调用一次就多一个键"
    echo "  先看基线: 分页50#1 计 3 次(章节 1 默认请求 + 章节 2 的 size=50 + 章节 3 的 dup"
    echo "  一次执行), 分页200#2 计 1 次, 再铸50#3 还没被任何路由引用, 计数 0:"
    hx GET "/trace" 200 \
        'd["exec_counts"].get("分页50#1", 0)' "3" \
        'd["exec_counts"].get("分页200#2", 0)' "1" \
        'd["exec_counts"].get("再铸50#3", 0)' "0" \
        'd["factory_calls"]["make_pagination"]' "4"
    echo "  (导入期工厂共调用 4 次: 50、200 各一次, twice-made 路由再铸两次。)"
    echo "  再打一次 /reports/dup: pagination_50 在依赖树里出现两次(直连 + 嵌套),"
    echo "  但 Depends 默认 use_cache=True, 同一函数对象一次请求只执行一次 -> 计数 3 变 4:"
    hx GET "/reports/dup?page=2&size=20" 200 \
        'd["tag"]' "p2-s20"
    hx GET "/trace" 200 \
        'd["exec_counts"].get("分页50#1", 0)' "4"
    echo "  对照: make_pagination(50) 调用两次得到两个对象(同参数也不合并),"
    echo "  twice-made 路由同时声明它们 -> 两个键各执行一次:"
    hx GET "/reports/twice-made?page=1&size=5" 200 \
        'd["same_object"]' "False" \
        'd["a"]["max_size"]' "50" \
        'd["b"]["max_size"]' "50"
    hx GET "/reports?size=10" 200 \
        'd["size"]' "10"
    echo "  终局对账: 分页50#1 再 +1 到 5(普通报表又打了一次),"
    echo "  再铸50#3 与 #4 各 1(各自执行, 互不共享):"
    hx GET "/trace" 200 \
        'd["exec_counts"].get("分页50#1", 0)' "5" \
        'd["exec_counts"].get("分页200#2", 0)' "1" \
        'd["exec_counts"].get("再铸50#3", 0)' "1" \
        'd["exec_counts"].get("再铸50#4", 0)' "1"

    step "[5/5] 类依赖工厂: 同一个 TokenBucket 类, 不同 rate 的两只桶"
    echo "  make_bucket(name, rate, capacity) 返回提供者函数, 由它实例化 TokenBucket;"
    echo "  慢速桶 capacity=5: 要 8 个令牌超过容量, 数学上永远不可能, 直接 429:"
    hx GET "/export/slow?cost=8" 429 \
        'd["detail"]["reason"]' "cost_exceeds_capacity" \
        'd["detail"]["capacity"]' "5"
    echo "  同一只慢速桶要 3 个(容量以内)就放行, 桶参数回显 rate=1.0:"
    hx GET "/export/slow?cost=3" 200 \
        'd["allowed"]' "True" \
        'd["rate"]' "1.0" \
        'd["capacity"]' "5" \
        'd["tokens_left"]' "2.0"
    echo "  快速桶出自同一个工厂, rate=10.0、capacity=20: 要 8 个轻松放行(初桶 20-8=12):"
    hx GET "/export/fast?cost=8" 200 \
        'd["rate"]' "10.0" \
        'd["capacity"]' "20" \
        'd["tokens_left"]' "12.0"
    echo "  快速桶要 30 个同样被拒(30 > 容量 20) —— 同一个类, 不同参数, 行为分野:"
    hx GET "/export/fast?cost=30" 429 \
        'd["detail"]["reason"]' "cost_exceeds_capacity"
    echo "  /trace 里两只桶并存, rate/capacity 各自独立:"
    hx GET "/trace" 200 \
        'd["buckets"]["slow"]["rate"]' "1.0" \
        'd["buckets"]["fast"]["rate"]' "10.0" \
        'd["buckets"]["fast"]["capacity"]' "20"

    echo
    echo "  章节速查: [1] Annotated 对照 page=1/size=10 | [2] size=100 -> 422(50) 与 200(200)"
    echo "            [3] Page 别名两路由一致 | [4] 缓存键 3->4->5, 再铸 #3/#4 各 1"
    echo "            [5] 慢桶 429(cap 5) / 快桶 200(cap 20)"
    echo "  服务端日志保留在 $SERVER_LOG, 计数器可用 GET $BASE/trace 随时查看"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl '$BASE/reports?size=100'          # 普通报表, 422 (上限 50)"
    echo "    curl '$BASE/admin/reports?size=100'    # 管理报表, 200 (上限 200)"
    echo "    curl '$BASE/reports/twice-made'        # 同参数两铸, 两键各执行一次"
    echo "    curl '$BASE/trace'                     # 进程内计数器"
    echo "  停止: Ctrl-C"
    wait "$SERVER_PID"
}

cmd_clean() {
    stop_server
    rm -rf "$RUN_DIR"
    echo "已停止服务并清理 $RUN_DIR"
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
