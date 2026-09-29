/**
 * useManifest：manifest 状态与启动流程（api-contract §7）。
 * 首次进入：读本地 manifest（0 等待）→ 无则同步拉一次 → 后台 checkForUpdate。
 */
import { useCallback, useEffect, useState } from "react";

import type { Manifest } from "@/types/api";
import {
  checkForUpdate,
  loadLocalManifest,
} from "@/services/api/manifest";
import { perfLog } from "@/utils/perf";
import { platform } from "@/services/platform";

export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  const bootstrap = useCallback(async () => {
    // ① 读缓存渲染（0 等待）
    const local = await loadLocalManifest();
    setCacheHit(Boolean(local));
    perfLog(
      local
        ? `manifest 缓存命中（buildId=${local.buildId}）`
        : "manifest 无本地缓存（冷启动）"
    );
    // R16：真机存储配额实测（getStorageInfo，不写死）
    try {
      const info = await platform().getStorageInfo();
      perfLog(`存储配额: ${info.currentSize}/${info.limitSize} KB`);
    } catch {
      /* 配额读取失败不阻塞 */
    }
    if (local) {
      setManifest(local);
      setLoading(false);
    }
    // ② 后台版本比对（200 且 buildId 变 → 清旧键 + 更新状态触发刷新）
    const res = await checkForUpdate();
    if (res.ok) {
      const latest = await loadLocalManifest();
      if (latest && latest.buildId !== (local?.buildId ?? "")) {
        setManifest(latest);
      }
      if (!local && latest) {
        setManifest(latest);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return { manifest, loading, cacheHit };
}
