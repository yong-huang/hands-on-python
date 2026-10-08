import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import WhatIsChapter from "../chapters/02-what-is/WhatIs";
import { narrations as whatIsNarrations } from "../chapters/02-what-is/narrations";
import WhyCuttingChapter from "../chapters/03-why-cutting/WhyCutting";
import { narrations as whyCuttingNarrations } from "../chapters/03-why-cutting/narrations";
import WhyAnswerChapter from "../chapters/04-why-answer/WhyAnswer";
import { narrations as whyAnswerNarrations } from "../chapters/04-why-answer/narrations";
import FamilyChapter from "../chapters/05-family/Family";
import { narrations as familyNarrations } from "../chapters/05-family/narrations";
import StdlibChapter from "../chapters/06-stdlib/Stdlib";
import { narrations as stdlibNarrations } from "../chapters/06-stdlib/narrations";
import ClosingChapter from "../chapters/07-closing/Closing";
import { narrations as closingNarrations } from "../chapters/07-closing/narrations";

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
    title: "一个 @ 治复制粘贴",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "what-is",
    title: "装饰器是什么",
    narrations: whatIsNarrations,
    Component: WhatIsChapter,
  },
  {
    id: "why-cutting",
    title: "为什么需要它：横切逻辑",
    narrations: whyCuttingNarrations,
    Component: WhyCuttingChapter,
  },
  {
    id: "why-answer",
    title: "装饰器是标准答案",
    narrations: whyAnswerNarrations,
    Component: WhyAnswerChapter,
  },
  {
    id: "family",
    title: "家族地图：工厂与五种形态",
    narrations: familyNarrations,
    Component: FamilyChapter,
  },
  {
    id: "stdlib",
    title: "现成货与标配动作",
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
