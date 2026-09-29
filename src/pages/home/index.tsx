import { View, Text } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";

import { usePostsIndex, useSiteData, useTags } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { perfLog } from "@/utils/perf";
import type { PostMeta } from "@/types/api";
import { useDidShow } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import "./home.scss";

/** D40：默认 = pubDatetime 降序（posts/index 本身即该序，tabs 里显式重排保险） */
type TabKey = "default" | "featured" | "newest" | "oldest";

const TABS: { key: TabKey; label: string }[] = [
  { key: "default", label: "默认" },
  { key: "featured", label: "置顶" },
  { key: "newest", label: "最新" },
  { key: "oldest", label: "最旧" },
];

/** 快捷导航（3.x 彩底块 + 彩色标签；margin 数据无此项配置，端上静态定义） */
const QUICK_NAV = [
  { icon: "📚", label: "归档", bg: "#FFF4D6", color: "#F59E0B" },
  { icon: "🏷️", label: "标签", bg: "#FDE8EE", color: "#F472B6" },
  { icon: "🖼️", label: "图库", bg: "#D9F2F0", color: "#14B8A6" },
  { icon: "⚡", label: "瞬间", bg: "#E4E7FF", color: "#6366F1" },
  { icon: "🔗", label: "友链", bg: "#DFF5E4", color: "#10B981" },
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
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(0));
  const { manifest, loading, cacheHit } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const site = useSiteData(buildId);
  const posts = usePostsIndex(buildId);
  const tags = useTags(buildId);
  const [tab, setTab] = useState<TabKey>("default");

  // A1：首屏数据渲染完成打点（首个列表数据到达即视为可交互）
  const paintedRef = useRef(false);
  useEffect(() => {
    if (posts && !paintedRef.current) {
      paintedRef.current = true;
      perfLog(
        `首页首屏数据渲染完成（缓存命中: ${cacheHit ?? "?"}，文章 ${posts.length} 篇）`
      );
    }
  }, [posts, cacheHit]);

  const sorted = useMemo(() => (posts ? sortPosts(posts, tab).slice(0, 20) : []), [posts, tab]);
  const hotTags = useMemo(() => (tags ?? []).slice(0, 5), [tags]);

  // D32：announcement = null 整条隐藏不占位
  const announcement = site?.announcement ?? null;

  if (loading && !site) {
    return (
      <View className={`page page-bg ${theme === 'dark' ? 'theme-dark' : ''}`}>
        <View className='skeleton-hero' />
        <View className='skeleton-block card-surface' />
      </View>
    );
  }

  return (
    <View className={`page page-bg ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* ① Hero（D38 图 M1 定稿；3.x 结构：全出血无圆角 + 底部融底渐变） */}
      <View className='hero'>
        <View className='hero-inner'>
          <View className='hero-badge accent-bg'>
            <Text className='hero-badge-text'>{site?.hero ?? site?.desc ?? "Margin"}</Text>
          </View>
          <Text className='hero-date'>{new Date().toLocaleDateString("zh-CN")}</Text>
        </View>
        <View className='hero-fade' />
      </View>

      {/* ② 搜索胶囊（3.x：叠 hero 下缘、居中 80% 宽玻璃胶囊） */}
      <View className='search-pill card-surface'>
        <Text className='search-pill-icon'>🔍</Text>
        <Text className='search-pill-text'>
          哈喽，想看些什么 <Text className='search-pill-hl'>内容</Text> 呢~
        </Text>
      </View>

      {/* ③ 公告条（null 整条隐藏，D32；3.x 三段式：公告标 + 内容 + 全部） */}
      {announcement ? (
        <View className='notice card-surface'>
          <Text className='notice-emoji'>😄</Text>
          <Text className='notice-badge'>公告</Text>
          <Text className='notice-text'>{announcement}</Text>
          <Text className='notice-more'>全部 ›</Text>
        </View>
      ) : null}

      {/* ④ 快捷导航（3.x：彩底玻璃块 + 彩色标签，5 列网格） */}
      <View className='section-head'>
        <Text className='section-title'>快捷导航</Text>
      </View>
      <View className='quick-nav'>
        {QUICK_NAV.map(item => (
          <View key={item.label} className='quick-nav-item'>
            <View
              className='quick-nav-icon card-surface'
              style={{ backgroundColor: item.bg }}
            >
              <Text>{item.icon}</Text>
            </View>
            <Text className='quick-nav-label' style={{ color: item.color }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ⑤ 热门标签（3.x 精选分类同款槽位：左跨行大卡 + 右两小卡拼图；
          margin 无分类数据，按 D45 深底色块渲染标签） */}
      <View className='section-head'>
        <Text className='section-title'>热门标签</Text>
      </View>
      <View className='tag-grid'>
        {hotTags.map((tag, i) => (
          <View
            key={tag.slug}
            className={`tag-card card-surface ${i === 0 ? "tag-card-tall" : ""}`}
            style={{ backgroundColor: tag.color, animationDelay: `${Math.min(i * 50, 300)}ms` }}
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

      {/* ⑥ 最新推荐（D28 文章卡无图；3.x：标题左 + 分段切换右置玻璃容器） */}
      <View className='section-head'>
        <Text className='section-title'>最新推荐</Text>
        <View className='post-tabs card-surface'>
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
                  # {tag}
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
