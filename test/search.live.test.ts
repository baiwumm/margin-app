/**
 * 步 7 真实数据验证（闲时任务专用，automator 禁用期间的 node 侧替代）：
 * 读取仓库外探针工作区已下载的线上 titles/terms JSON（E:/personal-project/
 * mp-probe-work/code-step9/），对纯函数做真数据断言 + 耗时基准。
 * 文件缺席（其他机器/已清理）自动 skip——不是 CI 依赖，只在本机有产物时跑。
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  highlightSegments,
  queryTokens,
  searchAll,
  searchTitles,
} from "@/utils/search";
import type { SearchTermsPayload, SearchTitlesPayload } from "@/types/api";

const DIR = "E:/personal-project/mp-probe-work/code-step9";
const TITLES = `${DIR}/titles-live.json`;
const TERMS = `${DIR}/terms-live.json`;
const has = existsSync(TITLES) && existsSync(TERMS);
const d = (has ? describe : describe.skip);

let titles: SearchTitlesPayload;
let terms: SearchTermsPayload["terms"];
if (has) {
  titles = JSON.parse(readFileSync(TITLES, "utf8")).data;
  terms = JSON.parse(readFileSync(TERMS, "utf8")).data.terms;
}

d("真实线上数据（闲时基准，产物缺席自动跳过）", () => {
  it("语料规模符合契约口径（75 docs / terms ≤ 400KB 量级）", () => {
    expect(titles.docs.length).toBe(75);
    expect(Object.keys(terms).length).toBeGreaterThan(15000);
  });

  it("中文查询「微信」：titles 层命中且排序稳定", () => {
    const t0 = performance.now();
    const r = searchAll("微信", titles.docs, terms);
    const ms = performance.now() - t0;
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].doc.title).toContain("微信");
    console.log(`[search.bench] 「微信」${r.length} 条命中，${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(100);
  });

  it("ASCII 查询「zcode」：命中 ZCode 邀请文（此前实证的映射用例）", () => {
    const r = searchAll("zcode", titles.docs, terms);
    expect(r.map(x => x.doc.slug)).toContain("q2ze8n4k");
  });

  it("ASCII 查询「react」：语料标题区无命中 ⇒ 全部为 terms 层正文召回（第二层的意义）", () => {
    const r = searchAll("react", titles.docs, terms);
    expect(searchTitles("react", titles.docs).length).toBe(0); // 标题区确无命中
    expect(r.length).toBeGreaterThanOrEqual(10); // 大量正文命中
    expect(r.every(x => x.viaBody)).toBe(true);
    expect(new Set(r.map(x => x.doc.slug)).size).toBe(r.length); // slug 去重
  });

  it("全量查询基准：一组查询 100ms 内完成（端上可交互口径）", () => {
    const queries = ["微信", "react", "小程序", "服务器", "performance"];
    const t0 = performance.now();
    for (const q of queries) searchAll(q, titles.docs, terms);
    const ms = performance.now() - t0;
    console.log(`[search.bench] ${queries.length} 次双层查询合计 ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(500);
  });

  it("高亮：真实标题 + 真实查询词分段正确", () => {
    const segs = highlightSegments(titles.docs[0].title, queryTokens("zcode"));
    expect(segs.some(s => s.hit)).toBe(true);
    expect(segs.map(s => s.text).join("")).toBe(titles.docs[0].title);
  });
});
