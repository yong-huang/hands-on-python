import type { ChapterDef } from "./types";
import HookChapter from "../chapters/01-hook/Hook";
import { narrations as hookNarrations } from "../chapters/01-hook/narrations";
import TypeChapter from "../chapters/02-type/Type";
import { narrations as typeNarrations } from "../chapters/02-type/narrations";
import AddStrChapter from "../chapters/03-add-str/AddStr";
import { narrations as addStrNarrations } from "../chapters/03-add-str/narrations";
import SingletonChapter from "../chapters/04-singleton/Singleton";
import { narrations as singletonNarrations } from "../chapters/04-singleton/narrations";
import OrmChapter from "../chapters/05-orm/Orm";
import { narrations as ormNarrations } from "../chapters/05-orm/narrations";
import InitSubclassChapter from "../chapters/06-init-subclass/InitSubclass";
import { narrations as initSubclassNarrations } from "../chapters/06-init-subclass/narrations";
import ClosingChapter from "../chapters/07-closing/Closing";
import { narrations as closingNarrations } from "../chapters/07-closing/narrations";

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
    title: "谁在创建类",
    narrations: hookNarrations,
    Component: HookChapter,
  },
  {
    id: "type",
    title: "类的类",
    narrations: typeNarrations,
    Component: TypeChapter,
  },
  {
    id: "add-str",
    title: "自动加方法",
    narrations: addStrNarrations,
    Component: AddStrChapter,
  },
  {
    id: "singleton",
    title: "单例拦截",
    narrations: singletonNarrations,
    Component: SingletonChapter,
  },
  {
    id: "orm",
    title: "ORM 字段映射",
    narrations: ormNarrations,
    Component: OrmChapter,
  },
  {
    id: "init-subclass",
    title: "轻量替代",
    narrations: initSubclassNarrations,
    Component: InitSubclassChapter,
  },
  {
    id: "closing",
    title: "三层拦截",
    narrations: closingNarrations,
    Component: ClosingChapter,
  },
];
