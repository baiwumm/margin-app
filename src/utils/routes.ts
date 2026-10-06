/** 页面路由集中处（分包归属见 app.config.ts；详情页分享 path 发布后不可改） */
export const POST_DETAIL = "/pagesA/post/detail";

export function postDetailUrl(slug: string): string {
  return `${POST_DETAIL}?slug=${encodeURIComponent(slug)}`;
}
