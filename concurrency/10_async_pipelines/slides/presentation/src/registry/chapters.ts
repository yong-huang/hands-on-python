import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import BackgroundChapter from "../chapters/02-background/Background";
import { narrations as backgroundNarrations } from "../chapters/02-background/narrations";
import MentalModelChapter from "../chapters/03-mental-model/MentalModel";
import { narrations as mentalModelNarrations } from "../chapters/03-mental-model/narrations";
import WhenToUseChapter from "../chapters/04-when-to-use/WhenToUse";
import { narrations as whenToUseNarrations } from "../chapters/04-when-to-use/narrations";
import LiveDemoChapter from "../chapters/05-live-demo/LiveDemo";
import { narrations as liveDemoNarrations } from "../chapters/05-live-demo/narrations";
import DemoLimitsChapter from "../chapters/06-demo-limits/DemoLimits";
import { narrations as demoLimitsNarrations } from "../chapters/06-demo-limits/narrations";
import MechanismChapter from "../chapters/07-mechanism/Mechanism";
import { narrations as mechanismNarrations } from "../chapters/07-mechanism/narrations";
import AtomicityChapter from "../chapters/08-atomicity/Atomicity";
import { narrations as atomicityNarrations } from "../chapters/08-atomicity/narrations";
import PitfallsChapter from "../chapters/09-pitfalls/Pitfalls";
import { narrations as pitfallsNarrations } from "../chapters/09-pitfalls/narrations";
import QaClosingChapter from "../chapters/10-qa-closing/QaClosing";
import { narrations as qaClosingNarrations } from "../chapters/10-qa-closing/narrations";

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
    title: "片头：三个实测数字",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "background",
    title: "线程版流水线的痛",
    narrations: backgroundNarrations,
    Component: BackgroundChapter,
  },
  {
    id: "mental-model",
    title: "心智模型：传送带与三条纪律",
    narrations: mentalModelNarrations,
    Component: MentalModelChapter,
  },
  {
    id: "when-to-use",
    title: "什么活儿值得搭",
    narrations: whenToUseNarrations,
    Component: WhenToUseChapter,
  },
  {
    id: "live-demo",
    title: "真机实验·上：单线程跑流水线",
    narrations: liveDemoNarrations,
    Component: LiveDemoChapter,
  },
  {
    id: "demo-limits",
    title: "真机实验·下：闸门与背压",
    narrations: demoLimitsNarrations,
    Component: DemoLimitsChapter,
  },
  {
    id: "mechanism",
    title: "拆机制：队列 · 闸门 · 背压",
    narrations: mechanismNarrations,
    Component: MechanismChapter,
  },
  {
    id: "atomicity",
    title: "最核心的一行代码",
    narrations: atomicityNarrations,
    Component: AtomicityChapter,
  },
  {
    id: "pitfalls",
    title: "四个真实踩过的坑",
    narrations: pitfallsNarrations,
    Component: PitfallsChapter,
  },
  {
    id: "qa-closing",
    title: "两个迁移问答与收尾",
    narrations: qaClosingNarrations,
    Component: QaClosingChapter,
  },
];
