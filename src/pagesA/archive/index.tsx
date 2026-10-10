/**
 * 归档页（M4 步 1；requirements §6.2 分包 A，对应站点 /archives）。
 * 结构对齐站点 archives/index.astro 时间线：年标（年份 + 篇数胶囊）→
 * 月头（N月 + 篇数 + 渐隐线）→ 文章卡（日号 + 标题 + 两行截断描述）。
 * 分组逻辑在同级 utils/archives.ts（纯函数、单测覆盖；本地时区口径见那边注释）。
 *
 * 两处记档偏差：① 站点归档合并画廊（带图标徽章），端上「文章」口径一贯 74
 * （hero/CTA 同数）⇒ 只做博客；② 站点 hero（终端徽章 + glow 大标题）在端上
 * 让位给 SubNavBar + 统计行 —— AuroraHero 留给 tab 页（M1-b 打样基准），
 * 二级页用紧凑头（画廊详情同款先例）。
 */
import { Text, View } from "@tarojs/components";
import Taro, { usePageScroll } from "@tarojs/taro";
import { useMemo, useState } from "react";

import { navAlpha } from "@/components/NavBar/NavBar";
import SubNavBar from "@/components/NavBar/SubNavBar";
import PageBackdrop from "@/components/deco/PageBackdrop";
import { usePostsIndex } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import { archiveDay, archiveGroups } from "@/utils/archives";
import { postDetailUrl } from "@/utils/routes";
import "./index.scss";

export default function ArchivePage() {
  const rootCls = useRootClass();
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const posts = usePostsIndex(buildId);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  const groups = useMemo(() => archiveGroups(posts ?? []), [posts]);
  const yearCount = groups.length;

  const open = (slug: string) => {
    void Taro.navigateTo({ url: postDetailUrl(slug) });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='归档' alpha={alpha} />
      <View className='page-body archive'>
        {posts === null ? (
          <Text className='archive-loading'>加载中…</Text>
        ) : (
          <>
            <View className='archive-stats'>
              <Text className='archive-stats-text'>{posts.length} 篇</Text>
              <Text className='archive-stats-dot'>·</Text>
              <Text className='archive-stats-text'>{yearCount} 年</Text>
            </View>

            <View className='archive-timeline'>
              {groups.map(y => (
                <View key={y.year} className='archive-year'>
                  <View className='archive-year-marker'>
                    <Text className='archive-year-label glow-text'>{y.year}</Text>
                    <Text className='archive-year-count'>{y.months.reduce((s, m) => s + m.posts.length, 0)}</Text>
                  </View>
                  {y.months.map(m => (
                    <View key={m.month} className='archive-month'>
                      <View className='archive-month-header'>
                        <Text className='archive-month-name'>{m.month} 月</Text>
                        <Text className='archive-month-count'>{m.posts.length}</Text>
                        <View className='archive-month-line' />
                      </View>
                      <View className='archive-posts'>
                        {m.posts.map(p => (
                          <View
                            key={p.slug}
                            className='archive-post'
                            hoverClass='card-press'
                            hoverStayTime={80}
                            onClick={() => open(p.slug)}
                          >
                            <View className='archive-post-dot' />
                            <View className='archive-post-inner'>
                              <Text className='archive-post-day'>{archiveDay(p.pubDatetime)}</Text>
                              <View className='archive-post-info'>
                                <Text className='archive-post-title'>{p.title}</Text>
                                {p.description ? (
                                  <Text className='archive-post-desc'>{p.description}</Text>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {posts.length === 0 ? (
              <View className='empty'>
                <Text className='empty-title'>这里还什么都没有</Text>
                <Text className='empty-desc'>文章正在路上，敬请期待。</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
