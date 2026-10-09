import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import LegbChapter from "../chapters/02-legb/Legb";
import { narrations as legbNarrations } from "../chapters/02-legb/narrations";
import ClosureCellChapter from "../chapters/03-closure-cell/ClosureCell";
import { narrations as closureCellNarrations } from "../chapters/03-closure-cell/narrations";
import NonlocalChapter from "../chapters/04-nonlocal/Nonlocal";
import { narrations as nonlocalNarrations } from "../chapters/04-nonlocal/narrations";
import LateBindingChapter from "../chapters/05-late-binding/LateBinding";
import { narrations as lateBindingNarrations } from "../chapters/05-late-binding/narrations";
import ClosingChapter from "../chapters/06-closing/Closing";
import { narrations as closingNarrations } from "../chapters/06-closing/narrations";

/**
 * Order = order of presentation.
 *
 * Each chapter MUST provide a `narrations: Narration[]` array. Its length
 * is the chapter's step count — there is no `totalSteps` to maintain
 * separately. This guarantees the audio synthesis pipeline, the runtime
 * stepper, and the chapter `.tsx` switch on `step` cannot drift apart.
 *
 * Visual styling (color, fonts) comes entirely from the active theme —
 * chapters never hard-code palette / font names. See THEMES.md.
 */
export const CHAPTERS: ChapterDef[] = [
  {
    id: "hook",
    title: "活过函数的变量",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "legb",
    title: "LEGB 查找链与就近遮蔽",
    narrations: legbNarrations,
    Component: LegbChapter,
  },
  {
    id: "closure-cell",
    title: "自由变量与 cell",
    narrations: closureCellNarrations,
    Component: ClosureCellChapter,
  },
  {
    id: "nonlocal",
    title: "nonlocal vs global",
    narrations: nonlocalNarrations,
    Component: NonlocalChapter,
  },
  {
    id: "late-binding",
    title: "迟绑定陷阱与修复",
    narrations: lateBindingNarrations,
    Component: LateBindingChapter,
  },
  {
    id: "closing",
    title: "回望装饰器与 CTA",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
