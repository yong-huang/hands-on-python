import type { ChapterDef } from "./types";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import Hook from "../chapters/01-hook/Hook";
import { narrations as backgroundNarrations } from "../chapters/02-background/narrations";
import Background from "../chapters/02-background/Background";
import { narrations as mentalModelNarrations } from "../chapters/03-mental-model/narrations";
import MentalModel from "../chapters/03-mental-model/MentalModel";
import { narrations as liveDemoNarrations } from "../chapters/04-live-demo/narrations";
import LiveDemo from "../chapters/04-live-demo/LiveDemo";
import { narrations as mechanismNarrations } from "../chapters/05-mechanism/narrations";
import Mechanism from "../chapters/05-mechanism/Mechanism";
import { narrations as unifyNarrations } from "../chapters/06-unify/narrations";
import Unify from "../chapters/06-unify/Unify";
import { narrations as pitfallsNarrations } from "../chapters/07-pitfalls/narrations";
import Pitfalls from "../chapters/07-pitfalls/Pitfalls";
import { narrations as qaClosingNarrations } from "../chapters/08-qa-closing/narrations";
import QaClosing from "../chapters/08-qa-closing/QaClosing";

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
  { id: "hook", title: "片头：三口气与两个角色", narrations: hookNarrations, Component: Hook },
  { id: "background", title: "两条老路与三堵墙", narrations: backgroundNarrations, Component: Background },
  { id: "mental-model", title: "一张欠条与一个取货口", narrations: mentalModelNarrations, Component: MentalModel },
  { id: "live-demo", title: "真机实验：四节输出", narrations: liveDemoNarrations, Component: LiveDemo },
  { id: "mechanism", title: "四个机制与一条边界", narrations: mechanismNarrations, Component: Mechanism },
  { id: "unify", title: "统一接口的落地与选后端", narrations: unifyNarrations, Component: Unify },
  { id: "pitfalls", title: "五个真实踩过的坑", narrations: pitfallsNarrations, Component: Pitfalls },
  { id: "qa-closing", title: "最后一问与收尾", narrations: qaClosingNarrations, Component: QaClosing },
];
