#!/usr/bin/env bash
# lab 16 · Alembic 迁移 —— 主演示脚本
#
# 用法:
#   ./16_alembic_migrations.sh prepare  # 现场搭建 lab16_workspace: alembic init + env.py 接线 + v1 models
#   ./16_alembic_migrations.sh demo     # 教学演示: 重新 prepare + 跑完 6 个章节(含确定性断言)
#   ./16_alembic_migrations.sh clean    # 删除 lab16_workspace(迁移工程与数据库一并删除)
#   ./16_alembic_migrations.sh all      # clean + demo + clean 全生命周期
#
# 场景: "文章"表演进。第 1 个迁移建 articles(id/title/content); 模型加 views/author
# 后 autogenerate 出第 2 个迁移, upgrade 后用 SQLite PRAGMA 验证新列真实存在,
# 再 downgrade -1 验证列消失 —— 迁移链双向可走, history 始终是线性历史。
# 迁移脚本(versions/*.py)由 alembic 现场生成, revision 哈希每次运行都不同。
set -euo pipefail
cd "$(dirname "$0")"

LAB_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$LAB_DIR/.." && pwd)"
PY="$ROOT_DIR/.venv/bin/python"
ALEMBIC="$ROOT_DIR/.venv/bin/alembic"
WORKSPACE="$LAB_DIR/lab16_workspace"
DB="$WORKSPACE/lab16.db"
PASS_COUNT=0

banner() { echo; echo "===================================================================="; echo "  $*"; echo "===================================================================="; }
step() { echo; echo "---- $*"; }

# finish_py: 打印 python/工具段输出, 统计 [PASS]; rc 非 0 说明有断言失败, 立即退出
finish_py() {
    local out="$1" rc="$2" n
    printf '%s\n' "$out"
    n="$(grep -c '\[PASS\]' <<<"$out" || true)"
    PASS_COUNT=$((PASS_COUNT + n))
    if [ "$rc" -ne 0 ]; then
        echo "    [FAIL] 本节断言未全部通过"
        exit 1
    fi
}

# run_verify: 跑 verify_schema.py 对真实数据库做 PRAGMA 断言(参数原样透传)
run_verify() {
    local rc=0 out
    out="$("$PY" "$LAB_DIR/verify_schema.py" "$@")" || rc=$?
    finish_py "$out" "$rc"
}

# alembic 命令统一在 workspace 里执行: env.py 从那里 import models
alembic_cmd() { (cd "$WORKSPACE" && "$ALEMBIC" "$@"); }

on_exit() {
    local rc=$?
    if [ "$rc" -ne 0 ]; then
        echo
        echo "!! 演示中断(exit=$rc), lab16_workspace 保留在 $WORKSPACE 便于排查; 排查后执行 $0 clean"
    fi
    exit "$rc"
}
trap on_exit EXIT

cmd_clean() {
    rm -rf "$WORKSPACE"
    echo "已删除 $WORKSPACE(迁移工程与实验数据库)"
}

prepare() {
    banner "prepare: 现场搭建迁移工程 lab16_workspace"
    rm -rf "$WORKSPACE"
    mkdir -p "$WORKSPACE"

    step "prepare[1/3] alembic init: 生成 alembic.ini 与 alembic/ 目录"
    (cd "$WORKSPACE" && "$ALEMBIC" init alembic)

    step "prepare[2/3] 接线: 改 alembic.ini 的 sqlalchemy.url, 改 env.py 的 target_metadata"
    cp "$WORKSPACE/alembic/env.py" "$WORKSPACE/alembic/env.py.orig"
    sed -i '' "s|^sqlalchemy.url = .*|sqlalchemy.url = sqlite:///${DB}|" "$WORKSPACE/alembic.ini"
    echo "  alembic.ini 的改动(数据库指到本实验的 SQLite 文件, 写绝对路径, 与执行目录无关):"
    grep -n "^sqlalchemy.url" "$WORKSPACE/alembic.ini" | sed 's/^/    /'
    # env.py 注入: target_metadata = None -> import 模型并接上 Base.metadata
    # 这一步是本实验的接线核心: autogenerate 与 upgrade 都从这里拿到"模型长什么样"
    "$PY" - "$WORKSPACE/alembic/env.py" <<'PYEOF'
import sys

path = sys.argv[1]
src = open(path, encoding="utf-8").read()
NEW = (
    "import sys\n"
    "from pathlib import Path\n"
    "\n"
    "sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # 让 env.py 能 import 工程根的 models.py\n"
    "from models import Base  # noqa: E402\n"
    "\n"
    "target_metadata = Base.metadata"
)
assert "target_metadata = None" in src, "env.py 模板里没找到 target_metadata = None"
open(path, "w", encoding="utf-8").write(src.replace("target_metadata = None", NEW, 1))
PYEOF
    echo "  env.py 的改动(diff, 把模型一侧接进迁移系统):"
    diff -u "$WORKSPACE/alembic/env.py.orig" "$WORKSPACE/alembic/env.py" | sed 's/^/    /' || true
    rm "$WORKSPACE/alembic/env.py.orig"

    step "prepare[3/3] 写初始 models.py(v1: 只有建表的三个字段)"
    cat > "$WORKSPACE/models.py" <<'PYEOF'
from sqlalchemy import String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """全部模型的公共基类; Base.metadata 是表定义的注册表, autogenerate 靠它和数据库对比。"""


class Article(Base):
    __tablename__ = "articles"

    # ---- 第 1 个迁移(create articles table): 建表 ----
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
PYEOF
    sed 's/^/    /' "$WORKSPACE/models.py"
    echo
    echo "  接线完成: models.Base.metadata(模型) --env.py--> alembic(迁移) --sqlalchemy.url--> lab16.db"
}

demo() {
    banner "lab 16 · Alembic 迁移 —— 模型变了, 表怎么跟着变"
    echo "  场景: 文章项目演进两步。第 1 步 models.py 定义 Article(id/title/content),"
    echo "  autogenerate 对比模型与数据库, 生成建表迁移并 upgrade; 第 2 步模型加 views/author,"
    echo "  autogenerate 出加列迁移。每一步之后都用 SQLite PRAGMA 直接问数据库: 列真的存在吗?"
    echo "  最后 downgrade -1 时光倒流, 验证列真的消失了。本实验不起 web 服务, 纯 CLI 演示。"

    prepare

    # ------------------------------------------------------------------
    step "[1/6] 目录职责: alembic init 出来的每个文件管什么"
    echo "  prepare 的三件事就是本实验的全部地基: init 出目录、改 env.py 接模型、"
    echo "  把 sqlalchemy.url 指到 SQLite。先认认 workspace 里每个文件的职责:"
    ( cd "$WORKSPACE" && find . -name __pycache__ -prune -o -print ) | sort | sed 's|^\.$|    lab16_workspace/|; s|^\./|    lab16_workspace/|'
    cat <<'TABLE'

    文件                      职责
    ------------------------  --------------------------------------------------------
    alembic.ini               总配置: sqlalchemy.url 指向哪个数据库(prepare 已改)
    alembic/env.py            接线处: target_metadata = Base.metadata 把模型交给
                              迁移系统; upgrade 时也在这里按 url 建引擎连库
    alembic/script.py.mako    迁移脚本模板: autogenerate 照它生成新文件
    alembic/versions/         迁移脚本存放处: 一个文件 = 迁移链上的一环(现在为空)
    models.py                 ORM 模型(我们写的, 不属于 alembic)
TABLE
    echo "  versions/ 现在是空的: 还没有任何迁移, 数据库文件也不存在 —— upgrade 时才创建。"

    # ------------------------------------------------------------------
    step "[2/6] 第一个迁移: autogenerate 对比模型与库, 生成建表脚本"
    echo "  当前状态: models.py 里有 Article(id/title/content), 数据库端什么都没有。"
    echo "  autogenerate 做的事: 读 target_metadata 里的模型定义, 连上库把实际表结构"
    echo "  reflect(从数据库反向读出结构)回来, 两边对比, 差异写成 upgrade/downgrade:"
    alembic_cmd revision --autogenerate -m "create articles table"
    V1_FILE="$(ls "$WORKSPACE"/alembic/versions/*.py | head -n1)"
    echo "  生成的迁移脚本全文(文件名里的哈希是随机 revision, 每次生成都不同):"
    sed 's/^/    /' "$V1_FILE"
    echo "  upgrade head: 沿迁移链走到最新, 执行 upgrade() 里的 op.*:"
    alembic_cmd upgrade head
    echo "  用 PRAGMA 直接问数据库(不经 ORM): 表存在, 且只有初始三列:"
    run_verify "$DB" --expect id,title,content --forbid views,author

    # ------------------------------------------------------------------
    step "[3/6] 模型演进: models.py 加 views/author -> 第二个迁移"
    echo "  需求来了: 文章要记录浏览量和作者。改模型 —— 把本目录的最终形态 models.py"
    echo "  拷进 workspace, diff 出来就多了一个字段块:"
    cp "$WORKSPACE/models.py" "$WORKSPACE/models_v1.py.bak"
    cp "$LAB_DIR/models.py" "$WORKSPACE/models.py"
    diff -u "$WORKSPACE/models_v1.py.bak" "$WORKSPACE/models.py" | sed '1,2d; s/^/    /' || true
    echo "  再次 autogenerate: 这次模型比库多了两列, 差异就是两条 add_column:"
    alembic_cmd revision --autogenerate -m "add views and author to articles"
    V2_FILE="$(ls -t "$WORKSPACE"/alembic/versions/*.py | head -n1)"
    sed 's/^/    /' "$V2_FILE"
    echo "  upgrade head 后, PRAGMA 验证: 5 列齐, views 的数据库端默认值是 0:"
    alembic_cmd upgrade head
    run_verify "$DB" --expect id,title,content,views,author --dflt views=0
    echo "  数据层面的证据: 裸 SQL 插一行(不带 views/author), 读回来看默认值是否生效:"
    local rc=0 out
    out="$("$PY" - "$DB" <<'PYEOF'
import sqlite3
import sys

con = sqlite3.connect(sys.argv[1])
cur = con.execute(
    "INSERT INTO articles (title, content) VALUES (?, ?)",
    ("迁移验证", "这一行只提供 title/content, views/author 交给数据库端默认值"),
)
row = con.execute(
    "SELECT title, views, author FROM articles WHERE id = ?", (cur.lastrowid,)
).fetchone()
con.commit()
con.close()
print(f"    插入后读回: title={row[0]!r}  views={row[1]!r}  author={row[2]!r}")
ok = row[1] == 0 and row[2] is None
print(f"        [{'PASS' if ok else 'FAIL'}] views 取到 server_default 的 0, author 保持 NULL")
raise SystemExit(0 if ok else 1)
PYEOF
)" || rc=$?
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[4/6] 时光倒流: downgrade -1 回退一个迁移, 再前进恢复"
    echo "  迁移链是双向的: downgrade -1 执行上一个迁移的 downgrade() —— 对第二个迁移"
    echo "  来说就是两条 drop_column, 刚加的列连同数据一起消失:"
    alembic_cmd downgrade -1
    echo "  PRAGMA 验证: 新列真的没了, 库回到初始三列:"
    run_verify "$DB" --expect id,title,content --forbid views,author
    echo "  此时 alembic current 不再是 head, 而是停在第一个迁移:"
    alembic_cmd current
    echo "  再 upgrade head 回到最新, 列回来了:"
    alembic_cmd upgrade head
    run_verify "$DB" --expect id,title,content,views,author --dflt views=0

    # ------------------------------------------------------------------
    step "[5/6] 迁移链: history 是线性历史, current 指向 head"
    echo "  每个迁移脚本头上有两个哈希: revision(自己)与 down_revision(上一个),"
    echo "  链就是这样串起来的; history 沿 down_revision 从新到旧打印:"
    alembic_cmd history
    echo "  current 要连库读 alembic_version 表才知道库走到哪了(所以有 INFO 日志):"
    alembic_cmd current
    echo "  断言: 恰好 2 个节点, 线性成链, current == head, 库里的 version_num 与之一致:"
    rc=0
    out="$("$PY" - "$WORKSPACE" "$ALEMBIC" <<'PYEOF'
import pathlib
import re
import sqlite3
import subprocess
import sys

ws = pathlib.Path(sys.argv[1])
alembic = sys.argv[2]
fails = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global fails
    extra = f"  ({detail})" if detail else ""
    print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
    if not ok:
        fails += 1


def run(*args: str) -> list[str]:
    r = subprocess.run([alembic, *args], cwd=ws, capture_output=True, text=True)
    # 过滤掉 INFO 日志行, 只留命令本身的输出
    return [ln for ln in r.stdout.splitlines() if not ln.startswith("INFO")]


history = run("history")
heads = run("heads")
current = run("current")
print(f"    $ alembic history -> {len(history)} 行:")
for ln in history:
    print(f"        {ln}")
print(f"    $ alembic heads   -> {heads[0]}")
print(f"    $ alembic current -> {current[0]}")

# 从 versions/*.py 里解析出 revision 链
pat_rev = re.compile(r"^revision(?::\s*str)?\s*=\s*['\"]([^'\"]+)['\"]", re.M)
pat_down = re.compile(r"^down_revision[^=]*=\s*(?:['\"]([^'\"]*)['\"]|None)", re.M)
nodes = []
for p in sorted((ws / "alembic" / "versions").glob("*.py")):
    text = p.read_text(encoding="utf-8")
    rev = pat_rev.search(text).group(1)
    m = pat_down.search(text)
    nodes.append((rev, m.group(1) if m else None))

root = [n for n in nodes if not n[1]]
child = [n for n in nodes if n[1]]
check("恰好 2 个迁移节点", len(nodes) == 2, f"实测 {len(nodes)} 个")
check("恰好 1 个根节点(down_revision 为空)", len(root) == 1)
check("线性成链: 第二个迁移的 down_revision 指向第一个",
      len(child) == 1 and bool(root) and child[0][1] == root[0][0],
      f"{child[0][1]} == {root[0][0]}" if child and root else "")
check("只有一个 head(无分叉)", len(heads) == 1, f"heads={heads}")
check("current 停在 head", current == heads and "(head)" in current[0],
      f"current={current}")

con = sqlite3.connect(ws / "lab16.db")
(db_ver,) = con.execute("SELECT version_num FROM alembic_version").fetchone()
con.close()
check("库内 alembic_version 表 == current", db_ver == current[0].split()[0],
      f"version_num={db_ver}")
raise SystemExit(1 if fails else 0)
PYEOF
)" || rc=$?
    finish_py "$out" "$rc"

    # ------------------------------------------------------------------
    step "[6/6] 章节速查: 本实验验证过的东西"
    cat <<'TABLE'
    +------------+-------------------------------------------------------------------+
    | 章节       | 验证了什么                                                        |
    +------------+-------------------------------------------------------------------+
    | [1] 目录   | env.py 接模型(target_metadata), alembic.ini 接库(sqlalchemy.url)  |
    | [2] 建表   | autogenerate 生成的脚本 + upgrade 后 PRAGMA 见到初始三列          |
    | [3] 加列   | 模型 diff 两行字段 -> 第二个迁移 add_column, PRAGMA 见到新列      |
    |            | 且 server_default='0' 写进 DDL(dflt_value='0', 裸 SQL 插入也生效) |
    | [4] 回退   | downgrade -1 后 PRAGMA 里新列消失, upgrade head 又恢复            |
    | [5] 迁移链 | 恰好 2 个节点线性成链, current==head, 库内 alembic_version 同步   |
    +------------+-------------------------------------------------------------------+
TABLE
    echo "  一句话收束: 模型改在 Python 一侧, 表结构改在数据库一侧, alembic 把两边"
    echo "  的差异记成可重放可回退的脚本链 —— 迁移脚本进版本库, 数据库不进。"
    banner "演示完成: $PASS_COUNT 项断言全部通过"
}

case "${1:-demo}" in
    prepare) prepare ;;
    demo) demo ;;
    clean) cmd_clean ;;
    all)
        cmd_clean
        demo
        cmd_clean
        ;;
    *)
        echo "用法: $0 prepare|demo|clean|all"
        exit 1
        ;;
esac
