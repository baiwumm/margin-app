/**
 * 我的页（design.md §3 我的屏，margin AboutLayout + SiteStats + ContributionCalendar
 * 同构）：hero（圆形头像 accent 描边 + glow 昵称 + 简介 + 社交行，外链复制 =
 * D8）+ 统计卡（文章/字数/连续月，margin SiteStats 规格：mono accent 大数 +
 * fg60 标签）+ 贡献日历（stats heatmap 视图网格，accent 强度分级横向滚动）+
 * 功能列表行（surface-2 底圆角行；路由 M2/M4 接线，先占位提示）+ 版权行
 * （备案号展示挂 M4，D10）。
 * 数据接线不动：useSiteData + getStats（既有 service 回调模式，不新增 hook）。
 */
import { Image, View, Text } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import { useDidShow, usePageScroll } from "@tarojs/taro";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import PageBackdrop from "@/components/deco/PageBackdrop";
import SectionTitle from "@/components/deco/SectionTitle";
import { getStats } from "@/services/api/collections";
import { useSiteData } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass, useTheme } from "@/hooks/useTheme";
import {
  ACCENT_KEYS,
  accentHex,
  accentRgba,
  getAccent,
  setAccent,
  type AccentKey,
} from "@/config/accent";
import { setSelectedTab } from "@/custom-tab-bar/store";
import type { Stats } from "@/types/api";
import Taro from "@tarojs/taro";
import "./mine.scss";

/** 功能列表行（design.md §3；路由 M2 偏好 / M4 其余，先占位提示） */
const ROWS = [
  { key: "favorites", label: "我的收藏" },
  { key: "history", label: "阅读记录" },
  { key: "prefs", label: "偏好设置" },
  { key: "contact", label: "联系站长" },
  { key: "disclaimer", label: "免责声明" },
];

/** 字数缩写（万） */
function formatWords(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : String(n);
}

export default function Mine() {
  const rootCls = useRootClass();
  const theme = useTheme();
  // 同步 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(4));
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const site = useSiteData(buildId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [accent, setAccentState] = useState<AccentKey>(getAccent());
  // 导航滚动渐显（0.05 档量化，控制重渲染频率）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId) return;
    // 既有 service 回调模式（同 getMoments/getGalleryDetail），不新增 hook
    getStats(buildId, s => setStats(s));
  }, [buildId]);

  /** 热力图强度分级（margin：accent 强度推导，端上按 accent 配置表落值） */
  const heatColors = useMemo(() => {
    const accent = getAccent();
    return [
      "transparent", // 0 级：空格（容器底 fg-6 由格线承担）
      accentRgba(accent, theme, 0.2),
      accentRgba(accent, theme, 0.4),
      accentRgba(accent, theme, 0.65),
      accentRgba(accent, theme, 1),
    ];
  }, [theme]);

  /** heatmap → 周列（周日起始对齐 GitHub 布局；未来日期不渲染） */
  const weeks = useMemo(() => {
    const days = stats?.heatmap ?? [];
    if (days.length === 0) return [];
    const cols: { date: string; count: number }[][] = [];
    let col: { date: string; count: number }[] = [];
    const firstDow = new Date(`${days[0].date}T00:00:00`).getDay();
    for (let i = 0; i < firstDow; i++) col.push(null as never);
    for (const d of days) {
      col.push(d);
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length > 0) cols.push(col);
    return cols;
  }, [stats]);

  const totalContrib = useMemo(
    () => (stats?.heatmap ?? []).reduce((s, d) => s + d.count, 0),
    [stats]
  );

  const onRow = (label: string) => {
    // M2（偏好）/ M4（收藏/历史/联系/免责声明）就绪前占位
    void Taro.showToast({ title: `${label}即将上线`, icon: "none" });
  };

  const copyLink = (url: string) => {
    void Taro.setClipboardData({ data: url });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <NavBar alpha={alpha} />
      <View className='page-body mine'>
        {/* hero：头像 accent 描边 + glow 昵称 + 简介 + 社交行 */}
        <View className='mine-hero'>
          <View className='mine-avatar-ring'>
            <Image
              className='mine-avatar'
              src={site?.avatar || "https://www.baiwumm.com/avatar.png"}
              mode='aspectFill'
            />
          </View>
          <Text className='mine-name glow-text'>{site?.author ?? ""}</Text>
          <Text className='mine-desc'>{site?.desc ?? ""}</Text>
          {site?.socials && site.socials.length > 0 ? (
            <View className='mine-socials'>
              {site.socials.map(s => (
                <Text
                  key={s.name}
                  className='mine-social'
                  onClick={() => copyLink(s.url)}
                >
                  {s.name}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* 统计卡（margin SiteStats：border 25% + muted 10% 底 + mono accent 数） */}
        <View className='mine-stats'>
          <View className='mine-stat'>
            <Text className='mine-stat-num'>{stats?.postCount ?? "–"}</Text>
            <Text className='mine-stat-label'>篇文章</Text>
          </View>
          <View className='mine-stat'>
            <Text className='mine-stat-num'>
              {stats ? formatWords(stats.totalWords) : "–"}
            </Text>
            <Text className='mine-stat-label'>字数</Text>
          </View>
          <View className='mine-stat'>
            <Text className='mine-stat-num'>{stats?.streakMonths ?? "–"}</Text>
            <Text className='mine-stat-label'>连续月</Text>
          </View>
        </View>

        {/* 贡献日历（stats heatmap 视图网格，横向滚动） */}
        <SectionTitle title='Activity' count={totalContrib > 0 ? `${totalContrib}` : undefined} />
        <View className='mine-heat card'>
          {weeks.length > 0 ? (
            <ScrollView className='heat-scroll' scrollX enhanced showScrollbar={false}>
              <View className='heat-grid'>
                {weeks.map((col, ci) => (
                  <View key={ci} className='heat-col'>
                    {col.map((d, di) => (
                      <View
                        key={di}
                        className='heat-cell'
                        style={{
                          backgroundColor:
                            d && d.count > 0
                              ? heatColors[Math.min(4, 1 + Math.floor(Math.log2(d.count + 1)))]
                              : "transparent",
                        }}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text className='heat-empty'>暂无活动数据</Text>
          )}
        </View>

        {/* 功能列表行（surface-2 底圆角行） */}
        <SectionTitle title='More' />
        <View className='mine-rows'>
          {ROWS.map(row => (
            <View
              key={row.key}
              className='mine-row'
              hoverClass='row-press'
              hoverStayTime={80}
              onClick={() => onRow(row.label)}
            >
              <Text className='mine-row-label'>{row.label}</Text>
              <Text className='mine-row-arrow'>›</Text>
            </View>
          ))}
        </View>

        {/* accent 五色圆点（margin accent-dots 形态，即点即换；持久化留 M2） */}
        <SectionTitle title='Accent' />
        <View className='accent-dots'>
          {ACCENT_KEYS.map(k => (
            <View
              key={k}
              className={`accent-dot ${accent === k ? "accent-dot-active" : ""}`}
              style={{ backgroundColor: accentHex(k, theme) }}
              hoverClass='row-press'
              onClick={() => {
                setAccent(k);
                setAccentState(k);
              }}
            />
          ))}
        </View>

        {/* 版权行（备案号展示挂 M4，D10） */}
        <View className='mine-footer'>
          <Text className='mine-footer-text'>
            © {new Date().getFullYear()} {site?.title ?? "Margin"} · {site?.author}
          </Text>
        </View>
      </View>
    </View>
  );
}
