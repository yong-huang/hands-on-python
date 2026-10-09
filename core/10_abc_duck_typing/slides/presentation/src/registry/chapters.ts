import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import DuckChapter from "../chapters/02-duck/Duck";
import { narrations as duckNarrations } from "../chapters/02-duck/narrations";
import AbcChapter from "../chapters/03-abc/Abc";
import { narrations as abcNarrations } from "../chapters/03-abc/narrations";
import ProtocolChapter from "../chapters/04-protocol/Protocol";
import { narrations as protocolNarrations } from "../chapters/04-protocol/narrations";
import CompareChapter from "../chapters/05-compare/Compare";
import { narrations as compareNarrations } from "../chapters/05-compare/narrations";
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
    title: "super() 不是父类",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "duck",
    title: "Duck Typing 只看行为",
    narrations: duckNarrations,
    Component: DuckChapter,
  },
  {
    id: "abc",
    title: "ABC 强制约束",
    narrations: abcNarrations,
    Component: AbcChapter,
  },
  {
    id: "protocol",
    title: "Protocol 结构化子类型",
    narrations: protocolNarrations,
    Component: ProtocolChapter,
  },
  {
    id: "compare",
    title: "失败点时机与选型",
    narrations: compareNarrations,
    Component: CompareChapter,
  },
  {
    id: "closing",
    title: "系列回收",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
