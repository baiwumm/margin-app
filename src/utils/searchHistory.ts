/**
 * 搜索历史（M4 步 7）：本地 store，prefs 同款模式（模块级单例 + 订阅 + cache 层
 * 落盘——LRU 保护的 prefs 同区键、永不淘汰）。容量 10 条、最新在前、去重、可清空。
 * 惰性水合：搜索页首次进入才读存储（不占冷启动预算），写盘失败静默（同 prefs 口径）。
 */
import { writeCache } from "@/services/cache";

export const SEARCH_HISTORY_KEY = "search-history";
export const SEARCH_HISTORY_MAX = 10;

let current: string[] = [];
let hydrated = false;
const listeners = new Set<(v: string[]) => void>();

/** 存储可能被写坏：非字符串/空串过滤、截断 */
function normalizeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, SEARCH_HISTORY_MAX);
}

/** 惰性水合：搜索页 mount 时调（只更新内存，不回写存储） */
export function hydrateSearchHistory(raw: string | null | undefined): string[] {
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

export function getSearchHistory(): string[] {
  return [...current];
}

/** 页面已水合？（用于区分「没历史」与「还没读到存储」） */
export function isSearchHistoryReady(): boolean {
  return hydrated;
}

export function subscribeSearchHistory(fn: (v: string[]) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 记录一次搜索：最新在前、去重、截断；写盘失败静默（会话内仍生效） */
export function addSearchHistory(q: string): string[] {
  const norm = q.trim();
  if (!norm) return getSearchHistory();
  current = [norm, ...current.filter(x => x !== norm)].slice(
    0,
    SEARCH_HISTORY_MAX
  );
  for (const fn of listeners) fn(current);
  void writeCache(SEARCH_HISTORY_KEY, JSON.stringify(current)).catch(
    () => undefined
  );
  return [...current];
}

export function clearSearchHistory(): string[] {
  current = [];
  for (const fn of listeners) fn(current);
  void writeCache(SEARCH_HISTORY_KEY, "[]").catch(() => undefined);
  return [];
}
