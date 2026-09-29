/**
 * 13 端点的端上薄封装：cache-first + 回调回填。
 * ① 缓存命中立即 onData（0 等待渲染）② 水位允许时拉网 → 到达再 onData。
 * 键 = api:<name>:<buildId>；正文缓存走字节 LRU（cache.ts）。
 */
import type {
  AssetRef,
  Gallery,
  Moment,
  PostDetail,
  PostMeta,
  SitePayload,
  Stats,
  Tag,
} from "@/types/api";
import {
  readCache,
  writeCache,
  getWaterLevel,
} from "../cache";
import { getJson } from "../request";
import { currentBase } from "./manifest";

async function fetchAndCache<T>(
  name: string,
  path: string,
  buildId: string
): Promise<T | null> {
  try {
    const result = await getJson<T>(`${currentBase()}${path}`);
    if ("notModified" in result) {
      const cached = await readCache(`api:${name}:${buildId}`);
      return cached ? (JSON.parse(cached) as { data: T }).data : null;
    }
    const { envelope } = result;
    if (envelope.buildId !== buildId) {
      // 拉到新 buildId 的资源：直接写新键（manifest 流程稍后清旧）
      await writeCache(
        `api:${name}:${envelope.buildId}`,
        JSON.stringify(envelope)
      );
      return envelope.data;
    }
    await writeCache(`api:${name}:${buildId}`, JSON.stringify(envelope));
    return envelope.data;
  } catch {
    return null; // 失败模式好：最坏读旧缓存（调用方已先给缓存）
  }
}

async function cachedData<T>(name: string, buildId: string): Promise<T | null> {
  const raw = await readCache(`api:${name}:${buildId}`);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { data: T }).data;
  } catch {
    return null;
  }
}

/**
 * cache-first + 回调回填（修复：首启缓存为 null 时后台取到数据也要通知 UI）：
 * ① 缓存命中立即 onData（0 等待渲染）② 水位允许时拉网 → 到达且变化再 onData
 */
async function loadWithCache<T>(
  name: string,
  path: string,
  buildId: string,
  onData: (data: T) => void,
  options: { prefetch?: boolean } = {}
): Promise<void> {
  const cached = await cachedData<T>(name, buildId);
  if (cached) onData(cached);
  if (options.prefetch) {
    const level = await getWaterLevel();
    if (!level.shouldPrefetch) return; // >90% 水位停预取
  }
  const fetched = await fetchAndCache<T>(name, path, buildId);
  if (fetched && fetched !== cached) onData(fetched);
}

/* ── 以 buildId 为参的集合 API（buildId 来自 useManifest）────────── */

export const getSite = (
  buildId: string,
  onData: (d: SitePayload) => void
) => loadWithCache<SitePayload>("site", "/api/v1/site.json", buildId, onData);

export const getPostsIndex = (
  buildId: string,
  onData: (d: PostMeta[]) => void
) =>
  loadWithCache<PostMeta[]>(
    "posts-index",
    "/api/v1/posts/index.json",
    buildId,
    onData
  );

export const getPostDetail = (
  buildId: string,
  slug: string,
  onData: (d: PostDetail) => void
) =>
  loadWithCache<PostDetail>(
    `post-${slug}`,
    `/api/v1/posts/${encodeURIComponent(slug)}.json`,
    buildId,
    onData
  );

export interface GallerySummary {
  slug: string;
  path: string;
  title: string;
  description: string;
  tags: string[];
  photoCount: number;
  cover: AssetRef;
}

export const getGalleriesIndex = (
  buildId: string,
  onData: (d: GallerySummary[]) => void
) =>
  loadWithCache<GallerySummary[]>(
    "galleries-index",
    "/api/v1/galleries/index.json",
    buildId,
    onData
  );

export const getGalleryDetail = (
  buildId: string,
  slug: string,
  onData: (d: Gallery) => void
) =>
  loadWithCache<Gallery>(
    `gallery-${slug}`,
    `/api/v1/galleries/${encodeURIComponent(slug)}.json`,
    buildId,
    onData
  );

export const getMoments = (
  buildId: string,
  onData: (d: Moment[]) => void
) =>
  loadWithCache<Moment[]>("moments", "/api/v1/moments/index.json", buildId, onData);

export const getTags = (buildId: string, onData: (d: Tag[]) => void) =>
  loadWithCache<Tag[]>("tags", "/api/v1/tags/index.json", buildId, onData);

export const getStats = (buildId: string, onData: (d: Stats) => void) =>
  loadWithCache<Stats>("stats", "/api/v1/stats.json", buildId, onData);
