import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import BackgroundChapter from "../chapters/02-background/Background";
import { narrations as backgroundNarrations } from "../chapters/02-background/narrations";
import ChannelsChapter from "../chapters/03-channels/Channels";
import { narrations as channelsNarrations } from "../chapters/03-channels/narrations";
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
    title: "片头：三个没答案的问题",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "background",
    title: "共享是怎么丢掉的",
    narrations: backgroundNarrations,
    Component: BackgroundChapter,
  },
  {
    id: "channels",
    title: "四条通道与三条路线",
    narrations: channelsNarrations,
    Component: ChannelsChapter,
  },
  {
    id: "live-demo",
    title: "真机实验：三段输出逐一现形",
    narrations: liveDemoNarrations,
    Component: LiveDemoChapter,
  },
  {
    id: "mechanism",
    title: "拆开看：三条路线的实现与纪律",
    narrations: mechanismNarrations,
    Component: MechanismChapter,
  },
  {
    id: "pitfalls",
    title: "五个真实的坑",
    narrations: pitfallsNarrations,
    Component: PitfallsChapter,
  },
  {
    id: "qa-closing",
    title: "选型问答与收尾",
    narrations: qaClosingNarrations,
    Component: QaClosingChapter,
  },
];
