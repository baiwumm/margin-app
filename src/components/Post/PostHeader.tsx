/**
 * 文章头（margin PostDetails.astro .post-header 同构，移动端单列）：
 * 居中大标题（text-3xl / leading-tight / font-bold / tracking-tight）
 * + tag 胶囊（accent 20% 描边 + tint 底）+ meta chip 行（日期 / 阅读分钟 /
 * 字数 / 更新于）。margin 原值 chip 底 = bg-muted/10，这里卡片本身已是
 * --c-muted-10（同族卡底），叠上去等于看不见 → chip 只留描边，观感与线上一致。
 * backdrop-blur 不做（D20/D24 禁运行时模糊）；chip 图标待资产管线补（D24）。
 */
import { Text, View } from "@tarojs/components";

import type { PostMeta } from "@/types/api";
import "./PostHeader.scss";

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function PostHeader({ meta }: { meta: PostMeta }) {
  const updated =
    meta.modDatetime && meta.modDatetime.slice(0, 10) !== meta.pubDatetime.slice(0, 10)
      ? formatDate(meta.modDatetime)
      : null;

  return (
    <View className='post-header'>
      <Text className='post-header-title'>{meta.title}</Text>
      {meta.tags.length > 0 ? (
        <View className='post-header-tags'>
          {meta.tags.map(t => (
            <View key={t} className='post-header-tag'>
              <Text className='post-header-tag-hash'>#</Text>
              <Text>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View className='post-header-meta'>
        <View className='post-header-chip'>
          <Text>{formatDate(meta.pubDatetime)}</Text>
        </View>
        <View className='post-header-chip'>
          <Text>{meta.readingTime} 分钟</Text>
        </View>
        <View className='post-header-chip'>
          <Text>{meta.wordCount} 字</Text>
        </View>
        {updated ? (
          <View className='post-header-chip'>
            <Text>更新于 {updated}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
