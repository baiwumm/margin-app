import { describe, expect, it } from "vitest";

import { joinedLabel, projectsHeroBadges } from "@/utils/projectsHero";
import type { ProjectPayload } from "@/types/api";

const proj = (over: Partial<ProjectPayload> = {}): ProjectPayload => ({
  name: "p",
  url: "https://github.com/baiwumm/p",
  desc: "",
  lang: null,
  stars: 0,
  forks: 0,
  topics: [],
  ...over,
});

describe("joinedLabel（加入 GitHub 时长，margin projects.astro 同算式）", () => {
  const now = new Date("2026-10-14T00:00:00+08:00");

  it("缺省/非法/未来日期 ⇒ undefined", () => {
    expect(joinedLabel(undefined, now)).toBeUndefined();
    expect(joinedLabel("not-a-date", now)).toBeUndefined();
    expect(joinedLabel("2030-01-01T00:00:00+08:00", now)).toBeUndefined();
  });

  it("≥1 年按年（365.25 口径）", () => {
    expect(joinedLabel("2023-04-29T00:00:00+08:00", now)).toBe("3 年");
    // 差 20 天满 4 年 ⇒ 仍 3 年
    expect(joinedLabel("2022-11-01T00:00:00+08:00", now)).toBe("3 年");
  });

  it("不足 1 年按月、至少 1 个月", () => {
    expect(joinedLabel("2026-09-14T00:00:00+08:00", now)).toBe("1 个月");
    expect(joinedLabel("2026-05-01T00:00:00+08:00", now)).toBe("5 个月");
  });
});

describe("projectsHeroBadges（徽章口径：站点优先，旧数据回退）", () => {
  const now = new Date("2026-10-14T00:00:00+08:00");

  it("有账号级字段 ⇒ 站点新口径（全账号 Stars + N 个开源项目 + 加入时长）", () => {
    const badges = projectsHeroBadges(
      [
        proj({ accountStars: 512, joinedAt: "2019-06-01T00:00:00+08:00" }),
        proj(),
      ],
      now
    );
    expect(badges).toEqual(["512 Stars", "2 个开源项目", "加入 GitHub 7 年"]);
  });

  it("缺 joinedAt ⇒ 只出前两枚", () => {
    const badges = projectsHeroBadges([proj({ accountStars: 512 })], now);
    expect(badges).toEqual(["512 Stars", "1 个开源项目"]);
  });

  it("旧数据（无账号级字段）⇒ 回退旧口径（合计 + Forks）", () => {
    const badges = projectsHeroBadges(
      [proj({ stars: 10, forks: 2 }), proj({ stars: 5, forks: 1 })],
      now
    );
    expect(badges).toEqual(["2 个开源项目", "15 Stars", "3 Forks"]);
  });

  it("旧数据且合计为 0 ⇒ 不渲染 0 值徽章（与站点旧口径的条件渲染一致）", () => {
    expect(projectsHeroBadges([proj()], now)).toEqual(["1 个开源项目"]);
  });

  it("空列表 ⇒ 只出项目数", () => {
    expect(projectsHeroBadges([], now)).toEqual(["0 个开源项目"]);
  });
});
