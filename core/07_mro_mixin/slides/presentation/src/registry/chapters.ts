import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import DiamondChapter from "../chapters/02-diamond/Diamond";
import { narrations as diamondNarrations } from "../chapters/02-diamond/narrations";
import MixinChapter from "../chapters/03-mixin/Mixin";
import { narrations as mixinNarrations } from "../chapters/03-mixin/narrations";
import PitfallsChapter from "../chapters/04-pitfalls/Pitfalls";
import { narrations as pitfallsNarrations } from "../chapters/04-pitfalls/narrations";
import ClosingChapter from "../chapters/05-closing/Closing";
import { narrations as closingNarrations } from "../chapters/05-closing/narrations";

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
    title: "super() 不是父类",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "diamond",
    title: "钻石继承与 C3",
    narrations: diamondNarrations,
    Component: DiamondChapter,
  },
  {
    id: "mixin",
    title: "Mixin 协作链",
    narrations: mixinNarrations,
    Component: MixinChapter,
  },
  {
    id: "pitfalls",
    title: "断链与四原则",
    narrations: pitfallsNarrations,
    Component: PitfallsChapter,
  },
  {
    id: "closing",
    title: "一句话与系列回收",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
