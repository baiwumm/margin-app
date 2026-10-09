/**
 * Block AST 渲染器：纯数据驱动（api-contract §4），按块类型分发。
 * 未知类型落 Unknown 兜底（内容不丢）。
 */
import { View } from "@tarojs/components";
import { memo } from "react";

import type { Block } from "@/types/api";
import { CodeBlock } from "./CodeBlock";
import { InlineText } from "./InlineText";
import { BlockImage } from "./BlockImage";
import { LinkCardOf, VideoCard } from "./LinkCardBlock";
import MusicBlock from "./MusicBlock";
import "./blocks.scss";

/** memo 的必要性在真机数据上：详情页每滚动一次都会 setState（顶栏渐显 / 进度 / 返回顶部 /
 *  TOC 命中），整棵正文跟着重 diff 就是 iPhone 16 Pro 上那六条 `render:stutter`
 *  （dur 588–1285ms）的来源。blocks 每次换文才变，滚动期间 props 恒等 ⇒ 直接跳过。 */
export const BlockRenderer = memo(function BlockRenderer({
  blocks,
}: {
  blocks: Block[];
}) {
  return (
    <View className='blocks'>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </View>
  );
});

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case "p":
      return (
        <View className='block-p'>
          <InlineText inlines={block.i} />
        </View>
      );
    case "h":
      return (
        <View id={block.id} className={`block-h block-h-${block.d}`}>
          <InlineText inlines={block.i} />
        </View>
      );
    case "img": {
      // a = assets 下标（契约瘦身）；图片本身由 PostDetail.assets 提供给组件树，
      // 这里通过 BlockImages 上下文取（见 BlockImage）。
      return <BlockImage assetIndex={block.a} alt={block.alt} />;
    }
    case "code":
      return <CodeBlock block={block} />;
    case "quote":
      return (
        <View className='block-quote'>
          <InlineText inlines={block.i} />
        </View>
      );
    case "list":
      return (
        <View className={`block-list ${block.ordered ? "is-ordered" : "is-unordered"}`}>
          {block.items.map((item, idx) => (
            <View key={idx} className='block-list-item'>
              <TextTail ord={block.ordered} n={idx + 1} />
              <InlineText inlines={item} />
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View className='block-table'>
          <View className='block-table-row block-table-head'>
            {block.head.map((cell, ci) => (
              <View key={ci} className='block-table-cell'>
                <InlineText inlines={cell} />
              </View>
            ))}
          </View>
          {block.rows.map((row, ri) => (
            <View key={ri} className='block-table-row'>
              {row.map((cell, ci) => (
                <View key={ci} className='block-table-cell'>
                  <InlineText inlines={cell} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case "hr":
      return <View className='block-hr' />;
    case "linkcard":
      return <LinkCardOf block={block} />;
    case "music":
      // 自托管同域 mp3 可直接播；无 audio / 播放失败 ⇒ 卡内降级成复制链接（R4）
      return <MusicBlock block={block} />;
    case "video":
      // 只有 BV 号或异域 src ⇒ 一律降级引用卡（D8 无 web-view，契约 :173）
      return <VideoCard block={block} />;
    case "unknown":
      return (
        <View className='block-unknown'>
          <View className='block-unknown-note'>该内容暂不支持在小程序内展示</View>
        </View>
      );
    default:
      return null;
  }
}

function TextTail({ ord, n }: { ord: boolean; n: number }) {
  if (!ord) return <View className='block-list-dot' />;
  return <View className='block-list-num'>{n}.</View>;
}
