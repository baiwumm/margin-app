/**
 * 阅读记录（M4 步 9；requirements §6.2 分包 B「history（本地）」，端上特有）。
 * 列表 = readHistory store（readAt 倒序）× posts index 按 slug 取 meta
 * （PostCard 复用，收藏页同款）；站点已删除的文章**静默过滤**（历史是自动
 * 行为，不像收藏需要用户确认才能消失）；meta 行带一键清空（showModal 确认）。
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
  READ_HISTORY_KEY,
  clearReadHistory,
  getReadHistory,
  hydrateReadHistory,
  subscribeReadHistory,
  type ReadHistoryItem,
} from "@/utils/readHistory";
import type { PostMeta } from "@/types/api";
import "./history.scss";

export default function HistoryPage() {
  const rootCls = useRootClass();
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const posts = usePostsIndex(buildId);
  const [items, setItems] = useState<ReadHistoryItem[]>(getReadHistory());
  const [ready, setReady] = useState(false);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    void readCache(READ_HISTORY_KEY).then(raw => {
      hydrateReadHistory(raw);
      setReady(true);
    });
    return subscribeReadHistory(setItems);
  }, []);

  /** 展示 = 有 meta 的（已删除文章静默过滤——历史是自动行为），meta 预组装 */
  const visible = useMemo(() => {
    const m = new Map<string, PostMeta>();
    for (const p of posts ?? []) m.set(p.slug, p);
    return items
      .filter(x => m.has(x.slug))
      .map(x => ({ ...x, post: m.get(x.slug)! }));
  }, [items, posts]);

  const onClearAll = () => {
    void Taro.showModal({
      title: "清空阅读记录",
      content: "将删除全部阅读记录，此操作不可恢复。",
      confirmText: "清空",
      confirmColor: "#dc2626",
      success: res => {
        if (res.confirm) clearReadHistory();
      },
    });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='阅读记录' alpha={alpha} />
      <View className='page-body hist'>
        {!ready || (items.length > 0 && posts === null) ? (
          <Text className='hist-loading'>加载中…</Text>
        ) : visible.length === 0 ? (
          <View className='empty'>
            <Text className='empty-title'>还没有阅读记录</Text>
            <Text className='empty-desc'>打开一篇文章，这里就会留下足迹</Text>
          </View>
        ) : (
          <>
            <View className='hist-meta'>
              <Text className='hist-meta-text'>{visible.length} 篇足迹</Text>
              <View className='hist-clear' hoverClass='row-press' onClick={onClearAll}>
                <Text>清空</Text>
              </View>
            </View>
            <View className='hist-list'>
              {visible.map(item => (
                <View key={item.slug} className='hist-item'>
                  <PostCard post={item.post} />
                </View>
              ))}
            </View>          </>
        )}
      </View>
    </View>
  );
}
