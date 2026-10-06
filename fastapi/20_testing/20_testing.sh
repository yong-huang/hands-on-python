#!/usr/bin/env bash
# Lab 20 · 测试体系 —— 主演示脚本。
# 用法: ./20_testing.sh demo | all
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
PY="$ROOT/.venv/bin/python"

step() { echo; echo "=====> [$1] $2"; }

run_layer() {  # 跑一层测试并保留逐条输出
    echo "---- $1 ----"
    "$PY" -m pytest "$2" -v --no-header 2>&1 | grep -E "PASSED|FAILED|XFAIL|SKIPPED|passed|failed"
}

demo() {
    step "1/4" "测试金字塔:底层单元 → 中层端点 → 顶层契约"
    cat <<'T'
  金字塔从下往上:
    test_unit.py     纯函数直测,不起 HTTP(最快最厚,8 条含 parametrize)
    test_api.py      TestClient 发真实请求,断言状态码与结构(中层)
    test_contract.py 契约 = 响应 keys 清单(顶层,当前 1 条 xfail:抓泄漏)
  共享夹具在 conftest.py:app / client / clean_state(autouse 状态隔离)。
T

    step "2/4" "底层:单元测试(纯函数直测)"
    run_layer "unit" test_unit.py

    step "3/4" "中层:端点行为测试(TestClient 进程内)"
    run_layer "api" test_api.py

    step "4/4" "顶层:契约测试(1 条 xfail —— 故意抓内部字段泄漏)"
    run_layer "contract" test_contract.py
    cat <<'N'
  xfail(strict=True) 的语义:这条用例现在必须失败(实现泄漏 internal_cost),
  修掉泄漏后去掉 xfail,它转正为常规契约测试 —— 测试先行的红→绿节奏。
  实测:契约用例确实如预期 XFAIL;若实现被"顺手修好"而忘删 xfail,
  strict 会把 XPASS 判为失败,逼你正式转正。

N
    echo "演示完成: 三层金字塔全部跑通(7 passed, 1 xfailed)。"
}

all() { demo; }
main() {
    local target="${1:-all}"
    case "${target}" in
        demo|all) demo ;;
        *) echo "可用: demo | all" >&2; exit 1 ;;
    esac
}
main "$@"
