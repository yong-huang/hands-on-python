import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import WhatIsChapter from "../chapters/02-what-is/WhatIs";
import { narrations as whatIsNarrations } from "../chapters/02-what-is/narrations";
import WhyChapter from "../chapters/03-why/Why";
import { narrations as whyNarrations } from "../chapters/03-why/narrations";
import FamilyChapter from "../chapters/04-family/Family";
import { narrations as familyNarrations } from "../chapters/04-family/narrations";
import StdlibChapter from "../chapters/05-stdlib/Stdlib";
import { narrations as stdlibNarrations } from "../chapters/05-stdlib/narrations";
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
    title: "一个 with 治「忘了还」",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "what-is",
    title: "with 是什么",
    narrations: whatIsNarrations,
    Component: WhatIsChapter,
  },
  {
    id: "why",
    title: "忘了还能出多大的事，with 是标准答案",
    narrations: whyNarrations,
    Component: WhyChapter,
  },
  {
    id: "family",
    title: "两条实现路",
    narrations: familyNarrations,
    Component: FamilyChapter,
  },
  {
    id: "stdlib",
    title: "标准库现成货",
    narrations: stdlibNarrations,
    Component: StdlibChapter,
  },
  {
    id: "closing",
    title: "为什么要搞懂它",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
