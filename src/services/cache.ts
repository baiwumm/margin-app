/**
 * 缓存层（api-contract §7 / D30）：
 * - 键约定：`api:<name>:<buildId>`（随版本失效）、`manifest`、`prefs`、`snapshot`
 * - 正文缓存 4MB 按字节 LRU（不按篇数）；单篇 >1MB 只留内存不落盘
 * - 快照与 prefs 不参与淘汰（D30：快照是备案万一失效的唯一兜底）
 * - 水位守卫：读 getStorageInfo（不写死配额），>70% 主动淘汰、>90% 停预取
 * - LRU 元数据存独立键 `api:lru`（{ key: { bytes, at } }），O(n) 淘汰足够
 *   （74 篇量级；正文条目实际 ≤100）
 */
import { platform } from "./platform";

export const KEY_MANIFEST = "manifest";
export const KEY_PREFS = "prefs";
export const KEY_SNAPSHOT = "snapshot";
export const KEY_LRU = "api:lru";
export const API_KEY_PREFIX = "api:";
/** 可淘汰键 = api:<name>:<buildId>（lru/manifest/prefs/snapshot 排除） */
const EVICTABLE_RE = /^api:[^:]+:[^:]+$/;

/** 正文缓存字节预算（api-contract §7：4MB） */
export const BODY_CACHE_BUDGET_BYTES = 4 * 1024 * 1024;
/** 单篇落盘上限：超过只留内存（api-contract §7） */
export const SINGLE_ENTRY_DISK_LIMIT_BYTES = 1 * 1024 * 1024;
/** 水位（api-contract §7：70% / 90%，实际配额真机复核） */
const WATER_MARK_EVICT = 0.7;
const WATER_MARK_STOP_PREFETCH = 0.9;

interface LruMeta {
  [key: string]: { bytes: number; at: number };
}

/* ── 内存层 ───────────────────────────────────────────────────────── */

const memoryCache = new Map<string, string>();
/** 单篇超限的内存白名单（本次会话） */
const memoryOnly = new Set<string>();
/** LRU 时钟：模块级单调递增（Date.now() 同毫秒不稳定） */
let lruTick = 0;

/** 清空内存层（测试隔离用；生产无调用方） */
export function resetMemoryCache(): void {
  memoryCache.clear();
  memoryOnly.clear();
  lruTick = 0;
}

function isProtectedKey(key: string): boolean {
  return (
    key === KEY_MANIFEST ||
    key === KEY_PREFS ||
    key === KEY_SNAPSHOT ||
    key === KEY_LRU
  );
}

function isEvictable(key: string): boolean {
  return EVICTABLE_RE.test(key) && !isProtectedKey(key);
}

/* ── 基础读写 ─────────────────────────────────────────────────────── */

export async function readCache(key: string): Promise<string | null> {
  const mem = memoryCache.get(key);
  if (mem !== undefined) {
    // 命中内存同样刷新 LRU 时间戳（fire-and-forget）
    if (isEvictable(key)) void touchLru(key, mem.length);
    return mem;
  }
  const raw = await platform().getStorage(key);
  if (raw === null) return null;
  if (isEvictable(key)) await touchLru(key, raw.length);
  return raw;
}

export async function writeCache(key: string, value: string): Promise<void> {
  const bytes = value.length;
  memoryCache.set(key, value);
  if (isProtectedKey(key)) {
    await platform().setStorage(key, value);
    return;
  }
  if (!isEvictable(key)) {
    await platform().setStorage(key, value);
    return;
  }
  // 单篇超限：只留内存，不落盘
  if (bytes > SINGLE_ENTRY_DISK_LIMIT_BYTES) {
    memoryOnly.add(key);
    await removeLru(key);
    await platform().removeStorage(key).catch(() => {});
    return;
  }
  await touchLru(key, bytes);
  await platform().setStorage(key, value);
  await evictByBudget();
}

export async function removeCache(key: string): Promise<void> {
  memoryCache.delete(key);
  await removeLru(key);
  await platform().removeStorage(key).catch(() => {});
}

/* ── LRU ──────────────────────────────────────────────────────────── */

async function loadLru(): Promise<LruMeta> {
  const raw = await platform().getStorage(KEY_LRU);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LruMeta;
  } catch {
    return {};
  }
}

async function saveLru(meta: LruMeta): Promise<void> {
  await platform().setStorage(KEY_LRU, JSON.stringify(meta));
}

async function touchLru(key: string, bytes: number): Promise<void> {
  const meta = await loadLru();
  meta[key] = { bytes, at: ++lruTick };
  await saveLru(meta);
}

async function removeLru(key: string): Promise<void> {
  const meta = await loadLru();
  if (meta[key] !== undefined) {
    delete meta[key];
    await saveLru(meta);
  }
}

/** 淘汰最旧条目直到 body 缓存总量 ≤ budget（返回被淘汰的键，测试用） */
export async function evictByBudget(
  budget: number = BODY_CACHE_BUDGET_BYTES
): Promise<string[]> {
  const meta = await loadLru();
  const entries = Object.entries(meta).filter(([k]) => isEvictable(k));
  let total = entries.reduce((acc, [, v]) => acc + v.bytes, 0);
  if (total <= budget) return [];
  const evicted: string[] = [];
  entries.sort((a, b) => a[1].at - b[1].at);
  for (const [key] of entries) {
    if (total <= budget) break;
    total -= meta[key].bytes;
    delete meta[key];
    memoryCache.delete(key);
    await platform().removeStorage(key).catch(() => {});
    evicted.push(key);
  }
  await saveLru(meta);
  return evicted;
}

/* ── 水位守卫（读 getStorageInfo，不写死配额）─────────────────────── */

export interface WaterLevel {
  ratio: number;
  shouldEvict: boolean;
  shouldPrefetch: boolean;
}

export async function getWaterLevel(): Promise<WaterLevel> {
  const info = await platform().getStorageInfo();
  const limit = info.limitSize > 0 ? info.limitSize : 1;
  const ratio = info.currentSize / limit;
  return {
    ratio,
    shouldEvict: ratio > WATER_MARK_EVICT,
    shouldPrefetch: ratio <= WATER_MARK_STOP_PREFETCH,
  };
}

/** 水位触发时主动收紧（按 4MB 预算再压一轮） */
export async function enforceWaterMark(): Promise<void> {
  const level = await getWaterLevel();
  if (level.shouldEvict) await evictByBudget();
}

/* ── buildId 失效清理（api-contract §7：200 且 buildId 变 → 刷旧）──── */

/** 删除所有非当前 buildId 的 api:<name>:<buildId> 键；manifest/prefs/snapshot 不动 */
export async function evictStaleBuildIds(currentBuildId: string): Promise<string[]> {
  const info = await platform().getStorageInfo();
  const removed: string[] = [];
  for (const key of info.keys) {
    if (!EVICTABLE_RE.test(key)) continue;
    if (key.endsWith(`:${currentBuildId}`)) continue;
    memoryCache.delete(key);
    await platform().removeStorage(key).catch(() => {});
    removed.push(key);
  }
  const meta = await loadLru();
  let dirty = false;
  for (const key of Object.keys(meta)) {
    if (!isEvictable(key) || key.endsWith(`:${currentBuildId}`)) continue;
    delete meta[key];
    dirty = true;
  }
  if (dirty) await saveLru(meta);
  return removed;
}
