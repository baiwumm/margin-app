/**
 * 首页（design.md §3 首屏结构，margin index.astro 同构）：
 * 终端徽章（~/ready-to-go $）→ glow 渐变大标题 → 描述行 → 作者 + 社交行
 * （虚线下划线，点击复制链接 = D8 外链口径）→ FEATURED（★ + featured 琥珀
 * tint 卡）→ RECENT（[n/m] 等宽计数 + 纯文字卡）→ 「查看全部文章」outline
 * CTA。无 banner 图、无搜索胶囊、无公告条（margin 首页无对应物，Q 待定）；
 * 文章卡无图（站点 showCoverImages:false 一致）。
 * 数据接线不动：useManifest/useSiteData/usePostsIndex 原样；端上切片上拉加载。
 */
import { View, Text } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDidShow, usePageScroll, useReachBottom } from "@tarojs/taro";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import PageBackdrop from "@/components/deco/PageBackdrop";
import TerminalBadge from "@/components/deco/TerminalBadge";
import SectionTitle from "@/components/deco/SectionTitle";
import { usePostsIndex, useSiteData } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { perfLog } from "@/utils/perf";
import type { PostMeta } from "@/types/api";
import Taro from "@tarojs/taro";
import "./home.scss";

/** RECENT 初始片量 = margin SITE.postPerIndex */
const PAGE_SIZE = 6;

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function PostCard({ post, featured }: { post: PostMeta; featured: boolean }) {
  return (
    <View
      className={`post-card card ${featured ? "card-featured" : ""}`}
      hoverClass='card-press'
      hoverStayTime={80}
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

export default function Home() {
  const rootCls = useRootClass();
  // 同步 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(0));
  const { manifest, loading, cacheHit } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const site = useSiteData(buildId);
  const posts = usePostsIndex(buildId);
  // 导航滚动渐显（0.05 档量化，控制重渲染频率）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

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

  /** FEATURED / RECENT 分流 = margin index.astro（featured 置前，其余按时间序） */
  const { featured, recent } = useMemo(() => {
    const byTime = (a: PostMeta, b: PostMeta) =>
      new Date(b.pubDatetime).getTime() - new Date(a.pubDatetime).getTime();
    const list = [...(posts ?? [])].sort(byTime);
    return {
      featured: list.filter(p => p.featured),
      recent: list.filter(p => !p.featured),
    };
  }, [posts]);

  const [limit, setLimit] = useState(PAGE_SIZE);
  useReachBottom(() => setLimit(n => Math.min(n + PAGE_SIZE, recent.length)));
  const recentSlice = useMemo(() => recent.slice(0, limit), [recent, limit]);

  const copyLink = (url: string) => {
    // D8 外链口径：个人主体无 web-view，外链一律复制剪贴板
    void Taro.setClipboardData({ data: url });
  };

  if (loading && !site) {
    return <View className={`page page-bg ${rootCls}`} />;
  }

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <NavBar alpha={alpha} />
      <View className='page-body home'>
        {/* ① Hero：终端徽章 + glow 标题 + 描述 + 作者/社交行 */}
        <View className='home-hero'>
          <TerminalBadge path='/ready-to-go' />
          <Text className='home-title glow-text'>
            {site?.title ?? "Margin"}
          </Text>
          <Text className='home-desc'>{site?.desc ?? ""}</Text>
          <View className='home-author-row'>
            <Text className='home-author'>
              Written by{" "}
              <Text className='home-author-name'>{site?.author ?? ""}</Text>
            </Text>
          </View>
          {site?.socials && site.socials.length > 0 ? (
            <View className='home-socials'>
              {site.socials.map(s => (
                <Text
                  key={s.name}
                  className='home-social'
                  onClick={() => copyLink(s.url)}
                >
                  {s.name}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* ⑤ FEATURED 小节（featured 琥珀 tint 卡） */}
        {featured.length > 0 ? (
          <View className='home-section'>
            <SectionTitle title='Featured' star />
            <View className='post-list'>
              {featured.map(post => (
                <PostCard key={post.slug} post={post} featured />
              ))}
            </View>
          </View>
        ) : null}

        {/* ⑥ RECENT 小节（[n/m] 计数 + 纯文字卡 + 上拉切片） */}
        <View className='home-section'>
          <SectionTitle
            title='Recent'
            count={`[${recentSlice.length}/${recent.length}]`}
          />
          <View className='post-list'>
            {recentSlice.map((post, i) => (
              <View
                key={post.slug}
                style={{
                  animation: `rise-in 0.4s ease both`,
                  animationDelay: `${Math.min(i * 50, 300)}ms`,
                }}
              >
                <PostCard post={post} featured={false} />
              </View>
            ))}
          </View>
          {recent.length === 0 && posts ? (
            <View className='empty'>
              <Text className='empty-title'>这里还什么都没有</Text>
              <Text className='empty-desc'>文章正在路上，敬请期待。</Text>
            </View>
          ) : null}

          {/* ⑦ outline CTA → 归档（M4 二级页就绪前提示） */}
          <View className='home-cta-row'>
            <View
              className='home-cta'
              hoverClass='home-cta-press'
              hoverStayTime={80}
              onClick={() =>
                void Taro.showToast({ title: "归档即将上线", icon: "none" })
              }
            >
              <Text className='home-cta-text'>查看全部文章</Text>
              <Text className='home-cta-arrow'>→</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
