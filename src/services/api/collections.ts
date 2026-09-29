/**
 * 13 端点的端上薄封装：cache-first（读缓存渲染，0 等待）+ 后台网络刷新。
 * 键 = api:<name>:<buildId>；正文缓存走字节 LRU（cache.ts）。
 */
import type {
  ApiEnvelope,
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

type EnvelopeOf<T> = ApiEnvelope<T>;

async function fetchAndCache<T>(
  name: string,
  path: string,
  buildId: string
): Promise<T | null> {
  try {
    const result = await getJson<T>(`${currentBase()}${path}`);
    if ("notModified" in result) {
      // 304：重新读缓存（上方 readCache 已回填内存）
      const cached = await readCache(`api:${name}:${buildId}`);
      return cached ? (JSON.parse(cached) as EnvelopeOf<T>).data : null;
    }
    const { envelope } = result;
    const key = `api:${name}:${buildId}`;
    if (envelope.buildId !== buildId) {
      // 拉到新 buildId 的资源：直接写新键（manifest 流程稍后清旧）
      await writeCache(`api:${name}:${envelope.buildId}`, JSON.stringify(envelope));
      return envelope.data;
    }
    await writeCache(key, JSON.stringify(envelope));
    return envelope.data;
  } catch {
    return null; // 失败模式好：最坏读旧缓存（调用方已先给缓存）
  }
}

async function cachedData<T>(name: string, buildId: string): Promise<T | null> {
  const raw = await readCache(`api:${name}:${buildId}`);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as EnvelopeOf<T>).data;
  } catch {
    return null;
  }
}

/** cache-first：先回缓存（可能 null），网络可达且水位允许时后台刷新 */
async function loadWithCache<T>(
  name: string,
  path: string,
  buildId: string,
  options: { prefetch?: boolean } = {}
): Promise<T | null> {
  const cached = await cachedData<T>(name, buildId);
  if (options.prefetch) {
    const level = await getWaterLevel();
    if (level.shouldPrefetch) void fetchAndCache<T>(name, path, buildId);
  } else {
    void fetchAndCache<T>(name, path, buildId);
  }
  return cached;
}

/* ── 需要当前 buildId 的调用方先拿 manifest；此处提供以 buildId 为参的 API ── */

export const getSite = (buildId: string) =>
  loadWithCache<SitePayload>("site", "/api/v1/site.json", buildId);

export const getPostsIndex = (buildId: string) =>
  loadWithCache<PostMeta[]>("posts-index", "/api/v1/posts/index.json", buildId);

export const getPostDetail = (buildId: string, slug: string) =>
  loadWithCache<PostDetail>(
    `post-${slug}`,
    `/api/v1/posts/${encodeURIComponent(slug)}.json`,
    buildId
  );

export const getGalleriesIndex = (buildId: string) =>
  loadWithCache<{ slug: string; path: string; title: string; description: string; tags: string[]; photoCount: number; cover: import("@/types/api").AssetRef }[]>(
    "galleries-index",
    "/api/v1/galleries/index.json",
    buildId
  );

export const getGalleryDetail = (buildId: string, slug: string) =>
  loadWithCache<Gallery>(
    `gallery-${slug}`,
    `/api/v1/galleries/${encodeURIComponent(slug)}.json`,
    buildId
  );

export const getMoments = (buildId: string) =>
  loadWithCache<Moment[]>("moments", "/api/v1/moments/index.json", buildId);

export const getTags = (buildId: string) =>
  loadWithCache<Tag[]>("tags", "/api/v1/tags/index.json", buildId);

export const getStats = (buildId: string) =>
  loadWithCache<Stats>("stats", "/api/v1/stats.json", buildId);
