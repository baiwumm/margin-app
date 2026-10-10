/**
 * 标签详情（M4 步 2；requirements §6.2 分包 A，对应站点 /tags/<tag>）。
 * 站点结构（tags/[tag]/[...page].astro）：Main 头（Tag: + 标签名 + 「包含标签
 * 「X」的全部内容」）+ Card 网格 + 分页。端上：分页不需要（74 篇全量端上切片
 * 惯例），底部按 §5.6/D14 加**共现推荐**（posts-index 现算，站点无此区）。
 * 文章卡 = 共享 PostCard（M4 步 2 从首页抽出）；导航键 = 标签显示名
 * （PostMeta.tags 即显示名，探针 m4-tag-probe.mjs 实量 146/146）。
 */
import { Text, View } from "@tarojs/components";
import Taro, { usePageScroll, useRouter } from "@tarojs/taro";
import { useMemo, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import PostCard from "@/components/business/PostCard";
import { usePostsIndex } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { postsByTag, relatedTags } from "@/utils/tags";
import { tagDetailUrl } from "@/utils/routes";
import "./index.scss";

export default function TagDetailPage() {
  const rootCls = useRootClass();
  const { params } = useRouter();
  const tag = params.tag ?? "";
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const posts = usePostsIndex(buildId);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  const list = useMemo(() => postsByTag(posts ?? [], tag), [posts, tag]);
  const related = useMemo(() => relatedTags(posts ?? [], tag, 8), [posts, tag]);

  const openTag = (name: string) => {
    void Taro.navigateTo({ url: tagDetailUrl(name) });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title={tag} alpha={alpha} />
      <View className='page-body tag-detail'>
        <View className='tag-header'>
          <Text className='tag-header-eyebrow'>Tag:</Text>
          <Text className='tag-header-name'>{tag}</Text>
          <Text className='tag-header-desc'>包含标签「{tag}」的全部内容。</Text>
          {posts ? (
            <View className='tag-header-count'>
              <Text className='tag-header-count-text'>{list.length} 篇</Text>
            </View>
          ) : null}
        </View>

        {posts === null ? (
          <Text className='tag-loading'>加载中…</Text>
        ) : (
          <>
            <View className='tag-posts'>
              {list.map(p => (
                <PostCard key={p.slug} post={p} />
              ))}
            </View>

            {related.length > 0 ? (
              <View className='tag-related'>
                <View className='tag-related-head'>
                  <Text className='tag-related-title'>相关标签</Text>
                  <View className='tag-related-line' />
                </View>
                <View className='tag-related-chips'>
                  {related.map(r => (
                    <View
                      key={r.name}
                      className='tag-related-chip'
                      hoverClass='row-press'
                      hoverStayTime={80}
                      onClick={() => openTag(r.name)}
                    >
                      <Text className='tag-related-hash'># </Text>
                      <Text className='tag-related-name'>{r.name}</Text>
                      <Text className='tag-related-count'>{r.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {list.length === 0 ? (
              <View className='empty'>
                <Text className='empty-title'>这个标签下还没有文章</Text>
                <Text className='empty-desc'>换一个标签看看。</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
