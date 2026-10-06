#!/usr/bin/env bash
# FastAPI 系列的公共环境脚本：一次性解决所有实验的依赖阻塞。
# 用法: ./scripts/load_resources.sh          # 创建 .venv 并安装依赖
#       ./scripts/load_resources.sh check    # 只检查不安装
set -euo pipefail
cd "$(dirname "$0")/.."

PY=".venv/bin/python"
NEEDED=(fastapi uvicorn httpx pytest multipart sqlalchemy aiosqlite alembic jwt bcrypt pydantic_settings gunicorn)

check() {
    local missing=0
    for mod in "${NEEDED[@]}"; do
        "$PY" -c "import $mod" 2>/dev/null || { echo "缺少模块: $mod"; missing=1; }
    done
    if [ "$missing" -eq 0 ]; then
        echo "环境就绪："
        "$PY" - <<'EOF'
import sys, fastapi, uvicorn, httpx
print(f"  Python {sys.version.split()[0]} | fastapi {fastapi.__version__} | uvicorn {uvicorn.__version__} | httpx {httpx.__version__}")
EOF
    fi
    return "$missing"
}

if [ "${1:-install}" = "check" ]; then
    check
else
    if [ ! -x "$PY" ]; then
        echo "创建虚拟环境 .venv ..."
        python3 -m venv .venv
    fi
    echo "安装/更新依赖（fastapi + uvicorn[standard] + httpx + pytest + python-multipart + sqlalchemy[asyncio] + aiosqlite + alembic + pyjwt + bcrypt + pydantic-settings + gunicorn）..."
    .venv/bin/pip install -q --disable-pip-version-check \
        fastapi "uvicorn[standard]" httpx pytest python-multipart \
        "sqlalchemy[asyncio]" aiosqlite alembic pyjwt bcrypt pydantic-settings gunicorn
    check
fi
