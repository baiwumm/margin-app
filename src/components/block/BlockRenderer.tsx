/**
 * Block AST 渲染器：纯数据驱动（api-contract §4），按块类型分发。
 * 未知类型落 Unknown 兜底（内容不丢）。
 */
import { View } from "@tarojs/components";

import type { Block } from "@/types/api";
import { CodeBlock } from "./CodeBlock";
import { InlineText } from "./InlineText";
import { BlockImage } from "./BlockImage";
import "./blocks.scss";

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <View className='blocks'>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} index={i} />
      ))}
    </View>
  );
}

function BlockView({ block, index }: { block: Block; index: number }) {
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
      return <BlockImage assetIndex={block.a} alt={block.alt} index={index} />;
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
      // M2：卡片视觉 + 复制链接（D6 一期不外跳）；先做结构化占位
      return (
        <View className='block-linkcard'>
          <View className='block-linkcard-title'>{block.title}</View>
          {block.desc ? (
            <View className='block-linkcard-desc'>{block.desc}</View>
          ) : null}
          <View className='block-linkcard-href'>{block.href}</View>
        </View>
      );
    case "music":
      // M2：MusicPlayer 卡片（D6 降级：卡片 + 复制链接）
      return (
        <View className='block-music'>
          <View className='block-music-platform'>{block.platform}</View>
          <View className='block-music-id'>id: {block.id}</View>
        </View>
      );
    case "video":
      // M2：VideoPlayer（D6：封面 + 跳转/复制）
      return (
        <View className='block-video'>
          <View className='block-video-title'>{block.title ?? block.id ?? block.src}</View>
        </View>
      );
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
