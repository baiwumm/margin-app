import { Image, View, Text } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import { getMoments } from "@/services/api/collections";
import { useSiteData } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import type { Moment } from "@/types/api";
import { useDidShow, usePageScroll } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import "./moment.scss";

/** 月份键（端上聚合，D20/D34：按 pubDatetime） */
const monthKey = (iso: string) => iso.slice(0, 7); // "2026-09"

function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** 6 月一屏的窗口起点（1-6 月 → 当年 1 月；7-12 月 → 当年 7 月，demo 同款对齐） */
function windowStartFor(key: string): string {
  const y = Number(key.slice(0, 4));
  return Number(key.slice(5, 7)) <= 6 ? `${y}-01` : `${y}-07`;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
function formatMomentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(
    d.getDate()
  ).padStart(2, "0")}日 星期${WEEKDAYS[d.getDay()]}`;
}

export default function MomentPage() {
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(3));
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const site = useSiteData(buildId);
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

  /** 数据边界（窗口翻页钳制在此范围内；min = 最早年 1 月，max = 最晚年+1 的 7 月） */
  const bounds = useMemo(() => {
    const keys = (moments ?? []).map(m => monthKey(m.pubDatetime)).sort();
    const thisYear = new Date().getFullYear();
    const min = keys.length ? `${Number(keys[0].slice(0, 4))}-01` : `${thisYear}-01`;
    const max = keys.length
      ? `${Number(keys[keys.length - 1].slice(0, 4)) + 1}-07`
      : `${thisYear}-07`;
    return { min, max };
  }, [moments]);

  /** 当前窗口的 6 个月（连续日历月，空数据月照常显示，选中后展示空态） */
  const cells = useMemo(() => {
    if (!winStart) return [];
    return Array.from({ length: 6 }, (_, i) => addMonths(winStart, i));
  }, [winStart]);

  const shiftWindow = (dir: -1 | 1) => {
    if (!winStart) return;
    const next = addMonths(winStart, dir * 6);
    if (next < bounds.min || next > bounds.max) return;
    setWinStart(next);
  };

  /** 「本月」快捷钮：选中当月并对齐窗口 */
  const goThisMonth = () => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setMonth(key);
    setWinStart(windowStartFor(key));
  };

  const visible = useMemo(
    () => (moments ?? []).filter(m => monthKey(m.pubDatetime) === month),
    [moments, month]
  );

  return (
    <View className={`page page-bg ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* 导航行：左「年份 + 本月」（3.x bg-primary 小方钮）+ 居中标题 */}
      <NavBar
        title='我的日常'
        alpha={alpha}
        left={
          <>
            <View className='moment-cap primary-bg'>
              <Text className='moment-cap-text'>{month.slice(0, 4) || String(new Date().getFullYear())}</Text>
            </View>
            <View className='moment-cap primary-bg' onClick={goThisMonth}>
              <Text className='moment-cap-text'>本月</Text>
            </View>
          </>
        }
      />

      {/* 月份选择器（3.x uh-month-calendar：玻璃卡 6 个月一屏 + 左右翻页） */}
      <View className='month-cal card-surface'>
        <View
          className={`month-cal-arrow ${winStart <= bounds.min ? "month-cal-arrow-off" : ""}`}
          onClick={() => shiftWindow(-1)}
        >
          <Text>‹</Text>
        </View>
        <View className='month-cal-cells'>
          {cells.map(m => (
            <View
              key={m}
              className={`month-cal-cell ${month === m ? "month-cal-cell-active primary-bg" : ""}`}
              onClick={() => setMonth(m)}
            >
              <Text className='month-cal-name'>{Number(m.slice(5, 7))}月</Text>
              <Text className='month-cal-year'>{m.slice(0, 4)}</Text>
            </View>
          ))}
        </View>
        <View
          className={`month-cal-arrow ${winStart >= bounds.max ? "month-cal-arrow-off" : ""}`}
          onClick={() => shiftWindow(1)}
        >
          <Text>›</Text>
        </View>
      </View>

      {/* 瞬间卡片 */}
      <View className='moment-list'>
        {visible.map((m, i) => (
          <View
            key={m.id}
            className='moment-card card-surface'
            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
          >
            <View className='moment-head'>
              <Image
                className='moment-avatar'
                src='https://www.baiwumm.com/avatar.png'
                mode='aspectFill'
              />
              <View className='moment-head-text'>
                <Text className='moment-name'>{site?.author ?? "白雾茫茫丶"}</Text>
                <Text className='moment-date'>{formatMomentDate(m.pubDatetime)}</Text>
              </View>
            </View>
            <Text className='moment-text'>{m.text}</Text>
            {m.images.length > 0 ? (
              <View
                className='moment-images'
                style={{ gridTemplateColumns: `repeat(${Math.min(m.images.length, 3)}, 1fr)` }}
              >
                {m.images.slice(0, 9).map((img, idx) => (
                  <View
                    key={idx}
                    className={`moment-image-cell ${m.images.length === 1 ? "moment-image-single" : ""}`}
                  >
                    {/* 瞬间图 thumb 档（档位仅 400/800，D25/F7） */}
                    <MomentImage url={img.thumb} color={img.avgColor} />
                  </View>
                ))}
              </View>
            ) : null}
            {m.tags.length > 0 ? (
              <View className='moment-tags'>
                {m.tags.map(tag => (
                  <Text key={tag} className='moment-tag'>
                    # {tag}
                  </Text>
                ))}
              </View>
            ) : null}
            <View className='moment-foot'>
              <Text className='moment-foot-item'>♡ 点赞</Text>
              <Text className='moment-foot-item'>☆ 收藏</Text>
            </View>
          </View>
        ))}
        {moments && visible.length === 0 ? (
          <View className='empty'>
            <Text className='empty-text'>呜呜，没有更多数据了~</Text>
          </View>
        ) : null}
      </View>

      {/* 发布入口：一期隐藏（个人主体 UGC 风险，D2/§6.3） */}
    </View>
  );
}

function MomentImage({ url, color }: { url: string; color: string }) {
  return (
    <Image
      src={url}
      mode='aspectFill'
      lazyLoad
      className='moment-image'
      style={{ backgroundColor: color }}
    />
  );
}
