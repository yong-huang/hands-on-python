# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Python hands-on tutorial series ("hands-on-python") focused on interview-grade Python language internals. `PROJECT_TEMPLATE.md` at the repo root is the authoritative spec for this project family — read it before creating or modifying labs.

Content language is Chinese (正文中文，命令/代码/术语保留英文).

## Structure

- `README.md` — series index: intro, environment requirements, lab table, learning path.
- `PROJECT_TEMPLATE.md` — the master template/spec governing lab design, script conventions, and workflow.
- `scripts/setup_env.sh` — legacy helper (idempotent matplotlib install, CN mirrors first); nothing currently requires it.
- `.gitignore` — `.DS_Store`, `__pycache__/`, `*.pyc`, `.venv/`, etc.
- `interview/NN_topic/` — 20 numbered labs (01_decorator_factory … 20_itertools_func), one Python interview topic each. The directory is named `interview/` (not the template's `labs/`) — a deliberate deviation to match this repo's theme.
- Each lab is a "五件套" (five-piece set):
  - `README.md` — tutorial doc (引言 / 文件结构 / 核心概念 / 实操演示 / 预期结果与陷阱 / 小结)
  - `<topic>.py` — the main demo script AND the learning material itself; self-contained, **zero third-party imports**
  - `images/<topic>.archify.html` — interactive diagram (self-contained HTML; trace animation, dark/light themes, zh-CN UI), generated with [Archify](/Users/hyhit/Desktop/workspace/github/archify) from the typed JSON source
  - `images/<topic>.archify.json` — the diagram source (typed JSON IR; edit + revalidate to iterate)

## Diagrams (Archify)

Diagram content is designed from what the main script teaches (机制/流程/状态), not from old artwork. CLI: `node /Users/hyhit/Desktop/workspace/github/archify/archify/bin/archify.mjs <validate|deliver|visual-check> <type> <json> ... --quality showcase`. Workflow per change: edit JSON → `validate <type> <json> --quality showcase --json` (9 checks, 0 errors 0 warnings) → `deliver <type> <json> <html> --quality showcase --json` → `visual-check <html> --json` → delete `*.visual-check.*` sidecars. Hard-won constraints (see auto-memory `archify.md` for the full list): desktop readability vs page height pinches viewBox width; lifecycle sublabels render at 7px and usually must be dropped; sequence message y spacing needs ≥28px and y bounds depend on viewBox height.

## Running

```bash
cd interview/01_decorator_factory
python3 decorator_factory.py      # demo only, zero third-party deps
open images/decorator_factory.archify.html   # interactive diagram in browser
```

Main scripts print step-by-step demo output (中文注释 explaining each step).

There is no test suite, no linter config, and no package manifest; verify changes by running the lab script and checking `python3 -m py_compile`.

## Conventions for new/modified labs

- Lab dirs: `NN_short_name/` (two digits + lowercase snake_case). Never insert numbers in the middle; append or renumber wholly.
- Main script named after the topic (`09_magic_methods/magic_methods.py`); diagrams never live in it — always `images/<topic>.archify.{html,json}`.
- README embeds the interactive diagram via a link in 预期结果与陷阱; the 文件结构 tree must match what's on disk.
- "诚实预期" (honest expectations): if something can't be fully demonstrated in the local environment, say so explicitly in the doc rather than faking success.
- Verify with `python3 -m py_compile <topic>.py` and a real full demo run before considering a lab done; static checks don't replace running it.
- Commit messages: English, imperative mood, bullet points in body.
