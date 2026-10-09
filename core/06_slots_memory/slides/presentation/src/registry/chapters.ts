import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import SlotsChapter from "../chapters/02-slots/Slots";
import { narrations as slotsNarrations } from "../chapters/02-slots/narrations";
import BulkChapter from "../chapters/03-bulk/Bulk";
import { narrations as bulkNarrations } from "../chapters/03-bulk/narrations";
import PriceChapter from "../chapters/04-price/Price";
import { narrations as priceNarrations } from "../chapters/04-price/narrations";
import SpeedChapter from "../chapters/05-speed/Speed";
import { narrations as speedNarrations } from "../chapters/05-speed/narrations";
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
    title: "看不见的字典税",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "slots",
    title: "一行声明的机制",
    narrations: slotsNarrations,
    Component: SlotsChapter,
  },
  {
    id: "bulk",
    title: "万级实例实测",
    narrations: bulkNarrations,
    Component: BulkChapter,
  },
  {
    id: "price",
    title: "三个代价与一个误会",
    narrations: priceNarrations,
    Component: PriceChapter,
  },
  {
    id: "speed",
    title: "速度真相",
    narrations: speedNarrations,
    Component: SpeedChapter,
  },
  {
    id: "closing",
    title: "何时用与系列回收",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
