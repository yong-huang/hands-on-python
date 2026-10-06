"""用 SQLite 的 PRAGMA table_info 验证 articles 表的真实列结构。

用法:
  python verify_schema.py <db路径> --expect id,title,content [--forbid views,author] [--dflt views=0]

PRAGMA table_info 逐列返回 (cid, name, type, notnull, dflt_value, pk)。
它是"不经过 ORM、直接问数据库"的证据: 模型里写了什么不算数,
库里真实有什么才算数 —— 迁移是否生效, 以这里的输出为准。
"""
import argparse
import sqlite3
import sys


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("db", help="SQLite 数据库文件路径")
    ap.add_argument("--expect", default="", help="必须存在的列, 逗号分隔")
    ap.add_argument("--forbid", default="", help="必须不存在的列, 逗号分隔")
    ap.add_argument("--dflt", default="", help="断言某列的数据库端默认值, 如 views=0")
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    rows = con.execute("PRAGMA table_info(articles)").fetchall()
    con.close()

    print(f"    $ PRAGMA table_info(articles)   <-   {args.db}")
    if not rows:
        print("        [FAIL] articles 表不存在")
        return 1
    print(f"        {'cid':>3}  {'name':<9}{'type':<14}{'notnull':<8}{'dflt_value':<12}pk")
    for cid, name, ctype, notnull, dflt, pk in rows:
        print(f"        {cid:>3}  {name:<9}{ctype:<14}{notnull:<8}{str(dflt):<12}{pk}")

    cols = [r[1] for r in rows]
    dflts = {r[1]: r[4] for r in rows}
    fails = 0

    def check(label: str, ok: bool, detail: str = "") -> None:
        nonlocal fails
        extra = f"  ({detail})" if detail else ""
        print(f"        [{'PASS' if ok else 'FAIL'}] {label}{extra}")
        if not ok:
            fails += 1

    expect = [c for c in args.expect.split(",") if c]
    forbid = [c for c in args.forbid.split(",") if c]
    if expect:
        missing = [c for c in expect if c not in cols]
        check(f"列齐: {','.join(expect)}", not missing,
              f"共 {len(cols)} 列" if not missing else f"缺 {missing}")
    if forbid:
        leaked = [c for c in forbid if c in cols]
        check(f"无列: {','.join(forbid)}", not leaked,
              "" if not leaked else f"仍存在 {leaked}")
    if args.dflt:
        col, _, want = args.dflt.partition("=")
        raw = dflts.get(col)
        # SQLite 会按 DDL 原样记录默认值文本, '0' 带引号; 去引号后比较
        got = "" if raw is None else str(raw).strip("'\"")
        check(f"server_default 生效: {col} 的 dflt_value = {want}", got == want,
              f"实测 {raw!r}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
