/**
 * CacheImage 三态组件（requirements §4.1）：占位色（avgColor）→ 加载 → 完成/失败。
 * 布局不抖动：width/height 决定占位比例；加载不白闪：avgColor 垫底。
 * 懒加载 lazy；预览用 Taro.previewImage（design.md §4，M2 接长按保存）。
 */
import { Image, View } from "@tarojs/components";
import { useState } from "react";

import type { ComponentProps } from "react";
import type { AssetRef } from "@/types/api";
import "./cache-image.scss";

/** Image 自己的 mode 联合类型（写 string 会让 tsc 在本文件报 TS2322，既有噪声顺手收掉） */
type ImageMode = ComponentProps<typeof Image>["mode"];

interface CacheImageProps {
  asset: AssetRef;
  /** 显示档位覆盖（省流模式列表用 thumb） */
  variant?: "thumb" | "md" | "src";
  mode?: ImageMode;
  className?: string;
  lazy?: boolean;
  /** 点击回调（正文图用来开预览）。默认不挂 ⇒ tab 页行为不变（M1-b 基线冻结） */
  onTap?: () => void;
  /** 长按弹系统菜单（发送给朋友 / 保存图片 / 收藏）——用平台内置，不自造存图 UI */
  longPressMenu?: boolean;
}

type LoadState = "idle" | "loaded" | "error";

export function CacheImage({
  asset,
  variant = "md",
  mode = "widthFix",
  className,
  lazy = true,
  onTap,
  longPressMenu = false,
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
        showMenuByLongpress={longPressMenu}
        className={`cache-image-img ${
          mode === "widthFix" ? "cache-image-img-fix" : "cache-image-img-fill"
        } state-${state}`}
        onClick={onTap}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
      {state === "error" ? (
        <View className='cache-image-fallback'>图片加载失败</View>
      ) : null}
    </View>
  );
}
