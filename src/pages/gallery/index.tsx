import { ScrollView, View, Text } from "@tarojs/components";
import { useMemo, useState , useEffect } from "react";

import { CacheImage } from "@/components/media/CacheImage";
import { getGalleriesIndex, getGalleryDetail } from "@/services/api/collections";
import { useManifest } from "@/hooks/useManifest";
import type { GalleryPhoto, AssetRef } from "@/types/api";
import { useDidShow } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import "./gallery.scss";

interface GallerySummary {
  slug: string;
  title: string;
  photoCount: number;
}

export default function Gallery() {
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(2));
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [galleries, setGalleries] = useState<GallerySummary[] | null>(null);
  const [filter, setFilter] = useState<string>("all"); // D27：全部 + 画廊名
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    if (!buildId) return;
    void getGalleriesIndex(buildId).then(list => {
      if (list) {
        setGalleries(
          list.map(g => ({ slug: g.slug, title: g.title, photoCount: g.photoCount }))
        );
      }
    });
  }, [buildId]);

  useEffect(() => {
    if (!buildId || filter === "all" || !galleries) {
      setPhotos([]);
      return;
    }
    void getGalleryDetail(buildId, filter).then(g => {
      setPhotos(g?.photos ?? []);
    });
  }, [buildId, filter, galleries]);

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
    <View className='page page-bg'>
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
