/**
 * 我的收藏（M4 步 8；端上特有功能——margin 站点是静态博客无收藏）。本地
 * store，prefs 同款模式（模块级单例 + 订阅 + cache 层落盘）；"favorites" 键
 * 不匹配 EVICTABLE_RE ⇒ 与 prefs/search-history 同区、永不参与 LRU 淘汰。
 * 惰性水合（详情页/mine 首次用到才读存储，不占冷启动预算）；容量 200 条防
 * 失控（超出丢最旧）；写盘失败静默（会话内仍生效，同 prefs 口径）。
 */
import { writeCache } from "@/services/cache";

export const FAVORITES_KEY = "favorites";
export const FAVORITES_MAX = 200;

export interface FavoriteItem {
  slug: string;
  /** 收藏时间戳（列表按它倒序展示） */
  addedAt: number;
}

let current: FavoriteItem[] = [];
let hydrated = false;
const listeners = new Set<(v: FavoriteItem[]) => void>();

/** 存储可能被旧版本/手工写坏：非对象、无 slug、重复的过滤；按上限截断 */
function normalizeList(raw: unknown): FavoriteItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FavoriteItem[] = [];
  for (const x of raw) {
    const o = x as Partial<FavoriteItem>;
    if (typeof o?.slug !== "string" || !o.slug || seen.has(o.slug)) continue;
    seen.add(o.slug);
    out.push({
      slug: o.slug,
      addedAt:
        typeof o.addedAt === "number" && Number.isFinite(o.addedAt)
          ? o.addedAt
          : 0,
    });
  }
  return out.slice(0, FAVORITES_MAX);
}

function commit(next: FavoriteItem[]): FavoriteItem[] {
  current = next;
  for (const fn of listeners) fn(current);
  // 写盘失败（配额满等）静默：本次会话内存内仍生效
  void writeCache(FAVORITES_KEY, JSON.stringify(current)).catch(() => undefined);
  return [...current];
}

/** 惰性水合：详情页/mine 首次用到才调（只更新内存，不回写存储） */
export function hydrateFavorites(raw: string | null | undefined): FavoriteItem[] {
  if (hydrated) return [...current];
  try {
    current = normalizeList(raw ? JSON.parse(raw) : []);
  } catch {
    current = [];
  }
  hydrated = true;
  for (const fn of listeners) fn(current);
  return [...current];
}

export function getFavorites(): FavoriteItem[] {
  return [...current];
}

export function isFavoritesReady(): boolean {
  return hydrated;
}

export function isFavorite(slug: string): boolean {
  return current.some(x => x.slug === slug);
}

export function subscribeFavorites(fn: (v: FavoriteItem[]) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 收藏：已存在则置顶（刷新时间戳），否则新增；超上限丢最旧 */
export function addFavorite(slug: string): FavoriteItem[] {
  if (!slug) return getFavorites();
  const rest = current.filter(x => x.slug !== slug);
  return commit([{ slug, addedAt: Date.now() }, ...rest].slice(0, FAVORITES_MAX));
}

export function removeFavorite(slug: string): FavoriteItem[] {
  return commit(current.filter(x => x.slug !== slug));
}

/** 切换收藏态；返回切换后的状态（true = 已收藏） */
export function toggleFavorite(slug: string): boolean {
  if (isFavorite(slug)) {
    removeFavorite(slug);
    return false;
  }
  addFavorite(slug);
  return true;
}
