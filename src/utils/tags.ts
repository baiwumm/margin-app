/**
 * 标签筛选与共现推荐（M4 步 2；requirements §5.6：标签详情页底部按共现推荐，
 * 端上从 posts/index.json 现算 —— 不需要新端点）。
 *
 * 口径事实（探针 m4-tag-probe.mjs）：PostMeta.tags 是**显示名**（146/146 命中
 * tags/index 的 name），所以按 tag 名直接过虑；tags/index 的 slug 只服务于
 * 契约与分享，端内导航携带显示名（encodeURIComponent）。
 */
import type { PostMeta } from "@/types/api";

/** 某标签下的文章（按发布时间倒序，与首页/详情口径一致） */
export function postsByTag(
  posts: readonly PostMeta[],
  tag: string
): PostMeta[] {
  return posts
    .filter(p => p.tags.includes(tag))
    .sort(
      (a, b) =>
        new Date(b.pubDatetime).getTime() - new Date(a.pubDatetime).getTime()
    );
}

/**
 * 共现推荐：与该标签同现最多的其他标签（不含自身；计数降序、同计数按名字典序）。
 * 强度可选返回出现篇数，供 UI 显示「n 篇」。
 */
export function relatedTags(
  posts: readonly PostMeta[],
  tag: string,
  limit = 6
): { name: string; count: number }[] {
  const hit = posts.filter(p => p.tags.includes(tag));
  const tally = new Map<string, number>();
  for (const p of hit) {
    for (const t of p.tags) {
      if (t === tag) continue;
      tally.set(t, (tally.get(t) ?? 0) + 1);
    }
  }
  return [...tally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}
