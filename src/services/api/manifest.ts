/**
 * manifest：版本比对唯一入口（api-contract §7 启动流程）。
 * ① 读缓存渲染（0 等待）→ ② 后台 GET manifest（If-None-Match）
 * → ③ 304 结束 / 200 且 buildId 变 → 后台刷新 + evictStaleBuildIds。
 *
 * assetBase：运行时一律以 manifest.assetBase 为准（D19：www，无尾斜杠）。
 * 首次 bootstrap（本地无 manifest）需要一个入口域名——DEFAULT_BASE 是全端
 * 唯一的 bootstrap 常量（D19 定死的值），首个 manifest 拉到后即被覆盖。
 */
import type { ApiEnvelope, Manifest } from "@/types/api";
import {
  KEY_MANIFEST,
  evictStaleBuildIds,
  readCache,
  writeCache,
} from "../cache";
import { LocalError, LocalErrorKind } from "../errors";
import { getJson } from "../request";

/** bootstrap 专用（D19），运行时 base 一律来自 manifest.assetBase */
export const DEFAULT_BASE = "https://www.baiwumm.com";

const MANIFEST_PATH = "/api/v1/manifest.json";

/** ETag 持久化键（与 manifest 分开，避免污染快照结构） */
const KEY_MANIFEST_ETAG = "manifest:etag";

export interface ManifestState {
  manifest: Manifest;
  etag: string | null;
}

let cachedState: ManifestState | null = null;

/** 清空模块级 manifest 状态（测试隔离用；生产重进 app 重建） */
export function resetManifestState(): void {
  cachedState = null;
}

function baseFromManifest(manifest: Manifest): string {
  return manifest.assetBase.replace(/\/+$/, "");
}

/** 当前 API base（bootstrap 阶段 = DEFAULT_BASE，之后 = manifest.assetBase） */
export function currentBase(): string {
  return cachedState ? baseFromManifest(cachedState.manifest) : DEFAULT_BASE;
}

export function currentBuildId(): string | null {
  return cachedState?.manifest.buildId ?? null;
}

/** 读本地 manifest（0 网络等待；启动首屏数据源） */
export async function loadLocalManifest(): Promise<Manifest | null> {
  if (cachedState) return cachedState.manifest;
  const raw = await readCache(KEY_MANIFEST);
  if (!raw) return null;
  try {
    cachedState = {
      manifest: (JSON.parse(raw) as ApiEnvelope<Manifest>).data,
      etag: (await readCache(KEY_MANIFEST_ETAG)) ?? null,
    };
    return cachedState.manifest;
  } catch {
    return null;
  }
}

/**
 * 版本比对（启动第二步，后台调用）：
 * - 网络/HTTP 失败 → 返回 { ok: false }（继续用本地缓存，失败模式好）
 * - 304 → { ok: true, changed: false }
 * - 200 → 更新 manifest + ETag；buildId 变 → 清旧键 → { ok: true, changed: true }
 */
export async function checkForUpdate(): Promise<
  | { ok: false }
  | { ok: true; changed: false; buildId: string }
  | { ok: true; changed: true; buildId: string; evicted: string[] }
> {
  const etag = cachedState?.etag ?? (await readCache(KEY_MANIFEST_ETAG)) ?? null;
  // prevBuildId 以「本地已存 manifest」为准（含未加载进内存的重启场景）
  const localManifest = await loadLocalManifest();
  const prevBuildId = localManifest?.buildId ?? null;
  try {
    const result = await getJson<Manifest>(
      `${currentBase()}${MANIFEST_PATH}`,
      { etag, dedupe: false }
    );
    if ("notModified" in result) {
      return { ok: true, changed: false, buildId: prevBuildId ?? "" };
    }
    const { envelope, etag: newEtag } = result;
    const manifest = envelope.data;
    cachedState = { manifest, etag: newEtag };
    await writeCache(
      KEY_MANIFEST,
      JSON.stringify({ schemaVersion: envelope.schemaVersion, buildId: envelope.buildId, generatedAt: envelope.generatedAt, data: manifest })
    );
    if (newEtag) await writeCache(KEY_MANIFEST_ETAG, newEtag);
    if (prevBuildId && prevBuildId !== manifest.buildId) {
      const evicted = await evictStaleBuildIds(manifest.buildId);
      return { ok: true, changed: true, buildId: manifest.buildId, evicted };
    }
    return { ok: true, changed: false, buildId: manifest.buildId };
  } catch (error) {
    // Schema 不认识属于软降级信号（D24）：仍算 ok: false，端上继续用缓存 + 只读认识字段
    if (process.env.VITEST) {
      // 单测可见性：失败路径静默会让 304 回归排查困难
      // eslint-disable-next-line no-console
      console.error("[manifest] checkForUpdate failed:", error);
    }
    void error;
    return { ok: false };
  }
}

export function assertManifestError(
  error: unknown
): error is LocalError {
  return error instanceof LocalError;
}

export { LocalErrorKind };
