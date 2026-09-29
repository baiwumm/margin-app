import { Image, ScrollView, View, Text } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";

import { getMoments } from "@/services/api/collections";
import { useManifest } from "@/hooks/useManifest";
import type { Moment } from "@/types/api";
import { useDidShow } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import "./moment.scss";

/** 月份键（端上聚合，D20/D34：按 pubDatetime） */
const monthKey = (iso: string) => iso.slice(0, 7); // "2026-09"

export default function MomentPage() {
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(3));
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [month, setMonth] = useState<string>("");

  useEffect(() => {
    if (!buildId) return;
    getMoments(buildId, list => {
      if (list && list.length > 0) {
        setMoments(list);
        // 默认选中最近有数据的月份
        setMonth(monthKey(list[0].pubDatetime));
      }
    });
  }, [buildId]);

  const months = useMemo(() => {
    const set = new Set((moments ?? []).map(m => monthKey(m.pubDatetime)));
    return [...set].sort().reverse();
  }, [moments]);

  const visible = useMemo(
    () => (moments ?? []).filter(m => monthKey(m.pubDatetime) === month),
    [moments, month]
  );

  return (
    <View className={`page page-bg ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* 左上双胶囊（年/本月）+ 居中标题（design.md §1 瞬间屏） */}
      <View className='moment-header'>
        <View className='moment-caps'>
          <View className='moment-cap card-surface'>
            <Text className='moment-cap-text'>{month.slice(0, 4) || "2026"}</Text>
          </View>
          <View className='moment-cap card-surface'>
            <Text className='moment-cap-text'>本月</Text>
          </View>
        </View>
        <Text className='page-title moment-title'>我的日常</Text>
      </View>

      {/* 月份横滚选择器（打样第 5 项） */}
      <ScrollView className='month-scroll' scrollX scrollIntoView={`month-${month}`} enhanced showScrollbar={false}>
        <View className='month-row'>
          {months.map(m => (
            <View
              key={m}
              id={`month-${m}`}
              className={`month-pill ${month === m ? "month-pill-active accent-bg" : "card-surface"}`}
              onClick={() => setMonth(m)}
            >
              <Text className='month-pill-text'>{m.replace("-", " / ")}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 瞬间卡片 */}
      <View className='moment-list'>
        {visible.map((m, i) => (
          <View
            key={m.id}
            className='moment-card card-surface'
            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
          >
            <View className='moment-head'>
              <View className='moment-avatar' />
              <View className='moment-head-text'>
                <Text className='moment-name'>白雾茫茫丶</Text>
                <Text className='moment-date'>{m.pubDatetime.slice(0, 10)}</Text>
              </View>
            </View>
            <Text className='moment-text'>{m.text}</Text>
            {m.images.length > 0 ? (
              <View className='moment-images'>
                {m.images.slice(0, 9).map((img, idx) => (
                  <View key={idx} className='moment-image-cell'>
                    {/* 瞬间图档位仅 400/800（D25/F7） */}
                    {/* 瞬间图 thumb 档（档位仅 400/800，D25/F7） */}
                    <MomentImage url={img.thumb} color={img.avgColor} />
                  </View>
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
