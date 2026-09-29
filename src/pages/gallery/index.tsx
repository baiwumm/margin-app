import { ScrollView, View, Text } from "@tarojs/components";
import { useMemo, useState , useEffect } from "react";

import { CacheImage } from "@/components/media/CacheImage";
import { getGalleryDetail } from "@/services/api/collections";
import { useGalleriesIndex } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import type { GalleryPhoto } from "@/types/api";
import { useDidShow } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import "./gallery.scss";

export default function Gallery() {
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(2));
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const galleries = useGalleriesIndex(buildId);
  const [filter, setFilter] = useState<string>("all"); // D27：全部 + 画廊名
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    if (!buildId || filter === "all") {
      setPhotos([]);
      return;
    }
    // 画廊详情懒加载：数据到达回调回填
    getGalleryDetail(buildId, filter, g => setPhotos(g?.photos ?? []));
  }, [buildId, filter]);

  const pills = useMemo(() => {
    const base: { key: string; label: string }[] = [{ key: "all", label: "全部" }];
    for (const g of galleries ?? []) {
      base.push({ key: g.slug, label: `${g.title} ${g.photoCount}` });
    }
    return base;
  }, [galleries]);

  /** all 模式：各画廊封面图聚合（详情数据懒加载，打样先展示封面） */
  const gridItems: { asset: AssetRef; name: string }[] = useMemo(() => {
    void photos;
    return [];
  }, [photos]);

  return (
    <View className={`page page-bg ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <View className='page-title-row'>
        <Text className='page-title'>图库</Text>
      </View>
      {/* D27 横滚筛选胶囊 */}
      <ScrollView className='filter-scroll' scrollX enhanced showScrollbar={false}>
        <View className='filter-row'>
          {pills.map(p => (
            <View
              key={p.key}
              className={`filter-pill ${filter === p.key ? "filter-pill-active accent-bg" : "card-surface"}`}
              onClick={() => setFilter(p.key)}
            >
              <Text className='filter-pill-text'>{p.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {/* 双列图片网格（左下叠文件名） */}
      <View className='photo-grid'>
        {photos.map((photo, i) => (
          <View
            key={`${photo.name}-${i}`}
            className='photo-cell'
            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
          >
            <CacheImage asset={photo.asset} variant='thumb' mode='aspectFill' className='photo-img' />
            <Text className='photo-name'>{photo.name}</Text>
          </View>
        ))}
      </View>
      {galleries && galleries.length === 0 ? (
        <View className='empty'>
          <Text className='empty-text'>呜呜，没有更多数据了~</Text>
        </View>
      ) : null}
      {filter === "all" ? (
        <View className='empty'>
          <Text className='empty-text'>「全部」聚合视图 M1-b 完成详情懒加载后接入</Text>
        </View>
      ) : null}
      {void gridItems}
    </View>
  );
}
