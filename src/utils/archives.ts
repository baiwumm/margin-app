/**
 * 归档分组（M4 步 1；站点 archives/index.astro 的时间线：年 → 月 → 日卡）。
 *
 * 纯函数。日期口径 = **设备本地时区**（new Date 取年/月/日）—— 与站点
 * dayjs.tz(SITE.timezone) 在用户设备（东八区）一致，也与瞬间卡的
 * formatMomentDate（new Date）一致；home 卡/详情头的 slice(0,10) UTC 是
 * 另一套历史口径（74 篇里 27 篇午夜档两口径差一天，D59/D60 记档），不在本步动。
 *
 * 排序 = 倒序（新年份在前、同年新月份在前、同月新文章在前），与站点一致。
 */
import type { PostMeta } from "@/types/api";

export interface ArchiveMonth {
  /** 1-12 */
  month: number;
  posts: PostMeta[];
}

export interface ArchiveYear {
  year: number;
  months: ArchiveMonth[];
}

function localParts(iso: string): { year: number; month: number } {
  const d = new Date(iso);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** 文章卡的日号（两位，本地时区） */
export function archiveDay(iso: string): string {
  return String(new Date(iso).getDate()).padStart(2, "0");
}

/** 年 → 月 → 文章 的三级分组（全倒序；组内按发布时间新的在前） */
export function archiveGroups(posts: readonly PostMeta[]): ArchiveYear[] {
  const years = new Map<number, Map<number, PostMeta[]>>();
  for (const p of posts) {
    if (Number.isNaN(new Date(p.pubDatetime).getTime())) continue;
    const { year, month } = localParts(p.pubDatetime);
    let months = years.get(year);
    if (!months) {
      months = new Map();
      years.set(year, months);
    }
    let list = months.get(month);
    if (!list) {
      list = [];
      months.set(month, list);
    }
    list.push(p);
  }
  const byTimeDesc = (a: PostMeta, b: PostMeta) =>
    new Date(b.pubDatetime).getTime() - new Date(a.pubDatetime).getTime();
  return [...years.keys()]
    .sort((a, b) => b - a)
    .map(year => ({
      year,
      months: [...years.get(year)!.keys()]
        .sort((a, b) => b - a)
        .map(month => ({
          month,
          posts: years.get(year)!.get(month)!.slice().sort(byTimeDesc),
        })),
    }));
}
