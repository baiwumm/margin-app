/**
 * 13 端点的端上薄封装：cache-first + 回调回填。
 * ① 缓存命中立即 onData（0 等待渲染）② 水位允许时拉网 → 到达再 onData。
 * 键 = api:<name>:<buildId>；正文缓存走字节 LRU（cache.ts）。
 *
 * D50 首屏并发：集合请求的 URL 与 buildId 无关（buildId 只是缓存键，信封自带），
 * 所以首屏两个端点（site / posts-index）由 warmFirstScreen 在页 mount 时与 manifest
 * 版本比对同时发起；fetchAndCache 的 buildId 允许为 null = 「版本未落定」，写键走
 * 信封自带 buildId 分支。订阅侧 loadWithCache 不变（仍以 buildId 为缓存读键）。
 */
import type {
  AssetRef,
  FriendGroupPayload,
  Gallery,
  Moment,
  PostDetail,
  PostMeta,
  ProjectPayload,
  SearchTermsPayload,
  SearchTitlesPayload,
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

/** 首屏两端点（warmFirstScreen 用；URL 与 buildId 无关 ⇒ 可与 manifest 并发） */
const SITE_PATH = "/api/v1/site.json";
const POSTS_INDEX_PATH = "/api/v1/posts/index.json";

async function fetchAndCache<T>(
  name: string,
  path: string,
  buildId: string | null
): Promise<T | null> {
  try {
    const result = await getJson<T>(`${currentBase()}${path}`, { memo: true });
    if ("notModified" in result) {
      const cached = buildId ? await readCache(`api:${name}:${buildId}`) : null;
      return cached ? (JSON.parse(cached) as { data: T }).data : null;
    }
    const { envelope } = result;
    if (buildId && envelope.buildId === buildId) {
      await writeCache(`api:${name}:${buildId}`, JSON.stringify(envelope));
    } else {
      // buildId 未落定（首屏预热）或已变（manifest 稍后清旧）：直接写信封自带的 buildId
      await writeCache(
        `api:${name}:${envelope.buildId}`,
        JSON.stringify(envelope)
      );
    }
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

export const getSite = (buildId: string, onData: (d: SitePayload) => void) =>
  loadWithCache<SitePayload>("site", SITE_PATH, buildId, onData);

export const getPostsIndex = (
  buildId: string,
  onData: (d: PostMeta[]) => void
) =>
  loadWithCache<PostMeta[]>(
    "posts-index",
    POSTS_INDEX_PATH,
    buildId,
    onData
  );

/**
 * 首屏预热（D50）：site / posts-index 与 manifest 版本比对**同时发起** —— URL 不带
 * buildId，等版本比对回来再发就是白等一个完整往返（实测 0.23–0.69s）。缓存键取响应
 * 信封自带的 buildId；失败静默（订阅侧 loadWithCache 会自走一遍取数）。
 * 订阅侧与这里共用同一发：飞行中走 request 的并发去重，已完成走 30s 响应备忘。
 */
export function warmFirstScreen(): Promise<void> {
  return Promise.all([
    fetchAndCache<SitePayload>("site", SITE_PATH, null),
    fetchAndCache<PostMeta[]>("posts-index", POSTS_INDEX_PATH, null),
  ]).then(() => undefined);
}

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

/** 友链分组（M4 步 3；站点 /friends，D8 口径：外链只复制不跳转） */
export const getFriends = (
  buildId: string,
  onData: (d: FriendGroupPayload[]) => void
) =>
  loadWithCache<FriendGroupPayload[]>(
    "friends",
    "/api/v1/friends.json",
    buildId,
    onData
  );

/** 项目列表（M4 步 4；站点 /projects，stars/forks 构建期已刷新） */
export const getProjects = (
  buildId: string,
  onData: (d: ProjectPayload[]) => void
) =>
  loadWithCache<ProjectPayload[]>(
    "projects",
    "/api/v1/projects.json",
    buildId,
    onData
  );

export const getStats = (buildId: string, onData: (d: Stats) => void) =>
  loadWithCache<Stats>("stats", "/api/v1/stats.json", buildId, onData);

/* ── 检索（M4 步 7；D15 双层索引）────────────────────────────────── */

/** 检索第一层 titles（46.3KB，标题/标签/摘要/小标题 + 构建期拼音）。
 * 预热走 warmSearchTitles（首屏渲染后），本封装兜底：进搜索页缓存命中即渲。 */
export const getSearchTitles = (
  buildId: string,
  onData: (d: SearchTitlesPayload) => void
) =>
  loadWithCache<SearchTitlesPayload>(
    "search-titles",
    "/api/v1/search/titles.json",
    buildId,
    onData
  );

/**
 * titles 后台预热（步 7）：首页 mount 首屏渲染完成后调用——46.3KB 不进首屏关键
 * 路径（D48 冷启动 FCP 基线优先），失败静默。与 warmFirstScreen 分开：那个是 D50
 * 首屏关键路径单元，行为一行不改；键同 getSearchTitles ⇒ 订阅侧天然共用同一发。
 */
export function warmSearchTitles(): Promise<void> {
  return fetchAndCache<SearchTitlesPayload>(
    "search-titles",
    "/api/v1/search/titles.json",
    null
  ).then(() => undefined);
}

/**
 * 检索第二层 terms 全文倒排（376KB，≤400KB 硬线）：只在查询 ≥ termsMinChars（=2）
 * 字时由搜索页首次触发，cache-first 后续复用。prefetch:true = 沿用水位纪律
 * （>90% 存储停拉取）——此时第二层缺席，搜索仍可用（titles 层）。
 */
export const getSearchTerms = (
  buildId: string,
  onData: (d: SearchTermsPayload) => void
) =>
  loadWithCache<SearchTermsPayload>(
    "search-terms",
    "/api/v1/search/terms.json",
    buildId,
    onData,
    { prefetch: true }
  );
