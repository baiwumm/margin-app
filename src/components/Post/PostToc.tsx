/**
 * 本页目录（margin PostDetails.astro `.toc-mobile` + TableOfContents.astro 同构）：
 * 移动端形态就是文章流里的一张可折叠卡（不是桌面端那根 sticky 侧栏，端上也不做
 * sticky —— D20⑤）。数值溯源：卡 border-border/30 + radius 1rem + bg fg 2% +
 * padding .75rem 1rem；标题 12px 大写 .05em fg70%；条目 padding .3rem .5rem、
 * radius .5rem、.85rem/1.45、fg70%，active = accent 字色 + accent/40 文字辉光；
 * 层级缩进 L2 .55rem / L3 1.1rem·.8rem / L4 1.8rem·.75rem。
 * 端上换算按 1rem=32rpx；radius 1rem=32rpx 不在 design.md §2 圆角档（12/24/48/999）
 * 内，取 --r-card 24rpx 与全站卡片一致；卡底 fg 2% 复用 --c-surface-2（同 .mine-row）。
 */
import { Text, View } from "@tarojs/components";
import { useState } from "react";

import type { TocItem } from "@/types/api";
import "./PostToc.scss";

interface PostTocProps {
  items: TocItem[];
  /** scroll-spy 算出的当前命中锚点（.block-h 的 id） */
  activeId: string | null;
  onJump: (id: string) => void;
}

export default function PostToc({ items, activeId, onJump }: PostTocProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className='toc-card'>
      <View
        className='toc-head'
        hoverClass='row-press'
        hoverStayTime={80}
        onClick={() => setOpen(o => !o)}
      >
        <Text className='toc-title'>本页目录</Text>
        <View
          className={`toc-caret ${open ? "toc-caret-open" : ""}`}
        />
      </View>
      {open ? (
        <View className='toc-list'>
          {items.map(item => (
            <View
              key={item.id}
              className={`toc-row ${
                item.depth === 3 ? "toc-l3" : item.depth === 4 ? "toc-l4" : "toc-l2"
              }`}
              hoverClass='row-press'
              hoverStayTime={80}
              onClick={() => onJump(item.id)}
            >
              <Text
                className={`toc-link ${activeId === item.id ? "toc-link-active" : ""}`}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
