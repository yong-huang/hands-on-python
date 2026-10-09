import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import BackgroundChapter from "../chapters/02-background/Background";
import { narrations as backgroundNarrations } from "../chapters/02-background/narrations";
import MentalModelChapter from "../chapters/03-mental-model/MentalModel";
import { narrations as mentalModelNarrations } from "../chapters/03-mental-model/narrations";
import WhenToUseChapter from "../chapters/04-when-to-use/WhenToUse";
import { narrations as whenToUseNarrations } from "../chapters/04-when-to-use/narrations";
import BoundariesChapter from "../chapters/05-boundaries/Boundaries";
import { narrations as boundariesNarrations } from "../chapters/05-boundaries/narrations";
import DemoLazyChapter from "../chapters/06-demo-lazy/DemoLazy";
import { narrations as demoLazyNarrations } from "../chapters/06-demo-lazy/narrations";
import SingleThreadChapter from "../chapters/07-single-thread/SingleThread";
import { narrations as singleThreadNarrations } from "../chapters/07-single-thread/narrations";
import RealConcurrencyChapter from "../chapters/08-real-concurrency/RealConcurrency";
import { narrations as realConcurrencyNarrations } from "../chapters/08-real-concurrency/narrations";
import MechanismChapter from "../chapters/09-mechanism/Mechanism";
import { narrations as mechanismNarrations } from "../chapters/09-mechanism/narrations";
import PitfallsChapter from "../chapters/10-pitfalls/Pitfalls";
import { narrations as pitfallsNarrations } from "../chapters/10-pitfalls/narrations";
import ClosingChapter from "../chapters/11-closing/Closing";
import { narrations as closingNarrations } from "../chapters/11-closing/narrations";

/**
 * Order = order of presentation.
 *
 * Each chapter MUST provide a `narrations: Narration[]` array. Its length
 * is the chapter's step count — there is no `totalSteps` to maintain
 * separately. This guarantees the audio synthesis pipeline, the runtime
 * stepper, and the chapter `.tsx` switch on `step` cannot drift apart.
 */
export const CHAPTERS: ChapterDef[] = [
  { id: "hook", title: "片头：一行都没跑的调用", narrations: hookNarrations, Component: HookChapter },
  { id: "background", title: "线程方案在哪里撞墙", narrations: backgroundNarrations, Component: BackgroundChapter },
  { id: "mental-model", title: "两个词与一句话心智模型", narrations: mentalModelNarrations, Component: MentalModelChapter },
  { id: "when-to-use", title: "三种该交给协程的活", narrations: whenToUseNarrations, Component: WhenToUseChapter },
  { id: "boundaries", title: "三种别用与三者对比", narrations: boundariesNarrations, Component: BoundariesChapter },
  { id: "demo-lazy", title: "真机实验：调用 ≠ 执行", narrations: demoLazyNarrations, Component: DemoLazyChapter },
  { id: "single-thread", title: "await 让出的是控制权", narrations: singleThreadNarrations, Component: SingleThreadChapter },
  { id: "real-concurrency", title: "await 链 vs create_task", narrations: realConcurrencyNarrations, Component: RealConcurrencyChapter },
  { id: "mechanism", title: "拆开看：run 与两张表", narrations: mechanismNarrations, Component: MechanismChapter },
  { id: "pitfalls", title: "五个真坑", narrations: pitfallsNarrations, Component: PitfallsChapter },
  { id: "closing", title: "常用入口与收尾", narrations: closingNarrations, Component: ClosingChapter },
];
