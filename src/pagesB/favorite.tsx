/**
 * 我的收藏（M4 步 8；requirements §6.2 分包 B「favorite（本地）」，端上特有——
 * margin 站点无收藏）。列表 = favorites store（addedAt 倒序）× posts index 按
 * slug 取 meta（PostCard 复用，搜索同款）；站点已删除的文章降级为「已失效」行
 * （保留可移除，不静默清用户的收藏）。每项右上 ✕ 移除；空态引导去详情页 ★。
 */
import { Text, View } from "@tarojs/components";
import Taro, { usePageScroll } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import PostCard from "@/components/business/PostCard";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { useManifest } from "@/hooks/useManifest";
import { usePostsIndex } from "@/hooks/useCollection";
import { useRootClass } from "@/hooks/useTheme";
import { readCache } from "@/services/cache";
import {
  FAVORITES_KEY,
  getFavorites,
  hydrateFavorites,
  removeFavorite,
  subscribeFavorites,
  type FavoriteItem,
} from "@/utils/favorites";
import type { PostMeta } from "@/types/api";
import "./favorite.scss";

export default function FavoritePage() {
  const rootCls = useRootClass();
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const posts = usePostsIndex(buildId);
  const [items, setItems] = useState<FavoriteItem[]>(getFavorites());
  const [hydrated, setHydrated] = useState(false);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    void readCache(FAVORITES_KEY).then(raw => {
      hydrateFavorites(raw);
      setHydrated(true);
    });
    return subscribeFavorites(setItems);
  }, []);

  const byslug = useMemo(() => {
    const m = new Map<string, PostMeta>();
    for (const p of posts ?? []) m.set(p.slug, p);
    return m;
  }, [posts]);

  const remove = (slug: string) => {
    removeFavorite(slug);
    void Taro.showToast({ title: "已移除", icon: "none" });
  };

  const RemoveBtn = ({ slug }: { slug: string }) => (
    <View
      className='fav-remove'
      hoverClass='row-press'
      hoverStayTime={80}
      onClick={() => remove(slug)}
    >
      <Text>移除</Text>
    </View>
  );

  const live = items.filter(x => byslug.has(x.slug));
  const gone = items.filter(x => !byslug.has(x.slug));

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='我的收藏' alpha={alpha} />
      <View className='page-body fav'>
        {!hydrated || (items.length > 0 && posts === null) ? (
          <Text className='fav-loading'>加载中…</Text>
        ) : items.length === 0 ? (
          <View className='empty'>
            <Text className='empty-title'>还没有收藏</Text>
            <Text className='empty-desc'>在文章详情页点右上角的 ☆ 收藏这篇文章</Text>
          </View>
        ) : (
          <>
            <View className='fav-meta'>
              <Text className='fav-meta-text'>{items.length} 篇收藏</Text>
            </View>
            <View className='fav-list'>
              {live.map(item => {
                const meta = byslug.get(item.slug)!;
                return (
                  <View key={item.slug} className='fav-item'>
                    <PostCard post={meta} />
                    <RemoveBtn slug={item.slug} />
                  </View>
                );
              })}
              {gone.map(item => (
                <View key={item.slug} className='fav-gone'>
                  <Text className='fav-gone-slug'>{item.slug}</Text>
                  <Text className='fav-gone-hint'>文章已不存在</Text>
                  <RemoveBtn slug={item.slug} />
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}
