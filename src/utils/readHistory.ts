/**
 * 阅读记录（M4 步 9；端上特有功能）。本地 store，favorites/prefs 同款模式
 * （模块级单例 + 订阅 + cache 层落盘）；"read-history" 键不匹配 EVICTABLE_RE
 * ⇒ 免 LRU 淘汰。与收藏的差异：详情页**自动**记录（无需用户动作）、容量 50
 * 滚动淘汰（读旧的自动出局，不需要手动上限管理）、支持一键清空。
 * 惰性水合（详情页/history 页首次用到才读存储）；写盘失败静默。
 */
import { readCache, writeCache } from "@/services/cache";

export const READ_HISTORY_KEY = "read-history";
export const READ_HISTORY_MAX = 50;

export interface ReadHistoryItem {
  slug: string;
  /** 最近一次阅读的时间戳（列表按它倒序） */
  readAt: number;
}

let current: ReadHistoryItem[] = [];
let hydrated = false;
const listeners = new Set<(v: ReadHistoryItem[]) => void>();

/** 存储可能被旧版本/手工写坏：非对象、空 slug、重复过滤；按上限截断 */
function normalizeList(raw: unknown): ReadHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ReadHistoryItem[] = [];
  for (const x of raw) {
    const o = x as Partial<ReadHistoryItem>;
    if (typeof o?.slug !== "string" || !o.slug || seen.has(o.slug)) continue;
    seen.add(o.slug);
    out.push({
      slug: o.slug,
      readAt:
        typeof o.readAt === "number" && Number.isFinite(o.readAt)
          ? o.readAt
          : 0,
    });
  }
  return out.slice(0, READ_HISTORY_MAX);
}

function commit(next: ReadHistoryItem[]): ReadHistoryItem[] {
  current = next;
  for (const fn of listeners) fn(current);
  // 写盘失败（配额满等）静默：本次会话内存内仍生效
  void writeCache(READ_HISTORY_KEY, JSON.stringify(current)).catch(() => undefined);
  return [...current];
}

/** 惰性水合：详情页/history 页首次用到才调（只更新内存，不回写存储） */
export function hydrateReadHistory(raw: string | null | undefined): ReadHistoryItem[] {
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

export function getReadHistory(): ReadHistoryItem[] {
  return [...current];
}

export function subscribeReadHistory(fn: (v: ReadHistoryItem[]) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 记录一次阅读：已存在则置顶刷新时间戳，否则新增；超容量滚动淘汰最旧 */
export function addReadHistory(slug: string): ReadHistoryItem[] {
  if (!slug) return getReadHistory();
  const rest = current.filter(x => x.slug !== slug);
  return commit([{ slug, readAt: Date.now() }, ...rest].slice(0, READ_HISTORY_MAX));
}

/** 清空（历史页一键清空用） */
export function clearReadHistory(): ReadHistoryItem[] {
  return commit([]);
}
