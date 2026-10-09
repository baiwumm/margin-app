/**
 * 瞬间页（design.md §3 瞬间屏，margin moments/index.astro + MomentCard 同构）：
 * aurora hero（/moments $ ls -la + 动态/图片统计）+ 月份导航（端上组件：
 * 细边框容器 + 左右箭头 + 6 个月份格，选中 = accent 底）+ 瞬间卡
 * （日期头 + 正文 1.85 行距 + 1/2/3 列方图网格 + 弱化 tag）。
 * 数据接线不动：getMoments 回调原样；月份窗口/钳制逻辑原样（端上聚合）。
 * 发布入口一期隐藏（D8）；点赞/收藏行不做（margin 卡无此物，likes 契约 null）；
 * featured ✦精选角标不做（契约 Moment 无 featured 字段，端点未导出）。
 */
import { View, Text } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import { useDidShow, usePageScroll } from "@tarojs/taro";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import PageBackdrop from "@/components/deco/PageBackdrop";
import AuroraHero from "@/components/deco/AuroraHero";
import { CacheImage } from "@/components/media/CacheImage";
import { getMoments } from "@/services/api/collections";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import {
  countsByMonth,
  monthBounds,
  monthKey,
  monthWindow,
  shiftWindow as shiftStart,
  windowStartFor,
} from "@/utils/momentMonths";
import { setSelectedTab } from "@/custom-tab-bar/store";
import type { Moment } from "@/types/api";
import "./moment.scss";

/** margin MomentCard 日期格式：YYYY年M月D日 */
function formatMomentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function MomentPage() {
  const rootCls = useRootClass();
  // 同步 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(3));
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [month, setMonth] = useState<string>("");
  const [winStart, setWinStart] = useState<string>("");
  // 导航滚动渐显（0.05 档量化，控制重渲染频率）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId) return;
    getMoments(buildId, list => {
      if (list && list.length > 0) {
        setMoments(list);
        // 默认选中最近有数据的月份，窗口对齐到所在半年
        const first = monthKey(list[0].pubDatetime);
        setMonth(first);
        setWinStart(windowStartFor(first));
      }
    });
  }, [buildId]);

  /** 数据边界与窗口月份：逻辑挪进 utils/momentMonths（那边单测覆盖跨年窗口与钳制边界） */
  const bounds = useMemo(
    () => monthBounds((moments ?? []).map(m => monthKey(m.pubDatetime))),
    [moments]
  );

  /** 当前窗口的 6 个月（连续日历月，空数据月照常显示，选中后展示空态） */
  const cells = useMemo(() => monthWindow(winStart), [winStart]);

  const shiftWindow = (dir: -1 | 1) => {
    const next = shiftStart(winStart, dir, bounds);
    if (next) setWinStart(next);
  };

  const visible = useMemo(
    () => (moments ?? []).filter(m => monthKey(m.pubDatetime) === month),
    [moments, month]
  );

  const totalImages = useMemo(
    () => (moments ?? []).reduce((sum, m) => sum + m.images.length, 0),
    [moments]
  );

  /** 逐月计数（验收②「月份切换计数正确」就是它，落在每个月份格的小字上） */
  const monthCounts = useMemo(() => countsByMonth(moments ?? []), [moments]);

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <NavBar alpha={alpha} />
      <View className='page-body moment'>
        <AuroraHero
          path='/moments'
          trail='ls -la'
          title='瞬间'
          desc='随手记录的日常动态，像朋友圈一样。'
          badges={[
            `${moments?.length ?? 0} 条动态`,
            ...(totalImages > 0 ? [`${totalImages} 张图片`] : []),
          ]}
        />

        {/* 月份导航（端上组件：细边框容器 + 左右箭头 + 月份格，选中 accent 底） */}
        <View className='month-nav'>
          <View
            className={`month-nav-arrow ${winStart <= bounds.min ? "month-nav-arrow-off" : ""}`}
            hoverClass='row-press'
            onClick={() => shiftWindow(-1)}
          >
            <Text>‹</Text>
          </View>
          <View className='month-nav-cells'>
            {cells.map(m => (
              <View
                key={m}
                className={`month-nav-cell ${month === m ? "month-nav-cell-active" : ""}`}
                onClick={() => setMonth(m)}
              >
                <Text className='month-nav-name'>{Number(m.slice(5, 7))}月</Text>
                <Text className='month-nav-year'>{m.slice(0, 4)}</Text>
                {/* 空数据月也要占一行高，否则六格不齐 */}
                <Text className='month-nav-count'>
                  {monthCounts[m] ? `${monthCounts[m]} 条` : ""}
                </Text>
              </View>
            ))}
          </View>
          <View
            className={`month-nav-arrow ${winStart >= bounds.max ? "month-nav-arrow-off" : ""}`}
            hoverClass='row-press'
            onClick={() => shiftWindow(1)}
          >
            <Text>›</Text>
          </View>
        </View>

        {/* 瞬间卡（margin MomentCard：日期头 + 正文 + 图组 + 弱化 tag） */}
        <View className='moment-list'>
          {visible.map((m, i) => (
            <View
              key={m.id}
              className='moment-card'
              hoverClass='card-press'
              hoverStayTime={80}
              style={{
                animation: "rise-in 0.4s ease both",
                animationDelay: `${Math.min(i * 50, 300)}ms`,
              }}
            >
              <View className='moment-header'>
                <Text className='moment-date'>{formatMomentDate(m.pubDatetime)}</Text>
              </View>
              <Text className='moment-text'>{m.text}</Text>
              {m.images.length > 0 ? (
                <View
                  className={`moment-images ${m.images.length === 1 ? "moment-images-single" : ""}`}
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(m.images.length, 3)}, 1fr)`,
                  }}
                >
                  {m.images.slice(0, 9).map((img, idx) => (
                    <View key={idx} className='moment-image-cell'>
                      {/* 换成 CacheImage：三态与 avgColor 垫底归组件管，内层尺寸它也自己给（D49）。
                          瞬间图档位只有 400/800 ⇒ 格子里取 thumb */}
                      <CacheImage
                        asset={img}
                        variant='thumb'
                        mode='aspectFill'
                        className='moment-image'
                      />
                    </View>
                  ))}
                </View>
              ) : null}
              {m.tags.length > 0 ? (
                <View className='moment-tags'>
                  {m.tags.map(tag => (
                    <Text key={tag} className='moment-tag'>
                      <Text className='moment-tag-hash'># </Text>
                      {tag}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {moments && visible.length === 0 ? (
            <View className='empty'>
              <Text className='empty-title'>这个月还没有动态</Text>
              <Text className='empty-desc'>换个月份看看，或敬请期待新动态。</Text>
            </View>
          ) : null}
        </View>

        {/* 发布入口：一期隐藏（个人主体 UGC 风险，D8） */}
      </View>
    </View>
  );
}
