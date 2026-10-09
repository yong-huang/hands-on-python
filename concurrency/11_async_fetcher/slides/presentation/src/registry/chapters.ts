import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import BackgroundChapter from "../chapters/02-background/Background";
import { narrations as backgroundNarrations } from "../chapters/02-background/narrations";
import ThreeToolsChapter from "../chapters/03-three-tools/ThreeTools";
import { narrations as threeToolsNarrations } from "../chapters/03-three-tools/narrations";
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
    title: "片头：一道又快又稳的考题",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "background",
    title: "三种抓法从哪来",
    narrations: backgroundNarrations,
    Component: BackgroundChapter,
  },
  {
    id: "three-tools",
    title: "三件套逐件拆",
    narrations: threeToolsNarrations,
    Component: ThreeToolsChapter,
  },
  {
    id: "live-demo",
    title: "真机实验：三模型对决",
    narrations: liveDemoNarrations,
    Component: LiveDemoChapter,
  },
  {
    id: "mechanism",
    title: "拆开看：三行代码与测试服务",
    narrations: mechanismNarrations,
    Component: MechanismChapter,
  },
  {
    id: "pitfalls",
    title: "四个真实踩过的坑",
    narrations: pitfallsNarrations,
    Component: PitfallsChapter,
  },
  {
    id: "qa-closing",
    title: "最后一问与收尾",
    narrations: qaClosingNarrations,
    Component: QaClosingChapter,
  },
];
