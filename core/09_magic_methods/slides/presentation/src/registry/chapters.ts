import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import ReprStrChapter from "../chapters/02-repr-str/ReprStr";
import { narrations as reprStrNarrations } from "../chapters/02-repr-str/narrations";
import EqHashChapter from "../chapters/03-eq-hash/EqHash";
import { narrations as eqHashNarrations } from "../chapters/03-eq-hash/narrations";
import OpsChapter from "../chapters/04-ops/Ops";
import { narrations as opsNarrations } from "../chapters/04-ops/narrations";
import ShortcutsChapter from "../chapters/05-shortcuts/Shortcuts";
import { narrations as shortcutsNarrations } from "../chapters/05-shortcuts/narrations";
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
    title: "TypeError 与内存地址",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "repr-str",
    title: "__repr__ 与 __str__",
    narrations: reprStrNarrations,
    Component: ReprStrChapter,
  },
  {
    id: "eq-hash",
    title: "__eq__ 与 __hash__ 契约",
    narrations: eqHashNarrations,
    Component: EqHashChapter,
  },
  {
    id: "ops",
    title: "运算符重载",
    narrations: opsNarrations,
    Component: OpsChapter,
  },
  {
    id: "shortcuts",
    title: "两件套减样板",
    narrations: shortcutsNarrations,
    Component: ShortcutsChapter,
  },
  {
    id: "closing",
    title: "何时用与系列回收",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
