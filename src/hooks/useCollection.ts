/**
 * 集合数据 hooks：onData 回调模式（首启缓存立即渲染 + 网络到达回填）。
 */
import { useEffect, useState } from "react";

import {
  getGalleriesIndex,
  getPostsIndex,
  getSite,
  getTags,
  type GallerySummary,
} from "@/services/api/collections";
import type { PostMeta, SitePayload, Tag } from "@/types/api";

/** 通用订阅：buildId 变化或组件卸载时安全回填 */
function useCollectionData<T>(
  buildId: string | null,
  loader: (buildId: string, onData: (d: T) => void) => void
): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!buildId) return;
    let alive = true;
    loader(buildId, d => {
      if (alive && d) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [buildId, loader]);
  return data;
}

export function useSiteData(buildId: string | null) {
  return useCollectionData<SitePayload>(buildId, getSite);
}

export function usePostsIndex(buildId: string | null) {
  return useCollectionData<PostMeta[]>(buildId, getPostsIndex);
}

export function useTags(buildId: string | null) {
  return useCollectionData<Tag[]>(buildId, getTags);
}

export function useGalleriesIndex(buildId: string | null) {
  return useCollectionData<GallerySummary[]>(buildId, getGalleriesIndex);
}
