/**
 * img 块：a = assets 下标（契约瘦身）；assets 由渲染层用 React Context 下发。
 * 交互（M2 步 7）：点击 = `previewImage` 全屏预览（列表 = 本篇全部正文图，可左右翻），
 * 长按 = 系统菜单（发送给朋友 / 保存图片 / 收藏）——存图用平台内置，不自造 UI；
 * 预览与存图都取 `src` 档（最大档，D13），显示仍用 `md`。
 */
import { createContext, useContext } from "react";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";

import type { AssetRef } from "@/types/api";
import { CacheImage } from "@/components/media/CacheImage";

/** 正文图片上下文：PostDetail.assets 的唯一提供点 */
export const BlockAssetsContext = createContext<AssetRef[]>([]);

export function BlockAssetsProvider({
  assets,
  children,
}: {
  assets: AssetRef[];
  children: React.ReactNode;
}) {
  return (
    <BlockAssetsContext.Provider value={assets}>
      {children}
    </BlockAssetsContext.Provider>
  );
}

export function BlockImage({
  assetIndex,
  alt,
}: {
  assetIndex: number;
  alt?: string;
}) {
  const assets = useContext(BlockAssetsContext);
  const asset = assets[assetIndex];
  if (!asset) {
    return (
      <View className='block-unknown'>
        <View className='block-unknown-note'>图片资源缺失（#{assetIndex}）</View>
      </View>
    );
  }
  /* 预览列表 = 本篇所有有 src 档的正文图（顺序 = assets 文档序）；
   * 当前张用下标定位，避免同一 URL 重复出现时 previewImage 跳错位置 */
  const order = assets.filter(a => !!a.src);
  const at = order.findIndex(a => a.src === asset.src);
  const preview = () => {
    if (at < 0) return;
    void Taro.previewImage({ current: asset.src, urls: order.map(a => a.src) });
  };
  return (
    <View className='block-img'>
      <CacheImage
        asset={asset}
        variant='md'
        mode='widthFix'
        onTap={preview}
        longPressMenu
      />
      {alt ? <View className='block-img-alt'>{alt}</View> : null}
    </View>
  );
}
