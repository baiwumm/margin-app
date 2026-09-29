/**
 * img 块：a = assets 下标（契约瘦身）；assets 由渲染层用 React Context 下发。
 */
import { createContext, useContext } from "react";
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
  return (
    <View className='block-img'>
      <CacheImage asset={asset} variant='md' mode='widthFix' />
      {alt ? <View className='block-img-alt'>{alt}</View> : null}
    </View>
  );
}
