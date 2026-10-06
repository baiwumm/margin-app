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
import { setPrefs } from "@/utils/prefs";
import { PREFERENCE } from "@/utils/routes";
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

/** 贡献日历窗口：近 53 周（GitHub 日历口径） */
const HEAT_WEEKS = 53;

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

  /** 热力图强度分级：四档 alpha 取 margin gh-level-1..4 原值（32 / 56 / 78 / 100%） */
  const heatColors = useMemo(
    () => [
      "transparent", // 0 级不走这里：空格无内联色，由 .heat-cell 的 --c-fg-16 承担
      accentRgba(accent, theme, 0.32),
      accentRgba(accent, theme, 0.56),
      accentRgba(accent, theme, 0.78),
      accentRgba(accent, theme, 1),
    ],
    [accent, theme]
  );

  /** heatmap（稀疏：只含有文日）→ 近 53 周密集网格（GitHub 日历口径）：周日起始、
   * 缺文日补 0、未来日不渲染。顺带算出月份标签落哪一列（GitHub 规则 = 含当月 1 号的列）
   * 和窗口内单日最大值——强度按它线性分档，否则一年最多 3 篇时整张图只用得上最淡两档。 */
  const heat = useMemo(() => {
    const days = stats?.heatmap ?? [];
    if (days.length === 0) return { cols: [], months: [], max: 0 };
    const counts = new Map(days.map(d => [d.date, d.count]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cur = new Date(today);
    cur.setDate(cur.getDate() - cur.getDay() - (HEAT_WEEKS - 1) * 7);
    const cols: number[][] = [];
    const months: (string | null)[] = [];
    let max = 0;
    for (let w = 0; w < HEAT_WEEKS && cur <= today; w++) {
      const col: number[] = [];
      let monthStart = -1;
      for (let i = 0; i < 7 && cur <= today; i++) {
        if (cur.getDate() === 1) monthStart = cur.getMonth();
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        const c = counts.get(key) ?? 0;
        if (c > max) max = c;
        col.push(c);
        cur.setDate(cur.getDate() + 1);
      }
      cols.push(col);
      months.push(monthStart >= 0 ? `${monthStart + 1}月` : null);
    }
    return { cols, months, max };
  }, [stats]);
  const weeks = heat.cols;

  /** 单日强度：按窗口内最大值线性分 1–4 档（最忙那天必落最深档） */
  const levelOf = (count: number) =>
    Math.min(4, Math.max(1, Math.ceil((count / (heat.max || 1)) * 4)));

  /** 小节计数 = 窗口内贡献数（标题已标「近一年」，与 GitHub「N contributions in the
   * last year」同口径；全量 74 在上方统计卡） */
  const windowContrib = useMemo(
    () => weeks.flat().reduce((s, c) => s + c, 0),
    [weeks]
  );

  const onRow = (key: string, label: string) => {
    // 偏好页 M2 已就绪；其余（收藏/历史/联系/免责声明）M4 前占位
    if (key === "prefs") {
      void Taro.navigateTo({ url: PREFERENCE });
      return;
    }
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
        <SectionTitle title='Activity · 近一年' count={windowContrib > 0 ? `${windowContrib}` : undefined} />
        <View className='mine-heat card'>
          {weeks.length > 0 ? (
            <View className='heat-scroll'>
              <View className='heat-months'>
                {heat.months.map((m, i) => (
                  <View
                    key={i}
                    className={`heat-month-slot ${
                      i >= heat.months.length - 4 ? "heat-month-slot-end" : ""
                    }`}
                  >
                    {m ? <Text className='heat-month-label'>{m}</Text> : null}
                  </View>
                ))}
              </View>
              <View className='heat-grid'>
                {weeks.map((col, ci) => (
                  <View key={ci} className='heat-col'>
                    {col.map((count, di) => (
                      <View
                        key={di}
                        className='heat-cell'
                        style={
                          count > 0
                            ? { backgroundColor: heatColors[levelOf(count)] }
                            : undefined
                        }
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
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
              onClick={() => onRow(row.key, row.label)}
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
                setPrefs({ accent: k }); // D23：accent 持久化闭合（启动水合见 app.ts）
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
