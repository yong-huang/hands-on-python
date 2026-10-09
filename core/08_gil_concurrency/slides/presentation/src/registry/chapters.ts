import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import GilChapter from "../chapters/02-gil/Gil";
import { narrations as gilNarrations } from "../chapters/02-gil/narrations";
import BenchChapter from "../chapters/03-bench/Bench";
import { narrations as benchNarrations } from "../chapters/03-bench/narrations";
import ReleaseChapter from "../chapters/04-release/Release";
import { narrations as releaseNarrations } from "../chapters/04-release/narrations";
import ModelsChapter from "../chapters/05-models/Models";
import { narrations as modelsNarrations } from "../chapters/05-models/narrations";
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
    title: "4 线程能跑满 CPU 吗",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "gil",
    title: "GIL 的让锁机制",
    narrations: gilNarrations,
    Component: GilChapter,
  },
  {
    id: "bench",
    title: "真机三组对照",
    narrations: benchNarrations,
    Component: BenchChapter,
  },
  {
    id: "release",
    title: "什么时候释放 GIL",
    narrations: releaseNarrations,
    Component: ReleaseChapter,
  },
  {
    id: "models",
    title: "三种并发模型选型",
    narrations: modelsNarrations,
    Component: ModelsChapter,
  },
  {
    id: "closing",
    title: "为什么不去掉 GIL",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
