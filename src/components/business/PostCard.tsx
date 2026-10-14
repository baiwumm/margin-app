/**
 * 文章卡（M4 步 2 从 home/index.tsx 抽出共享；margin Card.astro 同构：
 * 标题 → meta（日期 + 阅读时间）→ 两行截断描述 → tag pills）。
 * featured = FEATURED 小节那张的琥珀语义色（margin featured 轮转表）。
 * 点击进详情（path = postDetailUrl，分享 path 固化口径见 routes.ts）。
 * 步 7：highlightTokens 可选 prop = 搜索结果高亮（标题/描述按命中分段渲染，
 * accent 字色）；缺省 undefined 时渲染与旧版逐字一致（home/标签详情不受影响）。
 */
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { postDetailUrl } from "@/utils/routes";
import { formatDateLocal } from "@/utils/date";
import { highlightSegments } from "@/utils/search";
import type { PostMeta } from "@/types/api";
import "./PostCard.scss";

export default function PostCard({
  post,
  featured = false,
  highlightTokens,
}: {
  post: PostMeta;
  featured?: boolean;
  /** 搜索命中词（调用方传完整短语优先的 token 序列，见搜索页 hlTokens） */
  highlightTokens?: string[];
}) {
  const titleSegs = highlightTokens
    ? highlightSegments(post.title, highlightTokens)
    : null;
  const descSegs = highlightTokens
    ? highlightSegments(post.description, highlightTokens)
    : null;
  const renderSegs = (segs: { text: string; hit: boolean }[] | null, plain: string) =>
    segs
      ? segs.map((s, i) =>
          s.hit ? (
            <Text key={i} className='post-card-hl'>
              {s.text}
            </Text>
          ) : (
            <Text key={i}>{s.text}</Text>
          )
        )
      : plain;
  return (
    <View
      className={`post-card card ${featured ? "card-featured" : ""}`}
      hoverClass='card-press'
      hoverStayTime={80}
      onClick={() => void Taro.navigateTo({ url: postDetailUrl(post.slug) })}
    >
      <Text className='post-card-title'>{renderSegs(titleSegs, post.title)}</Text>
      <View className='post-card-meta'>
        <Text className='post-card-date'>{formatDateLocal(post.pubDatetime)}</Text>
        <Text className='post-card-time'>{post.readingTime} 分钟</Text>
      </View>
      <Text className='post-card-desc'>{renderSegs(descSegs, post.description)}</Text>
      {post.tags.length > 0 ? (
        <View className='post-card-tags'>
          {post.tags.slice(0, 4).map(tag => (
            <Text
              key={tag}
              className={`post-card-tag ${featured ? "post-card-tag-featured" : ""}`}
            >
              <Text className='post-card-tag-hash'># </Text>
              {tag}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
