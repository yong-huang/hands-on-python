import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import BackgroundChapter from "../chapters/02-background/Background";
import { narrations as backgroundNarrations } from "../chapters/02-background/narrations";
import ConveyorChapter from "../chapters/03-conveyor/Conveyor";
import { narrations as conveyorNarrations } from "../chapters/03-conveyor/narrations";
import LiveDemoChapter from "../chapters/04-live-demo/LiveDemo";
import { narrations as liveDemoNarrations } from "../chapters/04-live-demo/narrations";
import MechanismChapter from "../chapters/05-mechanism/Mechanism";
import { narrations as mechanismNarrations } from "../chapters/05-mechanism/narrations";
import PitfallsChapter from "../chapters/06-pitfalls/Pitfalls";
import { narrations as pitfallsNarrations } from "../chapters/06-pitfalls/narrations";
import QaClosingChapter from "../chapters/07-qa-closing/QaClosing";
import { narrations as qaClosingNarrations } from "../chapters/07-qa-closing/narrations";

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
    title: "片头：锁给不出答案的三问",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "background",
    title: "范式从哪来：共享+锁 对比 消息传递",
    narrations: backgroundNarrations,
    Component: BackgroundChapter,
  },
  {
    id: "conveyor",
    title: "带回执的传送带：queue.Queue 与部件地图",
    narrations: conveyorNarrations,
    Component: ConveyorChapter,
  },
  {
    id: "live-demo",
    title: "真机实验：三个场景逐一现形",
    narrations: liveDemoNarrations,
    Component: LiveDemoChapter,
  },
  {
    id: "mechanism",
    title: "拆开看：回执、毒丸与背压阀门",
    narrations: mechanismNarrations,
    Component: MechanismChapter,
  },
  {
    id: "pitfalls",
    title: "五个真实踩过的坑",
    narrations: pitfallsNarrations,
    Component: PitfallsChapter,
  },
  {
    id: "qa-closing",
    title: "快问快答与收尾",
    narrations: qaClosingNarrations,
    Component: QaClosingChapter,
  },
];
