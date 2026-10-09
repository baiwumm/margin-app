/** 页面路由集中处（分包归属见 app.config.ts；详情页分享 path 发布后不可改） */
export const POST_DETAIL = "/pagesA/post/detail";
export const GALLERY_DETAIL = "/pagesA/gallery-detail/index";
export const PREFERENCE = "/pagesB/preference";

export function postDetailUrl(slug: string): string {
  return `${POST_DETAIL}?slug=${encodeURIComponent(slug)}`;
}

/** 画廊详情（M3 步 4；对应站点 /galleries/<slug>） */
export function galleryDetailUrl(slug: string): string {
  return `${GALLERY_DETAIL}?slug=${encodeURIComponent(slug)}`;
}
