/**
 * 我的页（design.md §3 我的屏，margin AboutLayout + SiteStats + ContributionCalendar
 * 同构）：hero（圆形头像 accent 描边 + glow 昵称 + 简介 + 社交行，外链复制 =
 * D8）+ 统计卡（文章/字数/连续月，margin SiteStats 规格：mono accent 大数 +
 * fg60 标签）+ 贡献日历（stats heatmap 视图网格，accent 强度分级横向滚动）+
 * 功能列表行（surface-2 底圆角行；M4 步 5 起归档/友链/项目/偏好/关于/免责
 * 六行接真，收藏/历史/联系仍占位）+ 版权/备案行（小程序备案号点击复制，验收④）。
 * 数据接线不动：useSiteData + getStats（既有 service 回调模式，不新增 hook）。
 */
import { Image, View, Text } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import Taro, { useDidShow, usePageScroll } from "@tarojs/taro";

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
import { BEIAN_SITE_URL, MINI_PROGRAM_BEIAN } from "@/config/site";
import { setPrefs } from "@/utils/prefs";
import {
  PREFERENCE,
  aboutUrl,
  archiveUrl,
  disclaimerUrl,
  favoriteUrl,
  friendsUrl,
  projectsUrl,
  statsUrl,
} from "@/utils/routes";
import type { Stats } from "@/types/api";
import "./mine.scss";

/** 功能列表行（design.md §3；路由 M2 偏好 / M4 已就绪八行，「关于」为步 5 新增） */
const ROWS = [
  { key: "archive", label: "归档" },
  { key: "favorites", label: "我的收藏" },
  { key: "history", label: "阅读记录" },
  { key: "friends", label: "友链" },
  { key: "projects", label: "项目" },
  { key: "stats", label: "数据看板" },
  { key: "prefs", label: "偏好设置" },
  { key: "contact", label: "联系站长" },
  { key: "about", label: "关于" },
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
    /* 标签防碰撞：53 列摊 12 个月 ≈ 每 4.3 列一个，而「10月」宽约 2.7 列 ⇒ 相邻月必叠
     * （实测 9月/10月 撞成「9月0月」）。按 GitHub 的做法从左到右贪心，间距不足 5 列的
     * 直接不标——宁可少标也不叠字，且不需要「末列右对齐」那种特例。 */
    let lastLabelCol = -99;
    for (let i = 0; i < months.length; i++) {
      if (months[i] === null) continue;
      if (i - lastLabelCol < 5) months[i] = null;
      else lastLabelCol = i;
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
    // M2 偏好 / M4 步 1/3/4/5 归档·友链·项目·关于·免责已就绪；其余（收藏/历史/联系）后续步骤
    if (key === "prefs") {
      void Taro.navigateTo({ url: PREFERENCE });
      return;
    }
    if (key === "favorites") {
      void Taro.navigateTo({ url: favoriteUrl() });
      return;
    }
    if (key === "archive") {
      void Taro.navigateTo({ url: archiveUrl() });
      return;
    }
    if (key === "friends") {
      void Taro.navigateTo({ url: friendsUrl() });
      return;
    }
    if (key === "projects") {
      void Taro.navigateTo({ url: projectsUrl() });
      return;
    }
    if (key === "stats") {
      void Taro.navigateTo({ url: statsUrl() });
      return;
    }
    if (key === "about") {
      void Taro.navigateTo({ url: aboutUrl() });
      return;
    }
    if (key === "disclaimer") {
      void Taro.navigateTo({ url: disclaimerUrl() });
      return;
    }
    void Taro.showToast({ title: `${label}即将上线`, icon: "none" });
  };

  /** 备案号复制（验收④：可见可复制；备案号 + 工信部网址一并进剪贴板，compliance §9） */
  const copyBeian = () => {
    void Taro.setClipboardData({
      data: `${MINI_PROGRAM_BEIAN}\n${BEIAN_SITE_URL}`,
    });
    void Taro.showToast({ title: "已复制备案号", icon: "none" });
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
                  <View key={i} className='heat-month-slot'>
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

        {/* 版权/备案行（验收④落点之一：备案号可见可复制，M4 步 5） */}
        <View className='mine-footer'>
          <Text className='mine-footer-text'>
            © {new Date().getFullYear()} {site?.title ?? "Margin"} · {site?.author}
          </Text>
          <Text className='mine-footer-beian' onClick={copyBeian}>
            {MINI_PROGRAM_BEIAN}
          </Text>
        </View>
      </View>
    </View>
  );
}
