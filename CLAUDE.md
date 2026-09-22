# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Python hands-on tutorial series ("hands-on-python") focused on Python core language internals: 20 self-contained labs under `core/`. Lab conventions follow the `hands-on-series` skill (`~/.agents/skills/hands-on-series/SKILL.md`) — read that skill before creating new labs or restructuring existing ones.

Content language is Chinese (正文中文，命令/代码/术语保留英文).

## Structure

- `LICENSE` — MIT.
- `README.md` — series index: intro, environment requirements, lab table, learning path, how to run.
- `docs/` — per-series planning/checklist documents (root keeps only README): `python_interview.md`, `python_concurrency.md`, `python_web_frameworks.md`.
- `core/NN_topic/` — 20 numbered labs (01_decorator_factory … 20_itertools_func), one Python core-mechanics topic each. The directory is named `core/` (not the skill's `labs/`) — a deliberate deviation to match this repo's theme.
- `concurrency/NN_topic/` — second series (2026-09): 16 Python concurrency labs with the same 五件套 conventions, planned by `docs/python_concurrency.md` (learning-list skill) and built via the hands-on-series skill. Same README 8-section order and diagram pipeline.
- `web/NN_topic/` — third series (2026-09): 20 Python web-framework labs (WSGI/HTTP/cookie foundations → Flask → FastAPI → Django → comparison/capstone), planned by `docs/python_web_frameworks.md`. Same 五件套 conventions. Stage-1 labs (01-03) are stdlib-only; framework labs (04+) run in `web/.venv` — setup commands and the 2026-09-10 smoke-tested version matrix live in docs/python_web_frameworks.md 环境配置.
- Each lab is a "五件套":
  - `README.md` — tutorial in the fixed 8-section order (see below)
  - `<topic>.py` — the main demo script AND the learning material itself; self-contained, **zero third-party imports**
  - `images/<topic>.json` — the diagram source (typed JSON IR; edit + revalidate to iterate)
  - `images/<topic>.html` — interactive diagram (self-contained HTML; trace animation, dark/light themes, zh-CN UI)
  - `images/<topic>.svg` — dual-theme vector export, embedded in README §2

## README section order (fixed across all 20 labs)

H1 `# NN · 主题名：一句话副标题` + 引言 blockquote (bridging from the previous lab), then:
`## 1. 为什么需要它` → `## 2. 总览：核心机制一图看懂` (embedded SVG + 交互版链接: Pages 在线 + 本地相对路径) → `## 3. 快速开始` → `## 4. 核心概念` → `## 5. 关键代码解析` (why-comments + 坑清单) → `## 6. 文件结构` (tree must match disk) → `## 7. 深入要点` (4–5 问答式考点) → `## 8. 总结` (+ next-lab link).

## Diagrams (Archify)

Diagram content is designed from what the main script teaches (机制/流程/状态). CLI: `node ~/.agents/skills/archify/bin/archify.mjs <validate|deliver|visual-check> <type> <json> ... --quality showcase --json` (types seen in this repo: workflow / sequence / lifecycle / dataflow). Workflow per change: edit JSON → `validate <type> <json> --quality showcase --json` (9 checks, 0 errors 0 warnings) → `deliver <type> <json> <html> --quality showcase --json` → `visual-check <html> --json` → delete `*.visual-check.*` sidecars → re-export SVG and re-center. SVG export + centering scripts live in the hands-on-series skill (`~/.agents/skills/hands-on-series/scripts/`: `export-svg.mjs` / `export-batch.mjs`, then `center-svg.mjs` + `check-centering.mjs` — every SVG must pass centering check before commit). Hard-won constraints: desktop readability vs page height pinches viewBox width; sequence message y spacing needs ≥28px; keep canvas wide-and-flat (aspect < 1.6 vertical overflows 1440×900).

## Running

```bash
cd core/01_decorator_factory
python3 decorator_factory.py      # demo only, zero third-party deps
open images/decorator_factory.html   # interactive diagram in browser
```

Main scripts print step-by-step demo output (中文注释 explaining each step). There is no test suite, no linter config, and no package manifest; verify changes by running the lab script and checking `python3 -m py_compile`.

## Conventions for new/modified labs

- Lab dirs: `NN_short_name/` (two digits + lowercase snake_case). Never insert numbers in the middle; append or renumber wholly.
- Main script named after the topic (`09_magic_methods/magic_methods.py`); diagrams never live in it — always `images/<topic>.{json,html,svg}`.
- "诚实预期" (honest expectations): if something can't be fully demonstrated in the local environment, say so explicitly in the doc rather than faking success.
- Verify with `python3 -m py_compile <topic>.py` and a real full demo run before considering a lab done; static checks don't replace running it.
- Commit messages: English, imperative mood, bullet points in body.
