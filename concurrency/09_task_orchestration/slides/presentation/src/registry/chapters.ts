import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import SolutionChapter from "../chapters/02-solution/Solution";
import { narrations as solutionNarrations } from "../chapters/02-solution/narrations";
import WhenToUseChapter from "../chapters/03-when-to-use/WhenToUse";
import { narrations as whenToUseNarrations } from "../chapters/03-when-to-use/narrations";
import LiveDemoChapter from "../chapters/04-live-demo/LiveDemo";
import { narrations as liveDemoNarrations } from "../chapters/04-live-demo/narrations";
import MechanismChapter from "../chapters/05-mechanism/Mechanism";
import { narrations as mechanismNarrations } from "../chapters/05-mechanism/narrations";
import BoundariesChapter from "../chapters/06-boundaries/Boundaries";
import { narrations as boundariesNarrations } from "../chapters/06-boundaries/narrations";
import PitfallsChapter from "../chapters/07-pitfalls/Pitfalls";
import { narrations as pitfallsNarrations } from "../chapters/07-pitfalls/narrations";
import QaClosingChapter from "../chapters/08-qa-closing/QaClosing";
import { narrations as qaClosingNarrations } from "../chapters/08-qa-closing/narrations";

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
    title: "片头：挂出去的任务，谁管死活",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "solution",
    title: "解法：结构化并发与 TaskGroup",
    narrations: solutionNarrations,
    Component: SolutionChapter,
  },
  {
    id: "when-to-use",
    title: "局部工具与选型",
    narrations: whenToUseNarrations,
    Component: WhenToUseChapter,
  },
  {
    id: "live-demo",
    title: "真机实验：三节实测",
    narrations: liveDemoNarrations,
    Component: LiveDemoChapter,
  },
  {
    id: "mechanism",
    title: "机制：取消如何传播",
    narrations: mechanismNarrations,
    Component: MechanismChapter,
  },
  {
    id: "boundaries",
    title: "边界与铁证",
    narrations: boundariesNarrations,
    Component: BoundariesChapter,
  },
  {
    id: "pitfalls",
    title: "四个真实的坑",
    narrations: pitfallsNarrations,
    Component: PitfallsChapter,
  },
  {
    id: "qa-closing",
    title: "两问与收尾",
    narrations: qaClosingNarrations,
    Component: QaClosingChapter,
  },
];
