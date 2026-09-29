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

export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    // ① 读缓存渲染（0 等待）
    const local = await loadLocalManifest();
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

  return { manifest, loading };
}
