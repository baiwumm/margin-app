/**
 * 数据看板（M4 步 6；requirements §6.2 分包 B「数据看板 stats（对应 margin
 * 贡献日历/统计）」）。站点 ContributionCalendar 拉 GitHub 贡献需 token ⇒ 端上
 * 不做（个人主体无后端）；看板数据 = stats.json 发文热力图（api-contract：按
 * pubDatetime 聚合）+ posts index 按月聚合 + tags 计数，三个 cache-first 源。
 *
 * 结构：站点总览六格 → 全时段发文热力图（mine 53 周窗口的全量版，周日起始/
 * 缺日补 0/未来不渲染，D28 口径，网格与聚合逻辑在 utils/statsData.ts 纯函数）→
 * 发文节奏（按年 12 月柱）→ 标签 Top 10 → 数字小结。
 * 口径：日期一律设备本地（D62）；强度四档 = accent 32/56/78/100%（mine 同款）。
 */
import { ScrollView, Text, View } from "@tarojs/components";
import { usePageScroll } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SectionTitle from "@/components/deco/SectionTitle";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import {
  accentRgba,
  getAccent,
  subscribeAccent,
  type AccentKey,
} from "@/config/accent";
import { useManifest } from "@/hooks/useManifest";
import { usePostsIndex, useTags } from "@/hooks/useCollection";
import { useRootClass, useTheme } from "@/hooks/useTheme";
import { getStats } from "@/services/api/collections";
import type { Stats } from "@/types/api";
import {
  fullHeatmap,
  heatLevel,
  monthlyPosts,
  postsByYear,
  topTags,
} from "@/utils/statsData";
import "./stats.scss";

/** 强度四档 alpha（mine 页贡献日历同款：margin gh-level-1..4 原值） */
const LEVEL_ALPHA = [0.32, 0.56, 0.78, 1];

/** 热力图窗口（D65 追加：格子数随时间线性增长 ≈ 每周 +7 ——默认「近一年」
 *  铺满卡片不滚动，与 margin ContributionCalendar「过去一年」同口径；宽窗口
 *  初始定位到最近端，格子总量始终有界） */
const WINDOWS = [
  { key: "1y", label: "近一年", weeks: 53 },
  { key: "3y", label: "近三年", weeks: 157 },
  { key: "all", label: "全部", weeks: 0 },
] as const;
type WinKey = (typeof WINDOWS)[number]["key"];

/** 总览六格（SiteStats 语言：mono accent 大数 + fg-mid 标签） */
const OVERVIEW = [
  { key: "postCount", label: "篇文章" },
  { key: "galleryCount", label: "个画廊" },
  { key: "tagCount", label: "个标签" },
  { key: "momentCount", label: "条动态" },
  { key: "totalWords", label: "总字数" },
  { key: "streakMonths", label: "连续月" },
] as const;

function formatWords(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : String(n);
}

export default function Stats() {
  const rootCls = useRootClass();
  const theme = useTheme();
  const [accent, setAccentState] = useState<AccentKey>(getAccent());
  useEffect(() => subscribeAccent(setAccentState), []);
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const posts = usePostsIndex(buildId);
  const tags = useTags(buildId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [win, setWin] = useState<WinKey>("1y");
  const [anchor, setAnchor] = useState("");
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId) return;
    // 既有 service 回调模式（同 mine 页 getStats）
    getStats(buildId, setStats);
  }, [buildId]);

  const heat = useMemo(() => {
    const w = WINDOWS.find(x => x.key === win);
    return fullHeatmap(stats?.heatmap ?? [], w?.weeks || undefined);
  }, [stats, win]);

  /** 宽窗口（近三年/全部）内容超出卡片 ⇒ 初始定位到最近端（最右列 = 现在）；
   *  id 随窗口变化，scrollIntoView 属性变化即重新滚动（免 px 换算，D40 同族） */
  useEffect(() => {
    if (win === "1y" || heat.cols.length === 0) {
      setAnchor("");
      return;
    }
    setAnchor(`heat-end-${win}`);
  }, [win, heat.cols.length]);
  const years = useMemo(
    () => postsByYear(monthlyPosts(posts ?? [])),
    [posts]
  );
  const top = useMemo(() => topTags(tags ?? [], 10), [tags]);

  /** 最活跃月（发文最多；并列取最早） */
  const busiest = useMemo(() => {
    const byMonth = monthlyPosts(posts ?? []);
    let best: { ym: string; count: number } | null = null;
    for (const [ym, count] of byMonth) {
      if (!best || count > best.count) best = { ym, count };
    }
    return best;
  }, [posts]);

  const cellColor = (count: number) => {
    const level = heatLevel(count, heat.max);
    if (level === 0) return "var(--c-fg-16)";
    return accentRgba(accent, theme, LEVEL_ALPHA[level - 1]);
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='数据看板' alpha={alpha} />
      <View className='page-body stats'>
        {/* ① 站点总览（六格） */}
        <SectionTitle title='站点总览' />
        <View className='stats-overview'>
          {OVERVIEW.map(cell => {
            const raw = stats ? stats[cell.key] : null;
            const text =
              raw === null
                ? "–"
                : cell.key === "totalWords"
                  ? formatWords(raw)
                  : String(raw);
            return (
              <View key={cell.key} className='stat-cell'>
                <Text className='stat-num'>{text}</Text>
                <Text className='stat-label'>{cell.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ② 全时段发文热力图（窗口化：默认近一年，可切近三年/全部） */}
        <SectionTitle
          title='发文热力图'
          count={stats ? `[${heat.total}/${stats.postCount}]` : undefined}
        />
        <View className='stats-seg'>
          {WINDOWS.map(w => (
            <Text
              key={w.key}
              className={`stats-seg-item ${win === w.key ? "stats-seg-on" : ""}`}
              onClick={() => setWin(w.key)}
            >
              {w.label}
            </Text>
          ))}
        </View>
        {stats === null ? (
          <Text className='stats-loading'>加载中…</Text>
        ) : heat.cols.length === 0 ? (
          <View className='empty'>
            <Text className='empty-title'>还没有任何发文记录</Text>
          </View>
        ) : (
          <View className='heat-card'>
            <ScrollView
              className='heat-scroll'
              scrollX
              showScrollbar={false}
              scrollIntoView={anchor}
              scrollWithAnimation={false}
            >
              {/* 近一年（53 列放得下）走填充模式撑满容器；宽窗口定宽横滚 */}
              <View className={`heat-inner ${win === "1y" ? "heat-inner--fill" : ""}`}>
                {/* 年份标签行（含当年 1 月 1 号的列标年） */}
                <View className='heat-labels'>
                  {heat.years.map((y, i) => (
                    <View key={`y${i}`} className='heat-slot'>
                      {y ? (
                        <Text className='heat-label heat-label-year'>{y}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
                {/* 月份标签行（含当月 1 号的列标月，5 列防碰撞） */}
                <View className='heat-labels'>
                  {heat.months.map((m, i) => (
                    <View key={`m${i}`} className='heat-slot'>
                      {m ? <Text className='heat-label'>{m}</Text> : null}
                    </View>
                  ))}
                </View>
                {/* 网格：每列一周（周日起） */}
                <View className='heat-grid'>
                  {heat.cols.map((col, i) => (
                    <View key={i} className='heat-col'>
                      {col.map((c, j) => (
                        <View
                          key={j}
                          className='heat-cell'
                          style={{ backgroundColor: cellColor(c) }}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                {/* 最近端锚点（宽窗口 scrollIntoView 目标；零尺寸） */}
                <View id={anchor || "heat-end-none"} />
              </View>
            </ScrollView>
            <View className='heat-foot'>
              <View className='heat-legend'>
                <Text className='heat-legend-text'>少</Text>
                <View className='heat-cell heat-cell-legend' style={{ backgroundColor: "var(--c-fg-16)" }} />
                {LEVEL_ALPHA.map(a => (
                  <View
                    key={a}
                    className='heat-cell heat-cell-legend'
                    style={{ backgroundColor: accentRgba(accent, theme, a) }}
                  />
                ))}
                <Text className='heat-legend-text'>多</Text>
              </View>
              <Text className='heat-note'>
                {win === "all" ? "共" : "窗口内"} {heat.total} 篇 · {heat.rendered} 天
              </Text>
            </View>
          </View>
        )}

        {/* ③ 发文节奏（按年 12 月柱） */}
        <SectionTitle title='发文节奏' />
        {posts === null ? (
          <Text className='stats-loading'>加载中…</Text>
        ) : (
          <View className='rhythm-card'>
            {years.map(y => {
              const yearMax = Math.max(...y.months, 1);
              const yearTotal = y.months.reduce((s, n) => s + n, 0);
              return (
                <View key={y.year} className='rhythm-year'>
                  <View className='rhythm-year-head'>
                    <Text className='rhythm-year-label'>{y.year}</Text>
                    <Text className='rhythm-year-total'>{yearTotal} 篇</Text>
                  </View>
                  <View className='rhythm-bars'>
                    {y.months.map((n, m) => (
                      <View key={m} className='rhythm-slot'>
                        <View className='rhythm-track'>
                          {n > 0 ? (
                            <View
                              className='rhythm-fill'
                              style={{
                                height: `${(n / yearMax) * 100}%`,
                                backgroundColor: accentRgba(accent, theme, 0.78),
                              }}
                            />
                          ) : null}
                        </View>
                        <Text className='rhythm-month'>{m + 1}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ④ 标签 Top 10 */}
        <SectionTitle title='标签 Top 10' />
        {tags === null ? (
          <Text className='stats-loading'>加载中…</Text>
        ) : (
          <View className='tag-rank'>
            {top.map((t, i) => (
              <View key={t.name} className='tag-row'>
                <Text className='tag-rank-num'>{i + 1}</Text>
                <Text className='tag-name'>{t.name}</Text>
                <View className='tag-bar-track'>
                  <View
                    className='tag-bar-fill'
                    style={{
                      width: `${(t.count / (top[0]?.count || 1)) * 100}%`,
                      backgroundColor: accentRgba(accent, theme, 0.32),
                    }}
                  />
                </View>
                <Text className='tag-count'>{t.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ⑤ 数字小结 */}
        <SectionTitle title='数字小结' />
        {stats === null || posts === null ? (
          <Text className='stats-loading'>加载中…</Text>
        ) : (
          <View className='summary-card'>
            <View className='summary-row'>
              <Text className='summary-label'>平均每篇字数</Text>
              <Text className='summary-value'>
                {stats.postCount > 0
                  ? Math.round(stats.totalWords / stats.postCount).toLocaleString()
                  : "–"}{" "}
                字
              </Text>
            </View>
            <View className='summary-row'>
              <Text className='summary-label'>全站阅读时长</Text>
              <Text className='summary-value'>约 {stats.readingMinutes} 分钟</Text>
            </View>
            <View className='summary-row'>
              <Text className='summary-label'>最活跃月</Text>
              <Text className='summary-value'>
                {busiest ? `${busiest.ym}（${busiest.count} 篇）` : "–"}
              </Text>
            </View>
            <View className='summary-row'>
              <Text className='summary-label'>连续创作</Text>
              <Text className='summary-value'>{stats.streakMonths} 个月</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
