# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Python hands-on tutorial series ("hands-on-python") focused on Python core language internals: 23 self-contained labs under `core/`. Lab conventions follow the `hands-on-series` skill (`~/.agents/skills/hands-on-series/SKILL.md`) — read that skill before creating new labs or restructuring existing ones.

Content language is Chinese (正文中文，命令/代码/术语保留英文).

## Structure

- `LICENSE` — MIT.
- `README.md` — series index: intro, environment requirements, lab table, learning path, how to run.
- `docs/` — per-series planning/checklist documents (root keeps only README): `python_interview.md`, `python_concurrency.md`, `python_web_frameworks.md`.
- `core/NN_topic/` — 23 numbered labs (01_decorator_factory … 23_exceptions), one Python core-mechanics topic each. The directory is named `core/` (not the skill's `labs/`) — a deliberate deviation to match this repo's theme.
- `concurrency/NN_topic/` — second series (2026-09): 16 Python concurrency labs, planned by `docs/python_concurrency.md` (learning-list skill) and built via the hands-on-series skill. Same five-section README order as `core/`.
- `web/NN_topic/` — third series (2026-09): 20 Python web-framework labs (WSGI/HTTP/cookie foundations → Flask → FastAPI → Django → comparison/capstone), planned by `docs/python_web_frameworks.md`. Same five-section README order as `core/`. Stage-1 labs (01-03) are stdlib-only; framework labs (04+) run in `web/.venv` — setup commands and the 2026-09-10 smoke-tested version matrix live in docs/python_web_frameworks.md 环境配置.
- Each lab is a "五件套":
  - `README.md` — tutorial in the fixed 8-section order (see below)
  - `<topic>.py` — the main demo script AND the learning material itself; self-contained, **zero third-party imports**
  - `images/<topic>.json` — the diagram source (typed JSON IR; edit + revalidate to iterate)
  - `images/<topic>.html` — interactive diagram (self-contained HTML; trace animation, dark/light themes, zh-CN UI)
  - `images/<topic>.svg` — dual-theme vector export (historical; core/ READMEs no longer embed diagrams)

## README section order (core/ series, five sections)

H1 `# NN · 标题` + 引言 blockquote (self-contained; no previous-lab references, no 面试 wording), then bare headers:
`## What`（机制是什么 + 一句话心智模型）→ `## Why`（动机与痛点）→ `## How`（运行命令 + 真实输出逐字 + 诚实预期 + 实现代码）→ `## Deep Dive`（机制精讲 + 踩坑清单，与 How 去重）→ `## Q&A`（深入要点，与正文去重）。No 总结, no 文件结构, no embedded diagrams; labs are self-contained (no 上一实验/上一篇 narrative).

## Diagrams (Archify, currently unreferenced)

core/ READMEs no longer embed diagrams; `core/*/images/` files are kept on disk but unreferenced. Diagram content is designed from what the main script teaches (机制/流程/状态). CLI: `node ~/.agents/skills/archify/bin/archify.mjs <validate|deliver|visual-check> <type> <json> ... --quality showcase --json` (types seen in this repo: workflow / sequence / lifecycle / dataflow). Workflow per change: edit JSON → `validate <type> <json> --quality showcase --json` (9 checks, 0 errors 0 warnings) → `deliver <type> <json> <html> --quality showcase --json` → `visual-check <html> --json` → delete `*.visual-check.*` sidecars → re-export SVG and re-center. SVG export + centering scripts live in the hands-on-series skill (`~/.agents/skills/hands-on-series/scripts/`: `export-svg.mjs` / `export-batch.mjs`, then `center-svg.mjs` + `check-centering.mjs` — every SVG must pass centering check before commit). Hard-won constraints: desktop readability vs page height pinches viewBox width; sequence message y spacing needs ≥28px; keep canvas wide-and-flat (aspect < 1.6 vertical overflows 1440×900).

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
