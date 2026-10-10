import { describe, expect, it } from "vitest";

import { postsByTag, relatedTags } from "@/utils/tags";
import type { PostMeta } from "@/types/api";

/** M4 步 2：标签筛选 + 共现推荐（语料口径 = PostMeta.tags 为显示名） */
function post(slug: string, days: number, tags: string[]): PostMeta {
  const d = new Date(2026, 7, 31 - days, 12, 0, 0);
  return {
    slug,
    path: `/posts/${slug}`,
    title: slug,
    description: "",
    tags,
    pubDatetime: d.toISOString(),
    modDatetime: null,
    featured: false,
    draft: false,
    ogImage: null,
    readingTime: 1,
    wordCount: 1,
  };
}

const corpus = [
  post("a", 0, ["Astro", "博客"]),
  post("b", 1, ["Astro", "Vue"]),
  post("c", 2, ["Astro", "博客", "Frontend"]),
  post("d", 3, ["Vue"]),
  post("e", 4, ["博客"]),
];

describe("postsByTag", () => {
  it("按显示名过滤，新的在前", () => {
    const r = postsByTag(corpus, "Astro");
    expect(r.map(p => p.slug)).toEqual(["a", "b", "c"]);
  });

  it("空标签/不存在的标签出空数组", () => {
    expect(postsByTag(corpus, "不存在")).toEqual([]);
  });

  it("不修改入参", () => {
    const snapshot = corpus.map(p => p.slug);
    postsByTag(corpus, "Astro");
    expect(corpus.map(p => p.slug)).toEqual(snapshot);
  });
});

describe("relatedTags", () => {
  it("共现计数降序、不含自身", () => {
    const r = relatedTags(corpus, "Astro", 10);
    expect(r[0]).toEqual({ name: "博客", count: 2 });
    // Frontend / Vue 各 1 篇，按名字典序（纯 ASCII，ICU 次序稳定）
    expect(r.slice(1).map(x => x.name)).toEqual(["Frontend", "Vue"]);
    expect(r.every(x => x.name !== "Astro")).toBe(true);
  });

  it("limit 截断", () => {
    expect(relatedTags(corpus, "Astro", 1)).toHaveLength(1);
  });

  it("同计数按名字典序（稳定输出）", () => {
    const r = relatedTags(
      [post("x", 0, ["T", "b"]), post("y", 1, ["T", "a"])],
      "T",
      10
    );
    expect(r.map(x => x.name)).toEqual(["a", "b"]);
  });

  it("无同现标签出空数组", () => {
    expect(relatedTags(corpus, "不存在", 6)).toEqual([]);
  });
});
