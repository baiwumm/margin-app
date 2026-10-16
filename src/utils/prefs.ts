/**
 * 偏好（D5 accent / D7 阅读模式转偏好开关 / requirements §10 无障碍档）：
 * 主题、accent、正文字号、行距、阅读模式、代码换行。
 * 落盘走 cache 层的 `prefs` 键（LRU 保护，D16/D30 永不淘汰）；本模块只管数据：
 * 解析 / 钳制 / 订阅 / 写盘，「把值应用到运行时」由调用方做（app.ts 启动水合、
 * 偏好页改动时），避免 utils 反向依赖 hooks。
 * 字号/行距的实际生效 = tokens.css 的 .fs-* / .lead-* 构建期类（见 prefsClass）。
 */
import { KEY_PREFS, writeCache } from "@/services/cache";
import { ACCENT_KEYS, type AccentKey } from "@/config/accent";
import type { ThemePreference } from "@/hooks/useTheme";

export interface Prefs {
  theme: ThemePreference;
  accent: AccentKey;
  /** 正文字号（rpx），requirements §10 区间 26–40 */
  bodyRpx: number;
  /** 正文行距（无单位倍数） */
  leading: number;
  /** 阅读模式（D7：margin 的 r 键快捷键转偏好开关） */
  readMode: boolean;
  /** 代码块换行（关 = 横向滚动，margin 原站默认） */
  codeWrap: boolean;
  /** 站点字体（D4：开 = 等宽场景加载 Maple Mono CN ASCII 切片；默认开 —— D71） */
  siteFont: boolean;
}

/** margin .app-prose 正文 = 16px/1.75 @375 → 32rpx；行距同 --lh-body 默认 */
export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  accent: "blue",
  bodyRpx: 32,
  leading: 1.75,
  readMode: false,
  codeWrap: false,
  siteFont: true,
};

export const BODY_RPX_MIN = 26;
export const BODY_RPX_MAX = 40;
export const BODY_RPX_STEP = 2;
/** 行距三档（1.75 = margin 原值） */
export const LEADINGS = [1.6, 1.75, 1.9] as const;

const THEMES: readonly string[] = ["system", "light", "dark"];

export function clampBodyRpx(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : DEFAULT_PREFS.bodyRpx;
  const snapped = Math.round(v / BODY_RPX_STEP) * BODY_RPX_STEP;
  return Math.min(BODY_RPX_MAX, Math.max(BODY_RPX_MIN, snapped));
}

export function snapLeading(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : DEFAULT_PREFS.leading;
  return LEADINGS.reduce(
    (best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best),
    LEADINGS[0]
  );
}

/** 逐字段校验（存储可能被旧版本或手工写坏，未知值一律回落默认） */
export function normalize(raw: unknown): Prefs {
  const o = (raw ?? {}) as Partial<Prefs>;
  return {
    theme: THEMES.includes(String(o.theme))
      ? (o.theme as ThemePreference)
      : DEFAULT_PREFS.theme,
    accent: ACCENT_KEYS.includes(String(o.accent) as AccentKey)
      ? (o.accent as AccentKey)
      : DEFAULT_PREFS.accent,
    bodyRpx: clampBodyRpx(o.bodyRpx),
    leading: snapLeading(o.leading),
    readMode: o.readMode === true,
    codeWrap: o.codeWrap === true,
    // 默认开的布尔：字段缺失回落默认，写坏了才判 false（区别于上面两个默认关的）
    siteFont: o.siteFont === undefined ? DEFAULT_PREFS.siteFont : o.siteFont === true,
  };
}

export function parsePrefs(text: string | null | undefined): Prefs {
  if (!text) return { ...DEFAULT_PREFS };
  try {
    return normalize(JSON.parse(text));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function serializePrefs(p: Prefs): string {
  return JSON.stringify(p);
}

/**
 * prefs 结构版本戳（D75）：默认值反转时的一次性迁移用。戳与 prefs 分开存
 * （cache 的 `prefs:schema` 键），不污染 Prefs 形状。
 */
export const PREFS_SCHEMA = 2;

/**
 * 一次性迁移（D75）：`siteFont` 默认 false → true 的反转。旧版 serializePrefs
 * 写全量字段 ⇒ 老存储里的 `siteFont:false` 分不清是「用户手动关过」还是
 * 「旧默认值落盘」，一律按新默认拉回。这是**有意的覆盖旧默认**语义，代价是
 * 旧版手动关过的用户会被翻回来一次；靠 schema 戳保证只跑一次。
 * 已打戳（或无存储可迁）时原样返回，用户显式关的值此后永久保留。
 */
export function migrateLegacyPrefs(text: string | null): string {
  const p = parsePrefs(text);
  return serializePrefs({ ...p, siteFont: DEFAULT_PREFS.siteFont });
}

/** 生效类名（root View 上挂，覆盖 page 继承来的 --fs-body / --lh-body） */
export function prefsClass(p: Prefs): string {
  return `fs-${p.bodyRpx} lead-${
    p.leading === 1.6 ? "tight" : p.leading === 1.9 ? "loose" : "base"
  }`;
}

/* ── 运行时单例（形状同 custom-tab-bar/store.ts：模块级 + 订阅）──────── */

let current: Prefs = { ...DEFAULT_PREFS };
const listeners = new Set<(p: Prefs) => void>();

export function getPrefs(): Prefs {
  return current;
}

/** 启动水合：只更新内存、不回写存储（避免每次冷启动多一次无意义写） */
export function hydratePrefs(raw: string | null | undefined): Prefs {
  current = parsePrefs(raw);
  return current;
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  current = normalize({ ...current, ...patch });
  for (const fn of listeners) fn(current);
  // 存储写失败（配额满等）静默：本次会话内存内仍生效，下次冷启动回落默认
  void writeCache(KEY_PREFS, serializePrefs(current)).catch(() => undefined);
  return current;
}

export function subscribePrefs(fn: (p: Prefs) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
