/** 页面路由集中处（分包归属见 app.config.ts；详情页分享 path 发布后不可改） */
export const POST_DETAIL = "/pagesA/post/detail";
export const GALLERY_DETAIL = "/pagesA/gallery-detail/index";
export const PREFERENCE = "/pagesB/preference";
export const ARCHIVE = "/pagesA/archive/index";
export const TAG_DETAIL = "/pagesA/tag-detail/index";
export const FRIENDS = "/pagesA/friends/index";
export const PROJECTS = "/pagesA/projects/index";

export function postDetailUrl(slug: string): string {
  return `${POST_DETAIL}?slug=${encodeURIComponent(slug)}`;
}

/** 画廊详情（M3 步 4；对应站点 /galleries/<slug>） */
export function galleryDetailUrl(slug: string): string {
  return `${GALLERY_DETAIL}?slug=${encodeURIComponent(slug)}`;
}

/** 归档（M4 步 1；对应站点 /archives；首页「查看全部文章」CTA 的目标） */
export function archiveUrl(): string {
  return ARCHIVE;
}

/** 标签详情（M4 步 2；对应站点 /tags/<tag>；参数 = 标签显示名） */
export function tagDetailUrl(tag: string): string {
  return `${TAG_DETAIL}?tag=${encodeURIComponent(tag)}`;
}

/** 友链（M4 步 3；对应站点 /friends） */
export function friendsUrl(): string {
  return FRIENDS;
}

/** 项目（M4 步 4；对应站点 /projects） */
export function projectsUrl(): string {
  return PROJECTS;
}
