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
import Taro, { useDidHide, useDidShow, usePageScroll } from "@tarojs/taro";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import PageBackdrop from "@/components/deco/PageBackdrop";
import AuroraHero from "@/components/deco/AuroraHero";
import { CacheImage } from "@/components/media/CacheImage";
import MomentVideo, { pauseMomentVideo } from "@/components/media/MomentVideo";
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
import type { AssetRef, Moment } from "@/types/api";
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
  // D52：页面隐藏（app 后台等）时停掉内嵌视频；导航态由 autoPauseIfNavigate 负责
  useDidHide(() => pauseMomentVideo());
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
              {m.images.length > 0 ? <MomentImages images={m.images} /> : null}
              {/* 视频块（语料 9 条里 1 条有）：自托管 mp4 走原生 <video> 内嵌播放
                   （D52）；非自托管（B 站 id 等）或播放出错时 MomentVideo 内部
                   回退 VideoCard 降级引用卡（D8 无 web-view）。
                   音乐块按语料 0/9 判不做（D51 拍板 B） */}
              {m.video ? <MomentVideo video={m.video} /> : null}
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

/**
 * 瞬间图组（margin MomentCard.astro:39-41/104-115 同规则）：1 图 = 全宽单格；2–3 图 =
 * 按张数列；**>3 图 = 只显示前 2 张 + 第 3 格「+N」**（语料里那条 4 图的会真走到这支）。
 * 点任意一格（含「+N」格）整组进 previewImage，列表 = **本条全部图**（不是屏上那两张），
 * 预览取 src 档 —— 与正文图 D39 同一口径；格子显示仍 thumb（瞬间档位只有 400/800）。
 */
function MomentImages({ images }: { images: AssetRef[] }) {
  const showAll = images.length <= 3;
  const shown = showAll ? images : images.slice(0, 2);
  const rest = showAll ? 0 : images.length - 2;
  const urls = images.map(a => a.src);
  const open = (at: number) => {
    if (!urls[at]) return;
    void Taro.previewImage({ current: urls[at], urls });
  };
  return (
    <View
      className={`moment-images ${images.length === 1 ? "moment-images-single" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${showAll ? Math.min(images.length, 3) : 3}, 1fr)`,
      }}
    >
      {shown.map((img, idx) => (
        <View key={idx} className='moment-image-cell' onClick={() => open(idx)}>
          <CacheImage
            asset={img}
            variant='thumb'
            mode='aspectFill'
            className='moment-image'
          />
        </View>
      ))}
      {rest > 0 ? (
        <View
          className='moment-image-cell moment-image-more'
          hoverClass='row-press'
          onClick={() => open(shown.length)}
        >
          <Text className='moment-image-more-text'>+{rest}</Text>
        </View>
      ) : null}
    </View>
  );
}
