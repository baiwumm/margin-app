import { View, Text } from "@tarojs/components";

import { useTags } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useDidShow } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import "./tags.scss";

export default function Tags() {
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(1));
  const { manifest } = useManifest();
  const tags = useTags(manifest?.buildId ?? null);

  return (
    <View className={`page page-bg ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <View className='page-title-row'>
        <Text className='page-title'>标签</Text>
      </View>
      <View className='tag-grid'>
        {(tags ?? []).map((tag, i) => (
          <View
            key={tag.slug}
            className='tag-card'
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
