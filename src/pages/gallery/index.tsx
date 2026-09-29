/**
 * 图库页（design.md §3 图库屏，margin galleries/index.astro 同构）：
 * aurora hero（/galleries $ ls -la + 画廊/图片统计）+ 筛选胶囊（全部 +
 * 画廊名(照片数)，激活 = accent 8% 底 + accent 字）+ 画廊卡双列（cover
 * aspect-video + gallery 紫 tint 描边 + 底部名称浮层 + 照片数角标）。
 * 数据接线不动：useGalleriesIndex 出画廊卡，「全部」即全部画廊卡；
 * 选中具体画廊走 getGalleryDetail 出照片网格（M3 详情页再细分）。
 */
import { ScrollView, View, Text } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import { useDidShow, usePageScroll } from "@tarojs/taro";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import PageBackdrop from "@/components/deco/PageBackdrop";
import AuroraHero from "@/components/deco/AuroraHero";
import { CacheImage } from "@/components/media/CacheImage";
import { getGalleryDetail } from "@/services/api/collections";
import { useGalleriesIndex } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { setSelectedTab } from "@/custom-tab-bar/store";
import type { GalleryPhoto } from "@/types/api";
import "./gallery.scss";

export default function Gallery() {
  const rootCls = useRootClass();
  // 同步 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(2));
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const galleries = useGalleriesIndex(buildId);
  const [filter, setFilter] = useState<string>("all");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  // 导航滚动渐显（0.05 档量化，控制重渲染频率）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId || filter === "all") {
      setPhotos([]);
      return;
    }
    // 画廊详情懒加载：数据到达回调回填
    getGalleryDetail(buildId, filter, g => setPhotos(g?.photos ?? []));
  }, [buildId, filter]);

  /** 筛选胶囊（全部 + 画廊名(照片数)） */
  const pills = useMemo(() => {
    const base: { key: string; label: string }[] = [{ key: "all", label: "全部" }];
    for (const g of galleries ?? []) {
      base.push({ key: g.slug, label: `${g.title}(${g.photoCount})` });
    }
    return base;
  }, [galleries]);

  const totalPhotos = useMemo(
    () => (galleries ?? []).reduce((sum, g) => sum + g.photoCount, 0),
    [galleries]
  );

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <NavBar alpha={alpha} />
      <View className='page-body gallery'>
        <AuroraHero
          path='/galleries'
          trail='ls -la'
          title='画廊'
          desc='图片合集，记录瞬间与项目。'
          badges={[
            `${galleries?.length ?? 0} 个画廊`,
            ...(totalPhotos > 0 ? [`${totalPhotos} 张图片`] : []),
          ]}
        >
          {/* 筛选胶囊横滚（margin hero 内 badges 行同位） */}
          <ScrollView
            className='filter-scroll'
            scrollX
            enhanced
            showScrollbar={false}
          >
            <View className='filter-row'>
              {pills.map(p => (
                <View
                  key={p.key}
                  className={`filter-pill ${filter === p.key ? "filter-pill-active" : ""}`}
                  hoverClass='row-press'
                  onClick={() => setFilter(p.key)}
                >
                  <Text className='filter-pill-text'>{p.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </AuroraHero>

        {filter === "all" ? (
          /* 全部 = 画廊卡双列（gallery 紫 tint 描边 + cover + 名称浮层） */
          <View className='gallery-grid'>
            {(galleries ?? []).map((g, i) => (
              <View
                key={g.slug}
                className='gallery-card card card-gallery'
                hoverClass='card-press'
                hoverStayTime={80}
                style={{
                  animation: "rise-in 0.4s ease both",
                  animationDelay: `${Math.min(i * 50, 300)}ms`,
                }}
              >
                <View className='gallery-card-cover'>
                  <CacheImage
                    asset={g.cover}
                    variant='md'
                    mode='aspectFill'
                    className='gallery-card-img'
                  />
                  <View className='gallery-card-overlay' />
                  {g.photoCount > 0 ? (
                    <View className='gallery-card-count'>
                      <Text className='gallery-card-count-text'>
                        {g.photoCount} 张图片
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View className='gallery-card-info'>
                  <Text className='gallery-card-title'>{g.title}</Text>
                  <Text className='gallery-card-desc'>{g.description}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* 具体画廊 = 照片双列网格（详情浏览 M3 细化） */
          <View className='photo-grid'>
            {photos.map((photo, i) => (
              <View
                key={`${photo.name}-${i}`}
                className='photo-cell'
                style={{
                  animation: "rise-in 0.4s ease both",
                  animationDelay: `${Math.min(i * 50, 300)}ms`,
                }}
              >
                <CacheImage
                  asset={photo.asset}
                  variant='thumb'
                  mode='aspectFill'
                  className='photo-img'
                />
                <View className='photo-name-wrap'>
                  <Text className='photo-name'>{photo.name}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {galleries && galleries.length === 0 ? (
          <View className='empty'>
            <Text className='empty-title'>这里还什么都没有</Text>
            <Text className='empty-desc'>画廊正在路上，敬请期待。</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
