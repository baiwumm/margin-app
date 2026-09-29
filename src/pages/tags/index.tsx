import { View, Text } from "@tarojs/components";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import { useTags } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useDidShow, usePageScroll } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import "./tags.scss";

export default function Tags() {
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(1));
  const { manifest } = useManifest();
  const tags = useTags(manifest?.buildId ?? null);
  // 导航滚动渐显（0.05 档量化，控制重渲染频率）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  return (
    <View className={`page page-bg ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <NavBar title='标签' alpha={alpha} />
      <View className='tag-grid'>
        {(tags ?? []).map((tag, i) => (
          <View
            key={tag.slug}
            className='tag-card card-surface'
            style={{
              backgroundColor: theme === "dark" ? tag.colorDark : tag.color,
              animationDelay: `${Math.min(i * 50, 300)}ms`,
            }}
          >
            <Text className='tag-card-name' style={{ color: tag.ink }}>
              {tag.name}
            </Text>
            <Text className='tag-card-count' style={{ color: tag.ink }}>
              共 {tag.count} 篇笔记
            </Text>
          </View>
        ))}
      </View>
      {tags && tags.length === 0 ? (
        <View className='empty'>
          <Text className='empty-text'>呜呜，没有更多数据了~</Text>
        </View>
      ) : null}
    </View>
  );
}
