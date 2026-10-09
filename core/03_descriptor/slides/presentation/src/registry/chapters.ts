import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import ProtocolChapter from "../chapters/02-protocol/Protocol";
import { narrations as protocolNarrations } from "../chapters/02-protocol/narrations";
import ChainChapter from "../chapters/03-chain/Chain";
import { narrations as chainNarrations } from "../chapters/03-chain/narrations";
import TypedChapter from "../chapters/04-typed/Typed";
import { narrations as typedNarrations } from "../chapters/04-typed/narrations";
import CachedChapter from "../chapters/05-cached/Cached";
import { narrations as cachedNarrations } from "../chapters/05-cached/narrations";
import LazyChapter from "../chapters/06-lazy/Lazy";
import { narrations as lazyNarrations } from "../chapters/06-lazy/narrations";
import StdlibChapter from "../chapters/07-stdlib/Stdlib";
import { narrations as stdlibNarrations } from "../chapters/07-stdlib/narrations";
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
    title: "obj.attr 不是查字典",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "protocol",
    title: "协议三方法",
    narrations: protocolNarrations,
    Component: ProtocolChapter,
  },
  {
    id: "chain",
    title: "两类描述符与查找链",
    narrations: chainNarrations,
    Component: ChainChapter,
  },
  {
    id: "typed",
    title: "TypedField 验证字段",
    narrations: typedNarrations,
    Component: TypedChapter,
  },
  {
    id: "cached",
    title: "CachedProperty 缓存属性",
    narrations: cachedNarrations,
    Component: CachedChapter,
  },
  {
    id: "lazy",
    title: "LazyField 惰性加载",
    narrations: lazyNarrations,
    Component: LazyChapter,
  },
  {
    id: "stdlib",
    title: "property 与标准库",
    narrations: stdlibNarrations,
    Component: StdlibChapter,
  },
  {
    id: "closing",
    title: "会用 vs 理解",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
