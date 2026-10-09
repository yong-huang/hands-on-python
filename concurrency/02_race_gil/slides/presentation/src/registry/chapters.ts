import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import BackgroundChapter from "../chapters/02-background/Background";
import { narrations as backgroundNarrations } from "../chapters/02-background/narrations";
import WhiteboardChapter from "../chapters/03-whiteboard/Whiteboard";
import { narrations as whiteboardNarrations } from "../chapters/03-whiteboard/narrations";
import LiveDemoChapter from "../chapters/04-live-demo/LiveDemo";
import { narrations as liveDemoNarrations } from "../chapters/04-live-demo/narrations";
import CheckThenActChapter from "../chapters/05-check-then-act/CheckThenAct";
import { narrations as checkThenActNarrations } from "../chapters/05-check-then-act/narrations";
import GilBoundsChapter from "../chapters/06-gil-bounds/GilBounds";
import { narrations as gilBoundsNarrations } from "../chapters/06-gil-bounds/narrations";
import PitfallsChapter from "../chapters/07-pitfalls/Pitfalls";
import { narrations as pitfallsNarrations } from "../chapters/07-pitfalls/narrations";
import WhyLockChapter from "../chapters/08-why-lock/WhyLock";
import { narrations as whyLockNarrations } from "../chapters/08-why-lock/narrations";

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
  { id: "hook", title: "片头：会出错，但说不清", narrations: hookNarrations, Component: HookChapter },
  { id: "background", title: "老假设是怎么碎的", narrations: backgroundNarrations, Component: BackgroundChapter },
  { id: "whiteboard", title: "白板类比与两条事实", narrations: whiteboardNarrations, Component: WhiteboardChapter },
  { id: "live-demo", title: "真机实测：裸 += 不丢，隔调用丢 78%", narrations: liveDemoNarrations, Component: LiveDemoChapter },
  { id: "check-then-act", title: "先检查后行动：一次就是事故", narrations: checkThenActNarrations, Component: CheckThenActChapter },
  { id: "gil-bounds", title: "GIL 边界：挡计算，不挡等待", narrations: gilBoundsNarrations, Component: GilBoundsChapter },
  { id: "pitfalls", title: "四个实测中的坑", narrations: pitfallsNarrations, Component: PitfallsChapter },
  { id: "why-lock", title: "为什么还要锁 + 收尾", narrations: whyLockNarrations, Component: WhyLockChapter },
];
