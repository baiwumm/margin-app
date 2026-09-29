import { View, Text } from "@tarojs/components";

import { useTags } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import "./tags.scss";

export default function Tags() {
  const { manifest } = useManifest();
  const tags = useTags(manifest?.buildId ?? null);

  return (
    <View className='page page-bg'>
      <View className='page-title-row'>
        <Text className='page-title'>标签</Text>
      </View>
      <View className='tag-grid'>
        {(tags ?? []).map((tag, i) => (
          <View
            key={tag.slug}
            className='tag-card'
            style={{
              backgroundColor: tag.color,
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
