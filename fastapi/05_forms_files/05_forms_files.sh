#!/usr/bin/env bash
# lab 05 · 表单与文件上传 —— 主演示脚本
#
# 用法:
#   ./05_forms_files.sh start   # 启动服务(端口 8905), Ctrl-C 停止
#   ./05_forms_files.sh demo    # 教学演示: 自动起停服务, 跑完 7 个章节(含断言)
#   ./05_forms_files.sh clean   # 停止服务, 删除上传目录 /tmp/fastapi_lab05_uploads 与 .run/
#   ./05_forms_files.sh all     # clean + demo + clean 全生命周期
#
# 场景: 资料上传 API。两类表单体(urlencoded / multipart), 两种文件参数
# (bytes 全量进内存 / UploadFile 分块流式读), 以及两条手写防线:
# 大小上限 200KB(413 中途断)与扩展名白名单(415 读之前断)。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
UVICORN="$ROOT_DIR/.venv/bin/uvicorn"
PORT=8905
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$LAB_DIR/.run"
SERVER_LOG="$RUN_DIR/server.log"
LAST_RESP="$RUN_DIR/last_resp.json"
UPLOAD_DIR="/tmp/fastapi_lab05_uploads"
SAMPLE_300K="$RUN_DIR/sample_300k.txt"
SAMPLE_2_5M="$RUN_DIR/sample_2_5m.txt"
GUARD_300K="$RUN_DIR/guard_300k.txt"
EVIL_EXE="$RUN_DIR/evil.exe"
SERVER_PID=""
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }
ok() { echo "    [PASS] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "    [FAIL] $*"; exit 1; }
assert_eq() { # desc actual expected
    if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (实际: [$2] / 期望: [$3])"; fi
}

# jget: 从最近一次响应里取字段。表达式形如 d["details"]["ext"]（eval 仅供本脚本自用）
jget() {
    "$PY" -c '
import json, sys
with open(sys.argv[2], encoding="utf-8") as f:
    d = json.load(f)
v = eval(sys.argv[1])
print(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
' "$1" "$LAST_RESP"
}

show_resp() { # 打印请求描述与最近一次响应(美化 JSON)
    echo "    \$ $1   =>   HTTP $STATUS"
    "$PY" -c '
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.dumps(json.load(f), ensure_ascii=False, indent=2))
' "$LAST_RESP" | sed 's/^/        /'
}

# gen_file: 生成确定字节数的纯 ASCII 样例文件(断言依赖字节数精确)
gen_file() { # path total_bytes
    "$PY" -c '
import sys
path, total = sys.argv[1], int(sys.argv[2])
line = "lab05 sample line | 0123456789 abcdefghijklmnopqrstuvwxyz\n"  # 58 ASCII 字符 = 58 字节
n, rem = divmod(total, len(line))
with open(path, "w", encoding="ascii", newline="") as f:
    f.write(line * n + line[:rem])
' "$1" "$2"
    local actual
    actual="$(wc -c < "$1" | tr -d ' ')"
    [ "$actual" -eq "$2" ] || fail "样例生成字节数不符: $actual != $2"
}

post_form() { # path data —— curl -d 默认就是 application/x-www-form-urlencoded
    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' -X POST "$BASE$1" -d "$2")"
    show_resp "curl -X POST $1 -d '$2'"
}

post_json() { # path data —— 显式 application/json
    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' -X POST "$BASE$1" -H 'Content-Type: application/json' -d "$2")"
    show_resp "curl -X POST $1 -H 'Content-Type: application/json' -d '$2'"
}

post_files() { # path field=@file [field=@file ...] —— curl -F 生成 multipart/form-data
    local path="$1"; shift
    local args=(-sS -o "$LAST_RESP" -w '%{http_code}' -X POST "$BASE$path")
    local f
    for f in "$@"; do args+=(-F "$f"); done
    STATUS="$(curl "${args[@]}")"
    # 展示行只留文件名, 完整路径在 .run/ 下, 太长会淹没输出
    show_resp "curl -X POST $path $(printf -- '-F %s ' "$@" | sed -E 's|@[^ ;"]*/|@|g')"
}

start_server() {
    mkdir -p "$RUN_DIR"
    : > "$SERVER_LOG"
    echo "  启动 uvicorn main:app --port $PORT, 日志: $SERVER_LOG"
    "$UVICORN" main:app --app-dir "$LAB_DIR" --host 127.0.0.1 --port "$PORT" >>"$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
    local i
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null "$BASE/files" 2>/dev/null; then
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
    banner "lab 05 · 表单与文件上传 —— Content-Type 决定谁来解析请求体"
    echo "  场景: 资料上传 API。两类表单体: application/x-www-form-urlencoded(纯键值对)"
    echo "  与 multipart/form-data(键值对+文件混装); 两种文件参数: bytes 全量进内存,"
    echo "  UploadFile 分块流式读。两条防线全部手写: 大小上限 200KB(413)、扩展名白名单(415)。"

    start_server

    step "[1/7] urlencoded 表单: curl -d 的默认 Content-Type"
    echo "  -d 发送时 curl 自动加 application/x-www-form-urlencoded, 请求体是"
    echo "  name=alice&age=30 这样的键值对串。Form() 声明的字段由表单解析器"
    echo "  取出并转成 str/int, 所以服务端能直接做整数运算。"
    post_form /profiles 'name=alice&age=30'
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "name 被解析为 alice" "$(jget 'd["name"]')" "alice"
    assert_eq "age 被解析为 int 30" "$(jget 'd["age"]')" "30"
    assert_eq "服务端做了整数运算: age_next_year=31" "$(jget 'd["age_next_year"]')" "31"

    step "[2/7] multipart 单文件上传: UploadFile 元数据 + 1MB 分块落盘"
    echo "  -F 发送时 curl 生成 multipart/form-data 报文。300KB 样例小于 1MB,"
    echo "  一块读完(chunks=1); 响应里的 size 是服务端边读边数的落盘字节数。"
    gen_file "$SAMPLE_300K" $((300 * 1024))
    post_files /upload "file=@$SAMPLE_300K"
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "filename 保留原始文件名" "$(jget 'd["filename"]')" "sample_300k.txt"
    assert_eq "content_type 是 curl 按扩展名声明的 text/plain" "$(jget 'd["content_type"]')" "text/plain"
    assert_eq "size = 307200 字节" "$(jget 'd["size"]')" "307200"
    assert_eq "300KB < 1MB, 一块读完" "$(jget 'd["chunks"]')" "1"
    cmp -s "$SAMPLE_300K" "$UPLOAD_DIR/sample_300k.txt" \
        && ok "cmp 校验: 落盘文件与源文件逐字节一致" \
        || fail "落盘文件与源文件不一致"

    step "[3/7] 分块读取证据: 2.5MB 文件 = 3 块(1MB + 1MB + 0.5MB)"
    echo "  save_stream 每次最多读 1MB, EOF 前每次 read 计一块, 2.5MB 必然 3 块。"
    echo "  端点内存占用始终是\"一块的大小\", 与文件总大小无关——这是流式的意义。"
    gen_file "$SAMPLE_2_5M" $((2560 * 1024))
    post_files /upload "file=@$SAMPLE_2_5M"
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "size = 2621440 字节" "$(jget 'd["size"]')" "2621440"
    assert_eq "chunks = 3" "$(jget 'd["chunks"]')" "3"
    cmp -s "$SAMPLE_2_5M" "$UPLOAD_DIR/sample_2_5m.txt" \
        && ok "cmp 校验: 2.5MB 文件落盘后逐字节一致" \
        || fail "2.5MB 文件落盘内容不一致"

    step "[4/7] 大小防线: 300KB > 200KB 上限 -> 413 信封, 且是\"中途断\""
    echo "  FastAPI 没有内置的请求体大小上限, 防线是 main.py 手写的: 边读边计数,"
    echo "  超限立即停。64KB 一块, 读满 4 块(262144B)时第一次超过 204800B -> 掐断;"
    echo "  read_bytes=262144 小于文件实际 307200, 证明请求没被读完就断了。"
    gen_file "$GUARD_300K" $((300 * 1024))
    post_files /upload-guard "file=@$GUARD_300K"
    assert_eq "状态码 413" "$STATUS" "413"
    assert_eq "code = FILE_TOO_LARGE" "$(jget 'd["code"]')" "FILE_TOO_LARGE"
    assert_eq "read_bytes = 262144(4 块 x 64KB, 中途断)" "$(jget 'd["details"]["read_bytes"]')" "262144"
    assert_eq "max_bytes = 204800" "$(jget 'd["details"]["max_bytes"]')" "204800"
    if [ ! -e "$UPLOAD_DIR/guard_300k.txt" ]; then
        ok "半成品已删除: 磁盘上没有 guard_300k.txt"
    else
        fail "半成品仍留在磁盘上"
    fi

    step "[5/7] 扩展名白名单: .exe -> 415, 一个字节都不复制"
    echo "  白名单检查在读文件内容之前: 扩展名不在 .txt/.csv/.md 里直接 415。"
    echo "  注意 content_type 是客户端声称的, 可以伪造; 生产环境要结合文件头"
    echo "  魔数(如 PNG 开头的固定 8 字节)一起校验, 见 README 的坑。"
    printf 'MZ..not really a windows binary\n' > "$EVIL_EXE"
    post_files /upload-guard "file=@$EVIL_EXE"
    assert_eq "状态码 415" "$STATUS" "415"
    assert_eq "code = UNSUPPORTED_MEDIA_TYPE" "$(jget 'd["code"]')" "UNSUPPORTED_MEDIA_TYPE"
    assert_eq "details.ext = .exe" "$(jget 'd["details"]["ext"]')" ".exe"

    step "[6/7] 多文件上传: list[UploadFile] + 一次 curl -F -F -F"
    echo "  同名表单字段重复出现, list[UploadFile] 收齐全部, 响应是逐文件的列表。"
    echo "  curl 只认识少数扩展名的 MIME 映射, 所以这里用 -F 的 ;type= 显式声明——"
    echo "  content_type 从头到尾都是\"客户端说了算\"的声明, 服务端只当元数据记录。"
    printf 'id,name\n1,alice\n2,bob\n' > "$RUN_DIR/roster.csv"
    printf '# notes\nlab05 multi upload\n' > "$RUN_DIR/notes.md"
    printf 'weekly report body\n' > "$RUN_DIR/report.txt"
    post_files /upload-multi "files=@$RUN_DIR/roster.csv;type=text/csv" "files=@$RUN_DIR/notes.md;type=text/markdown" "files=@$RUN_DIR/report.txt"
    assert_eq "状态码 200" "$STATUS" "200"
    assert_eq "count = 3" "$(jget 'd["count"]')" "3"
    assert_eq "第 1 个是 roster.csv" "$(jget 'd["files"][0]["filename"]')" "roster.csv"
    assert_eq "第 2 个 content_type = text/markdown" "$(jget 'd["files"][1]["content_type"]')" "text/markdown"
    echo "  磁盘清单(GET /files): /upload 成功 2 个 + /upload-multi 成功 3 个 = 5,"
    echo "  防线端点的 413/415 一个文件都没留下。"
    STATUS="$(curl -sS -o "$LAST_RESP" -w '%{http_code}' "$BASE/files")"
    show_resp "curl $BASE/files"
    assert_eq "GET /files 状态码 200" "$STATUS" "200"
    assert_eq "落盘文件数 = 5" "$(jget 'd["count"]')" "5"

    step "[7/7] Content-Type 决定解析器: 拿错类型喂端点, 两边都是 422, 病因不同"
    echo "  (a) JSON 端点收到表单体: 端点声明了 Pydantic 模型, FastAPI 按 JSON 读体,"
    echo "      拿到的却是 multipart 原始字节串 -> 不是 dict, model_attributes_type;"
    echo "      响应里的 input 字段会原样回显收到的报文, 能看到 boundary 长什么样。"
    post_files /profiles-json "name=alice" "age=30"
    assert_eq "(a) 状态码 422" "$STATUS" "422"
    assert_eq "(a) 错误类型 model_attributes_type" "$(jget 'd["detail"][0]["type"]')" "model_attributes_type"
    echo "  (b) 表单端点收到 JSON: Starlette 的 request.form() 只认两种表单"
    echo "      Content-Type, 收到 application/json 一律返回空表 -> 字段 missing。"
    post_json /profiles '{"name":"alice","age":30}'
    assert_eq "(b) 状态码 422" "$STATUS" "422"
    assert_eq "(b) loc = body/name" "$(jget 'd["detail"][0]["loc"]')" '["body", "name"]'
    assert_eq "(b) 错误类型 missing" "$(jget 'd["detail"][0]["type"]')" "missing"
    echo "  (c) 对照组: 类型配对正确时, 同一对端点都正常返回 200。"
    post_json /profiles-json '{"name":"bob","age":18}'
    assert_eq "(c) JSON 配 JSON -> 200" "$STATUS" "200"
    post_form /profiles 'name=bob&age=18'
    assert_eq "(c) 表单配表单 -> 200" "$STATUS" "200"

    echo
    echo "  章节速查: [1] urlencoded 200 | [2] 300KB 1 块 | [3] 2.5MB 3 块"
    echo "            [4] 413 中途断(262144B) | [5] 415 白名单 | [6] 多文件 3 个"
    echo "            [7] 错配 422 两种病因: 非 dict 输入 / 字段 missing"
    echo "  服务端日志保留在 .run/server.log, 上传目录: $UPLOAD_DIR"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

cmd_start() {
    start_server
    echo "  试一试:"
    echo "    curl -X POST $BASE/profiles -d 'name=alice&age=30'"
    echo "    curl -X POST $BASE/upload -F 'file=@/path/to/note.txt'"
    echo "    curl -X POST $BASE/upload-guard -F 'file=@/path/to/big.exe'"
    echo "    curl $BASE/files"
    echo "  停止: Ctrl-C"
    wait "$SERVER_PID"
}

cmd_clean() {
    stop_server
    rm -rf "$RUN_DIR"
    rm -rf "$UPLOAD_DIR"
    echo "已停止服务并清理 $RUN_DIR 与 $UPLOAD_DIR"
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
