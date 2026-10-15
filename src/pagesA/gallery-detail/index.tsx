/**
 * 画廊详情页（M3 步 5–6；requirements §6.2 分包 A，对应站点 `/galleries/<slug>`）。
 * 头部 = 居中卡（站点 [gallery].astro:117-150 与文章头同一组 Tailwind 类 ⇒ 数值沿用
 * PostHeader.scss 已溯源过的那套）；照片网格 = 站点移动档 2 列方图（.gallery-grid /
 * .gallery-item，:862-898）。大图走 `Taro.previewImage` —— D51 拍板 A：不自造 photo-view。
 * 站点在格子上做的 hover alt 条不做（端上没有 hover，且图注会挤掉方图节奏）。
 */
import { Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { useEffect, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { CacheImage } from "@/components/media/CacheImage";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { getGalleryDetail } from "@/services/api/collections";
import type { Gallery } from "@/types/api";
import "./index.scss";

export default function GalleryDetailPage() {
  const rootCls = useRootClass();
  const { params } = useRouter();
  const slug = params.slug ?? "";
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!buildId || !slug) return;
    let alive = true;
    let got = false;
    setGallery(null);
    setFailed(false);
    void getGalleryDetail(buildId, slug, g => {
      if (!alive) return;
      got = true;
      if (!g) {
        setFailed(true);
        return;
      }
      setGallery(g);
    });
    // 与详情页同一口径：loadWithCache 吞掉网络错误，视图层只能表达「超时仍无数据」
    const timer = setTimeout(() => {
      if (alive && !got) setFailed(true);
    }, 3000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [buildId, slug, reloadKey]);

  const photos = gallery?.photos ?? [];
  const urls = photos.map(p => p.asset.src);
  const open = (at: number) => {
    if (!urls[at]) return;
    void Taro.previewImage({ current: urls[at], urls });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title={gallery?.title ?? ""} />
      <View className='page-body gallery-detail'>
        {gallery ? (
          <>
            <View className='gallery-header'>
              <Text className='gallery-title'>{gallery.title}</Text>
              {gallery.description ? (
                <Text className='gallery-desc'>{gallery.description}</Text>
              ) : null}
              {gallery.tags.length > 0 ? (
                <View className='gallery-tags'>
                  {gallery.tags.map(t => (
                    <View key={t} className='gallery-tag'>
                      <Text className='gallery-tag-hash'>#</Text>
                      <Text>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View className='gallery-count'>
                <Text className='gallery-count-text'>{photos.length} 张图片</Text>
              </View>
            </View>

            <View className='gallery-grid'>
              {photos.map((p, i) => (
                <View
                  key={i}
                  className='gallery-cell'
                  hoverClass='card-press'
                  hoverStayTime={80}
                  onClick={() => open(i)}
                >
                  <CacheImage
                    asset={p.asset}
                    variant='md'
                    mode='aspectFill'
                    className='gallery-cell-img'
                  />
                </View>
              ))}
            </View>
          </>
        ) : failed ? (
          <View className='empty'>
            <Text className='empty-title'>这个画廊没打开</Text>
            <Text className='empty-desc'>可能是网络问题，重试一下。</Text>
            <View
              className='gallery-retry'
              hoverClass='row-press'
              hoverStayTime={80}
              onClick={() => setReloadKey(k => k + 1)}
            >
              <Text>重新加载</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
