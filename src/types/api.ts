/**
 * 数据契约类型 —— 与 docs/api-contract.md 一一对应（M0 冻结版）。
 * 端上只认这些结构，不猜字段。
 */

/* ── 公共 ─────────────────────────────────────────────────────────── */

export interface ApiEnvelope<T> {
  schemaVersion: number;
  buildId: string;
  generatedAt: string;
  data: T;
}

/* ── 文章 ─────────────────────────────────────────────────────────── */

export interface PostMeta {
  slug: string;
  path: string;
  title: string;
  description: string;
  tags: string[];
  pubDatetime: string;
  modDatetime: string | null;
  featured: boolean;
  draft: false;
  ogImage: string | null;
  readingTime: number;
  wordCount: number;
}

export interface AssetRef {
  src: string;
  md: string;
  thumb: string;
  srcWidth: number;
  mdWidth: number;
  thumbWidth: number;
  width: number;
  height: number;
  format: string;
  bytes: number;
  avgColor: string;
}

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3 | 4;
}

export interface Inline {
  t: "text" | "code" | "br";
  v: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  link?: { href: string; external: boolean };
}

export interface CodeToken {
  v: string;
  c?: number;
}

/** 代码配色表（manifest 下发；c = CodeColors 下标） */
export interface CodeColors {
  light: string;
  dark: string;
}

export type Block =
  | { t: "p"; i: Inline[] }
  | { t: "h"; d: 2 | 3 | 4; i: Inline[]; id: string }
  | { t: "img"; a: number; alt?: string }
  | {
      t: "code";
      lang?: string;
      file?: string;
      lines: number;
      tokens: CodeToken[][];
      highlighted: true;
    }
  | { t: "quote"; i: Inline[] }
  | { t: "list"; ordered: boolean; items: Inline[][] }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] }
  | { t: "hr" }
  | { t: "linkcard"; href: string; title: string; desc?: string; icon?: string }
  | {
      t: "music";
      platform: "netease" | "qq";
      id: string;
      audio?: string;
      /** margin 构建期从 music-cache.json 同源下发；未缓存的 id 三个字段一起缺席 */
      name?: string;
      artist?: string;
      cover?: string;
    }
  | {
      t: "video";
      id?: string;
      src?: string;
      poster?: string;
      title?: string;
      ratio?: string;
    }
  | { t: "unknown"; raw: string };

export interface PostDetail {
  meta: PostMeta;
  blocks: Block[];
  toc: TocItem[];
  assets: AssetRef[];
  prev: PostMeta | null;
  next: PostMeta | null;
  canonicalURL: string;
}

/* ── 其余集合 ─────────────────────────────────────────────────────── */

export interface Gallery {
  slug: string;
  path: string;
  title: string;
  description: string;
  tags: string[];
  photoCount: number;
  cover: AssetRef;
  photos: GalleryPhoto[];
}

export interface GalleryPhoto {
  asset: AssetRef;
  alt: string;
  name: string;
}

export interface Moment {
  id: string;
  text: string;
  pubDatetime: string;
  images: AssetRef[];
  tags: string[];
  music?: { platform: "netease" | "qq"; id: string; audio?: string };
  video?: {
    id?: string;
    src?: string;
    poster?: string;
    title?: string;
    ratio?: string;
  };
  likes: null;
}

export interface Tag {
  name: string;
  slug: string;
  count: number;
  color: string;
  colorDark: string;
  ink: string;
}

export interface FriendGroupPayload {
  title: string;
  items: { name: string; url: string; desc: string; avatar: string | null }[];
}

export interface ProjectPayload {
  name: string;
  url: string;
  desc: string;
  lang: string | null;
  stars: number;
  forks: number;
  topics: string[];
  /** 账号级加性字段（D66；margin `8079583` 起逐项冗余下发，旧 build 数据缺席 ⇒ 回退旧口径） */
  accountStars?: number;
  joinedAt?: string;
}

/* ── 统计与清单 ───────────────────────────────────────────────────── */

export interface Stats {
  postCount: number;
  galleryCount: number;
  momentCount: number;
  tagCount: number;
  totalWords: number;
  readingMinutes: number;
  streakMonths: number;
  heatmap: { date: string; count: number }[];
  monthBuckets: { month: string; words: number; posts: number }[];
}

export interface Resource {
  name: string;
  path: string;
  hash: string;
  bytes: number;
}

export interface Manifest {
  schemaVersion: number;
  buildId: string;
  generatedAt: string;
  assetBase: string;
  site: { title: string; author: string; desc: string };
  counts: {
    posts: number;
    galleries: number;
    moments: number;
    tags: number;
    images: number;
  };
  resources: Resource[];
  searchIndex: {
    titlesPath: string;
    titlesHash: string;
    termsPath: string;
    termsHash: string;
    termsMinChars: 2;
    strategy: "bigram";
  };
}

/* ── 检索索引 ─────────────────────────────────────────────────────── */

export interface TitleIndex {
  buildId: string;
  docs: {
    slug: string;
    title: string;
    tags: string[];
    desc: string;
    headings: string[];
    pinyin: string;
    pubDatetime: string;
  }[];
}

export interface TermIndex {
  buildId: string;
  fields: ["title", "tags", "description", "headings", "body"];
  terms: Record<string, string>;
  strategy: "bigram";
}

/* ── site.json ────────────────────────────────────────────────────── */

export interface SitePayload {
  title: string;
  desc: string;
  author: string;
  avatar: string;
  socials: { name: string; url: string }[];
  nav: { label: string; path: string }[];
  hero: string;
  announcement: null;
  theme: { accent: string; accentDark: string };
}
