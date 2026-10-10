/**
 * 文章卡（M4 步 2 从 home/index.tsx 抽出共享；margin Card.astro 同构：
 * 标题 → meta（日期 + 阅读时间）→ 两行截断描述 → tag pills）。
 * featured = FEATURED 小节那张的琥珀语义色（margin featured 轮转表）。
 * 点击进详情（path = postDetailUrl，分享 path 固化口径见 routes.ts）。
 */
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { postDetailUrl } from "@/utils/routes";
import type { PostMeta } from "@/types/api";
import "./PostCard.scss";

/** margin 文章卡日期格式（与 home/详情头同为 UTC slice 口径，D60 记档） */
function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function PostCard({
  post,
  featured = false,
}: {
  post: PostMeta;
  featured?: boolean;
}) {
  return (
    <View
      className={`post-card card ${featured ? "card-featured" : ""}`}
      hoverClass='card-press'
      hoverStayTime={80}
      onClick={() => void Taro.navigateTo({ url: postDetailUrl(post.slug) })}
    >
      <Text className='post-card-title'>{post.title}</Text>
      <View className='post-card-meta'>
        <Text className='post-card-date'>{formatDate(post.pubDatetime)}</Text>
        <Text className='post-card-time'>{post.readingTime} 分钟</Text>
      </View>
      <Text className='post-card-desc'>{post.description}</Text>
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
