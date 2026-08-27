# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Python hands-on tutorial series ("hands-on-python") focused on interview-grade Python language internals. `PROJECT_TEMPLATE.md` at the repo root is the authoritative spec for this project family — read it before creating or modifying labs.

Content language is Chinese (正文中文，命令/代码/术语保留英文).

## Structure

- `README.md` — series index: intro, environment requirements, lab table, learning path.
- `PROJECT_TEMPLATE.md` — the master template/spec governing lab design, script conventions, and workflow.
- `scripts/setup_env.sh` — common env script: idempotent matplotlib install, CN mirrors first with fallback to official PyPI.
- `.gitignore` — `.DS_Store`, `__pycache__/`, `*.pyc`, `.venv/`, etc.
- `interview/NN_topic/` — 20 numbered labs (01_decorator_factory … 20_itertools_func), one Python interview topic each. The directory is named `interview/` (not the template's `labs/`) — a deliberate deviation to match this repo's theme.
- Each lab is a "五件套" (five-piece set) adapted to pure Python:
  - `README.md` — tutorial doc (引言 / 文件结构 / 核心概念 / 实操演示 / 预期结果与陷阱 / 小结)
  - `<topic>.py` — the main demo script AND the learning material itself; self-contained, **no third-party imports** (demo runs without matplotlib)
  - `scripts/gen_diagram.py` — matplotlib diagram generator; outputs into `images/`
  - `images/<topic>.png` — generated diagrams committed to the repo

## Running

```bash
cd interview/01_decorator_factory
python3 decorator_factory.py      # demo only, no third-party deps
python3 scripts/gen_diagram.py       # regenerate images/*.png (needs matplotlib)
```

Main scripts print step-by-step demo output (中文注释 explaining each step). `gen_diagram.py` uses a fixed header (`SCRIPT_DIR` → `os.chdir(LAB_ROOT)` + `sys.path.insert(0, LAB_ROOT)`) so it works from any cwd; some import real benchmark data from the main module (e.g. 08 does `from gil_concurrency import bench_cpu, bench_io`).

Chinese font handling: `gen_diagram.py` probes `fm.fontManager.ttflist` for PingFang SC / Heiti SC / STHeiti / SimHei and sets `font.sans-serif` accordingly — keep this pattern in new plotting code. matplotlib `Agg` backend, dpi=150, `bbox_inches="tight"`.

There is no test suite, no linter config, and no package manifest; verify changes by running the lab script and checking `python3 -m py_compile`.

## Conventions for new/modified labs

- Lab dirs: `NN_short_name/` (two digits + lowercase snake_case). Never insert numbers in the middle; append or renumber wholly.
- Main script named after the topic (`09_magic_methods/magic_methods.py`); plotting code never lives in it — always in `scripts/gen_diagram.py` writing to `images/`.
- Every script must run cleanly from any working directory (use the `SCRIPT_DIR` + `os.chdir`/absolute-path pattern).
- Diagrams must match what the README describes; commit generated PNGs (~100–300KB each).
- README image links must point to `images/*.png` and the 文件结构 tree must match what's on disk.
- "诚实预期" (honest expectations): if something can't be fully demonstrated in the local environment, say so explicitly in the doc rather than faking success.
- Verify with `python3 -m py_compile <topic>.py scripts/gen_diagram.py`, a real full demo run, and a `gen_diagram.py` run before considering a lab done; static checks don't replace running it.
- Commit messages: English, imperative mood, bullet points in body.
