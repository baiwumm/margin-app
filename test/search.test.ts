import { describe, expect, it } from "vitest";

import {
  highlightSegments,
  mergeResults,
  normalizeQuery,
  parsePostings,
  queryTokens,
  searchAll,
  searchTerms,
  searchTitles,
} from "@/utils/search";
import type { SearchTitleDoc } from "@/types/api";

const doc = (over: Partial<SearchTitleDoc> & { slug: string }): SearchTitleDoc => ({
  title: "",
  tags: [],
  desc: "",
  headings: [],
  pinyin: "",
  ...over,
});

const DOCS: SearchTitleDoc[] = [
  doc({
    slug: "wxapp",
    title: "微信小程序开发笔记",
    tags: ["小程序"],
    desc: "从零开始的小程序教程",
    headings: ["开始"],
    pinyin: "weixinxiaochengxukaifabiji",
  }),
  doc({
    slug: "react",
    title: "React 性能优化",
    tags: ["React"],
    desc: "渲染与 memo",
    headings: [],
    pinyin: "reactxingnengyouhua",
  }),
  doc({
    slug: "life",
    title: "周末随想",
    tags: [],
    desc: "与小程序无关的生活流水",
    headings: [],
    pinyin: "zhoumousuixiang",
  }),
];

describe("normalizeQuery / queryTokens", () => {
  it("规范化：去首尾空白 + 小写；空白查询为空串", () => {
    expect(normalizeQuery("  React ")).toBe("react");
    expect(normalizeQuery("   ")).toBe("");
  });

  it("CJK 奇偶长度 bigram 滑窗（奇数末尾留单字）", () => {
    // 小程序 = 小+程+序 → 小程 / 程序
    expect(queryTokens("小程序")).toEqual(["小程", "程序"]);
    expect(queryTokens("微信")).toEqual(["微信"]);
    expect(queryTokens("微")).toEqual(["微"]);
  });

  it("混排：CJK 段切 bigram、ASCII 段整词、空白是分隔符；跨界不成 bigram", () => {
    expect(queryTokens("微信 abc")).toEqual(["微信", "abc"]);
    // CJK/ASCII 边界各自成段：单字 CJK 保持单字、ASCII 整词（跨界 bigram 在索引里不存在）
    expect(queryTokens("用react写")).toEqual(["用", "react", "写"]);
  });

  it("空查询/纯空格 → 空数组", () => {
    expect(queryTokens("")).toEqual([]);
    expect(queryTokens("  ")).toEqual([]);
  });
});

describe("searchTitles（titles 层：AND 语义 + 字段加权 + 拼音标识）", () => {
  it("标题命中得分高于描述命中（权重序 title 4 > desc 1）", () => {
    const hits = searchTitles("小程序", DOCS);
    expect(hits[0].doc.slug).toBe("wxapp"); // 标题命中
    // life 只在 desc 命中 → 也在结果里但分低
    expect(hits.map(h => h.doc.slug)).toContain("life");
    expect(hits[0].score).toBeGreaterThan(hits[hits.length - 1].score);
  });

  it("ASCII 查询命中拼音层 → viaPinyin 标识", () => {
    const hits = searchTitles("weixin", DOCS);
    expect(hits.map(h => h.doc.slug)).toContain("wxapp");
    expect(hits.find(h => h.doc.slug === "wxapp")?.viaPinyin).toBe(true);
  });

  it("ASCII 命中正文字段（非拼音）不置 viaPinyin", () => {
    const hits = searchTitles("react", DOCS);
    const react = hits.find(h => h.doc.slug === "react");
    expect(react).toBeDefined();
    expect(react!.viaPinyin).toBe(false); // title/tags 直接命中
  });

  it("AND 语义：多 token 一个不中则丢弃该文档", () => {
    // "微信react"：wxapp 只有微信、react 只有 react → 无文档全中
    expect(searchTitles("微信react", DOCS)).toEqual([]);
  });

  it("大小写不敏感；无命中返回空", () => {
    expect(searchTitles("REACT", DOCS).map(h => h.doc.slug)).toContain("react");
    expect(searchTitles("不存在的词组", DOCS)).toEqual([]);
  });

  it("空查询 → 空", () => {
    expect(searchTitles("  ", DOCS)).toEqual([]);
  });
});

describe("parsePostings / searchTerms（terms 层）", () => {
  it("postings 解析（含容错）", () => {
    expect(parsePostings("0:3,7:1")).toEqual([
      [0, 3],
      [7, 1],
    ]);
    expect(parsePostings("")).toEqual([]);
    expect(parsePostings("x:1,2:")).toEqual([[2, 0]]);
  });

  it("聚合 + 覆盖率排序：命中两个 token 的文档排在只命中一个之前", () => {
    const index = {
      小程: "0:2",
      程序: "0:1,1:4",
    };
    const scores = searchTerms("小程序", index);
    // doc0 命中两个 token（覆盖率 1），doc1 只命中一个（0.5）
    expect(scores.get(0)!).toBeGreaterThan(scores.get(1)!);
  });

  it("索引里查不到的 token 不惩罚其他 token 的覆盖率", () => {
    const scores = searchTerms("小程序", { 程序: "0:4" }); // "小程" 不在索引
    expect(scores.get(0)).toBe(4); // available=1，coverage=1
  });

  it("全部 token 查不到 → 空 Map", () => {
    expect(searchTerms("小程序", {}).size).toBe(0);
  });
});

describe("mergeResults（双层合并）", () => {
  const hits = searchTitles("小程序", DOCS);
  it("slug 去重：titles 命中 + terms 分数叠加为同一条", () => {
    const termsScores = new Map([
      [0, 6],
      [1, 8], // react：不命中 titles 层（查「小程序」）⇒ 构成「仅 terms 命中」用例
    ]);
    const merged = mergeResults(hits, termsScores, DOCS);
    const wxapp = merged.filter(r => r.doc.slug === "wxapp");
    expect(wxapp.length).toBe(1);
    expect(wxapp[0].viaBody).toBe(false);
    expect(wxapp[0].score).toBeGreaterThan(hits[0].score); // terms 加成
    const react = merged.find(r => r.doc.slug === "react")!;
    expect(react.viaBody).toBe(true); // 仅 terms 层命中
  });

  it("越界 docId 防御：丢弃不崩", () => {
    const merged = mergeResults(hits, new Map([[99, 5]]), DOCS);
    expect(merged.every(r => r.doc.slug !== undefined)).toBe(true);
  });

  it("同分稳定：按 docs 原序", () => {
    const a = { ...hits[0] };
    const b = { ...hits[hits.length - 1] };
    b.score = a.score;
    const merged = mergeResults([a, b], new Map(), DOCS);
    expect(merged[0].index).toBeLessThan(merged[1].index);
  });
});

describe("searchAll（入口）", () => {
  it("单字查询只走 titles 层（termsMinChars=2 口径）", () => {
    const r = searchAll("微", DOCS, { 微信: "0:9" });
    expect(r.every(x => !x.viaBody)).toBe(true);
  });

  it("双层全开：terms-only 文档进入结果", () => {
    const r = searchAll("教程", DOCS, { 教程: "2:5" });
    expect(r.map(x => x.doc.slug)).toContain("life");
    expect(r.find(x => x.doc.slug === "life")!.viaBody).toBe(true);
  });

  it("无效查询 → 空（terms 传不传都一样）", () => {
    expect(searchAll("  ", DOCS, { 微信: "0:1" })).toEqual([]);
  });
});

describe("highlightSegments（高亮分段）", () => {
  it("命中处切分且大小写不敏感（无空段）", () => {
    expect(highlightSegments("React 性能优化", ["react"])).toEqual([
      { text: "React", hit: true },
      { text: " 性能优化", hit: false },
    ]);
  });

  it("多 token 取最早命中位置", () => {
    expect(highlightSegments("小程序与 React", ["react", "程序"])).toEqual([
      { text: "小", hit: false },
      { text: "程序", hit: true },
      { text: "与 ", hit: false },
      { text: "React", hit: true },
    ]);
  });

  it("无命中 → 原文单段；空文本 → 单段", () => {
    expect(highlightSegments("没有命中", ["xyz"])).toEqual([
      { text: "没有命中", hit: false },
    ]);
    expect(highlightSegments("", ["a"])).toEqual([{ text: "", hit: false }]);
  });
});
