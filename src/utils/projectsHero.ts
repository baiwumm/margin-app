/**
 * 项目页 hero 徽章口径（D66；对齐 margin projects.astro 新徽章：全账号 Stars +
 * 加入 GitHub 时长）。账号级字段由 margin 构建期算好逐项冗余下发（旧 build 数据
 * 没有这两个字段 ⇒ 自动回退「已列项目 Stars/Forks 合计」旧口径，老缓存不破）。
 * 纯函数、零 Taro 依赖，可单测。
 */
import type { ProjectPayload } from "@/types/api";

/** 加入 GitHub 时长（margin projects.astro 同算式：≥1 年按年，不足按月、至少 1 个月） */
export function joinedLabel(joinedAt: string | undefined, now: Date): string | undefined {
  if (!joinedAt) return undefined;
  const start = new Date(joinedAt).getTime();
  if (Number.isNaN(start)) return undefined;
  const ms = now.getTime() - start;
  if (ms < 0) return undefined;
  const years = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
  if (years >= 1) return `${years} 年`;
  return `${Math.max(1, Math.floor(ms / (30 * 24 * 60 * 60 * 1000)))} 个月`;
}

/**
 * hero 徽章文案（站点口径优先，缺账号级字段回退旧口径）：
 * 新 = [全账号 Stars, N 个开源项目, 加入 GitHub N 年]
 * 旧 = [N 个开源项目, 已列项目 Stars 合计, Forks 合计]
 */
export function projectsHeroBadges(
  projects: ProjectPayload[],
  now: Date
): string[] {
  const first = projects[0];
  const total = projects.length;
  if (first?.accountStars !== undefined) {
    const joined = joinedLabel(first.joinedAt, now);
    return [
      `${first.accountStars} Stars`,
      `${total} 个开源项目`,
      ...(joined ? [`加入 GitHub ${joined}`] : []),
    ];
  }
  const stars = projects.reduce((s, p) => s + p.stars, 0);
  const forks = projects.reduce((s, p) => s + p.forks, 0);
  return [
    `${total} 个开源项目`,
    ...(stars > 0 ? [`${stars} Stars`] : []),
    ...(forks > 0 ? [`${forks} Forks`] : []),
  ];
}
