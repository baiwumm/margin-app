import { View, Text } from "@tarojs/components";
import { useMemo, useState } from "react";

import { usePostsIndex, useSiteData, useTags } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import type { PostMeta } from "@/types/api";
import "./home.scss";

/** D40：默认 = pubDatetime 降序（posts/index 本身即该序，tabs 里显式重排保险） */
type TabKey = "default" | "featured" | "newest" | "oldest";

const TABS: { key: TabKey; label: string }[] = [
  { key: "default", label: "默认" },
  { key: "featured", label: "置顶" },
  { key: "newest", label: "最新" },
  { key: "oldest", label: "最旧" },
];

function sortPosts(posts: PostMeta[], tab: TabKey): PostMeta[] {
  const byTime = (a: PostMeta, b: PostMeta) =>
    new Date(b.pubDatetime).getTime() - new Date(a.pubDatetime).getTime();
  const list = [...posts];
  switch (tab) {
    case "featured":
      return list.sort((a, b) => Number(b.featured) - Number(a.featured) || byTime(a, b));
    case "newest":
      return list.sort(byTime);
    case "oldest":
      return list.sort((a, b) => byTime(b, a));
    default:
      return list.sort(byTime); // D40
  }
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function Home() {
  const { manifest, loading } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const site = useSiteData(buildId);
  const posts = usePostsIndex(buildId);
  const tags = useTags(buildId);
  const [tab, setTab] = useState<TabKey>("default");

  const sorted = useMemo(() => (posts ? sortPosts(posts, tab).slice(0, 20) : []), [posts, tab]);
  const hotTags = useMemo(() => (tags ?? []).slice(0, 5), [tags]);

  // D32：announcement = null 整条隐藏不占位
  const announcement = site?.announcement ?? null;

  if (loading && !site) {
    return (
      <View className='page page-bg'>
        <View className='skeleton-hero' />
        <View className='skeleton-block' />
      </View>
    );
  }

  return (
    <View className='page page-bg'>
      {/* ① Hero（D38：图 M1 视觉打样定稿，先令牌底 + 文案胶囊） */}
      <View className='hero'>
        <View className='hero-badge accent-bg'>
          <Text className='hero-badge-text'>{site?.hero ?? site?.desc ?? "Margin"}</Text>
        </View>
        <Text className='hero-date'>{new Date().toLocaleDateString("zh-CN")}</Text>
      </View>

      {/* ② 搜索胶囊 */}
      <View className='search-pill card-surface'>
        <Text className='search-pill-text'>
          哈喽，想看些什么 <Text className='search-pill-hl'>内容</Text> 呢~
        </Text>
      </View>

      {/* ③ 公告条（null 整条隐藏，D32） */}
      {announcement ? (
        <View className='notice card-surface'>
          <Text className='notice-text'>{announcement}</Text>
        </View>
      ) : null}

      {/* ④ 快捷导航（5 圆形 emoji） */}
      <View className='quick-nav'>
        {[
          { icon: "📚", label: "归档" },
          { icon: "🏷️", label: "标签" },
          { icon: "🖼️", label: "图库" },
          { icon: "⚡", label: "瞬间" },
          { icon: "🔗", label: "友链" },
        ].map(item => (
          <View key={item.label} className='quick-nav-item'>
            <View className='quick-nav-icon card-surface'>
              <Text>{item.icon}</Text>
            </View>
            <Text className='quick-nav-label'>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ⑤ 热门标签（左跨行大卡 + 右两小卡错落） */}
      <View className='tag-grid'>
        {hotTags.map((tag, i) => (
          <View
            key={tag.slug}
            className={`tag-card ${i === 0 ? "tag-card-tall" : ""}`}
            style={{ backgroundColor: tag.color }}
          >
            <Text className='tag-card-name' style={{ color: tag.ink }}>
              {tag.name}
            </Text>
            <Text className='tag-card-count' style={{ color: tag.ink }}>
              共 {tag.count} 篇笔记
            </Text>
          </View>
        ))}
      </View>

      {/* ⑥ 最新推荐 tabs（D28 文章卡无图） */}
      <View className='section-title-row'>
        <Text className='section-title'>最新推荐</Text>
      </View>
      <View className='post-tabs'>
        {TABS.map(t => (
          <View
            key={t.key}
            className={`post-tab ${tab === t.key ? "post-tab-active accent-bg" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <Text className='post-tab-label'>{t.label}</Text>
          </View>
        ))}
      </View>
      <View className='post-list'>
        {sorted.map((post, i) => (
          <View
            key={post.slug}
            className='post-card card-surface'
            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
          >
            <Text className='post-card-title'>{post.title}</Text>
            <Text className='post-card-desc'>{post.description}</Text>
            <View className='post-card-meta'>
              {post.tags.slice(0, 2).map(tag => (
                <Text key={tag} className='post-card-tag'>
                  {tag}
                </Text>
              ))}
              <Text className='post-card-date'>
                {formatDate(post.pubDatetime)} · {post.readingTime} 分钟
              </Text>
            </View>
          </View>
        ))}
        {sorted.length === 0 && posts ? (
          <View className='empty'>
            <Text className='empty-text'>呜呜，没有更多数据了~</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
