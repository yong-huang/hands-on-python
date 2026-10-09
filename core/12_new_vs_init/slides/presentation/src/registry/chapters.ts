import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import TwoStepsChapter from "../chapters/02-two-steps/TwoSteps";
import { narrations as twoStepsNarrations } from "../chapters/02-two-steps/narrations";

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
    title: "一个对象的诞生",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "two-steps",
    title: "管生与管养：两步生命周期",
    narrations: twoStepsNarrations,
    Component: TwoStepsChapter,
  },
];
