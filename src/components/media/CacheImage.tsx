/**
 * CacheImage 三态组件（requirements §4.1）：占位色（avgColor）→ 加载 → 完成/失败。
 * 布局不抖动：width/height 决定占位比例；加载不白闪：avgColor 垫底。
 * 懒加载 lazy；预览用 Taro.previewImage（design.md §4，M2 接长按保存）。
 */
import { Image, View } from "@tarojs/components";
import { useState } from "react";

import type { AssetRef } from "@/types/api";

interface CacheImageProps {
  asset: AssetRef;
  /** 显示档位覆盖（省流模式列表用 thumb） */
  variant?: "thumb" | "md" | "src";
  mode?: string;
  className?: string;
  lazy?: boolean;
}

type LoadState = "idle" | "loaded" | "error";

export function CacheImage({
  asset,
  variant = "md",
  mode = "widthFix",
  className,
  lazy = true,
}: CacheImageProps) {
  const [state, setState] = useState<LoadState>("idle");
  const url = asset[variant];
  const width = asset[`${variant}Width`];
  const ratio = width > 0 && asset.height > 0 ? asset.height / width : 0;

  return (
    <View
      className={`cache-image ${className ?? ""}`}
      style={{
        backgroundColor: asset.avgColor,
        ...(ratio > 0 && mode === "aspectFill"
          ? { aspectRatio: `${width} / ${asset.height}` }
          : {}),
      }}
    >
      <Image
        src={url}
        mode={mode}
        lazyLoad={lazy}
        className={`cache-image-img state-${state}`}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
      {state === "error" ? (
        <View className='cache-image-fallback'>图片加载失败</View>
      ) : null}
    </View>
  );
}
