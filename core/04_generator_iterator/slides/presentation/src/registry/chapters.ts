import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import WhatIsChapter from "../chapters/02-what-is/WhatIs";
import { narrations as whatIsNarrations } from "../chapters/02-what-is/narrations";
import IterGenChapter from "../chapters/03-iter-gen/IterGen";
import { narrations as iterGenNarrations } from "../chapters/03-iter-gen/narrations";
import SendChapter from "../chapters/04-send/Send";
import { narrations as sendNarrations } from "../chapters/04-send/narrations";
import YieldFromChapter from "../chapters/05-yield-from/YieldFrom";
import { narrations as yieldFromNarrations } from "../chapters/05-yield-from/narrations";
import LazyChapter from "../chapters/06-lazy/Lazy";
import { narrations as lazyNarrations } from "../chapters/06-lazy/narrations";
import MemoryChapter from "../chapters/07-memory/Memory";
import { narrations as memoryNarrations } from "../chapters/07-memory/narrations";
import ClosingChapter from "../chapters/08-closing/Closing";
import { narrations as closingNarrations } from "../chapters/08-closing/narrations";

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
    title: "两个麻烦，一个 yield",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "what-is",
    title: "可暂停的函数",
    narrations: whatIsNarrations,
    Component: WhatIsChapter,
  },
  {
    id: "iter-gen",
    title: "手写迭代器 vs 生成器",
    narrations: iterGenNarrations,
    Component: IterGenChapter,
  },
  {
    id: "send",
    title: "双向通信",
    narrations: sendNarrations,
    Component: SendChapter,
  },
  {
    id: "yield-from",
    title: "委托子生成器",
    narrations: yieldFromNarrations,
    Component: YieldFromChapter,
  },
  {
    id: "lazy",
    title: "惰性管道",
    narrations: lazyNarrations,
    Component: LazyChapter,
  },
  {
    id: "memory",
    title: "内存对比",
    narrations: memoryNarrations,
    Component: MemoryChapter,
  },
  {
    id: "closing",
    title: "按需生成",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
