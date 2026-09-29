/**
 * useCollection：按 buildId 拉取集合数据（cache-first，api/collections.ts）。
 */
import { useEffect, useState } from "react";

import { getPostsIndex, getSite, getTags } from "@/services/api/collections";
import type { PostMeta, SitePayload, Tag } from "@/types/api";

export function useSiteData(buildId: string | null) {
  const [site, setSite] = useState<SitePayload | null>(null);
  useEffect(() => {
    if (!buildId) return;
    void getSite(buildId).then(s => s && setSite(s));
  }, [buildId]);
  return site;
}

export function usePostsIndex(buildId: string | null) {
  const [posts, setPosts] = useState<PostMeta[] | null>(null);
  useEffect(() => {
    if (!buildId) return;
    void getPostsIndex(buildId).then(p => p && setPosts(p));
  }, [buildId]);
  return posts;
}

export function useTags(buildId: string | null) {
  const [tags, setTags] = useState<Tag[] | null>(null);
  useEffect(() => {
    if (!buildId) return;
    void getTags(buildId).then(t => t && setTags(t));
  }, [buildId]);
  return tags;
}
