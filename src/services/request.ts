/**
 * 统一请求层（requirements §5.9）：GET JSON + ApiEnvelope 校验。
 * - 超时 / 重试（网络类失败重试 1 次）/ 错误归一 LocalError
 * - 并发去重：同 URL 飞行中请求共享同一 Promise
 * - 响应备忘：同 URL 30s 内复用已完成响应（memo 选项，集合层 SWR 与首屏预热共用，D50）
 * - 体积断言：响应体 > 400KB 直接 Budget 错误（requirements §10 单请求硬线）
 * - 304 语义：返回 { notModified: true }，由 manifest 流程消费
 */
import type { ApiEnvelope } from "@/types/api";
import { perfLog } from "@/utils/perf";
import { LocalError, LocalErrorKind } from "./errors";
import { platform } from "./platform";

/** schemaVersion 白名单：只认识 1；不认识 → 软降级信号（D24） */
export const KNOWN_SCHEMA_VERSIONS = [1];

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 400 * 1024;
/** 网络类错误重试次数（0 = 不重试） */
const NETWORK_RETRIES = 1;

export interface RequestResult<T> {
  envelope: ApiEnvelope<T>;
  /** ETag（响应头小写 etag），manifest 304 流程用 */
  etag: string | null;
}

interface FlightEntry {
  promise: Promise<RequestResult<unknown>>;
}

const inflight = new Map<string, FlightEntry>();

/**
 * 30s 内的已完成响应备忘（D50 首屏并发）：
 * 同 URL 的第二次 GET 直接复用上一发结果，不再打网络 —— 集合层 SWR 与
 * 首屏预热（warmFirstScreen）由此共用同一发请求。只记**成功**响应：
 * 失败要能立即重试（离线→上线后不能吃 30s 的旧失败）。
 */
const MEMO_TTL_MS = 30_000;
/** 备忘条数上限（FIFO 淘汰；条目含整个 envelope，64 条足够覆盖首屏+常见详情） */
const MEMO_MAX_ENTRIES = 64;
const memoFlights = new Map<
  string,
  { at: number; result: RequestResult<unknown> }
>();

/** 清空响应备忘（测试隔离用；生产随 app 生命周期自然过期） */
export function resetRequestMemo(): void {
  memoFlights.clear();
}

function utf8Bytes(s: string): number {
  // Blob 仅在运行时可用；手写 UTF-8 长度（纯逻辑可在 node 测）
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.codePointAt(i)!;
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

export function isKnownSchema(v: number): boolean {
  return KNOWN_SCHEMA_VERSIONS.includes(v);
}

async function requestOnce<T>(
  url: string,
  etag: string | null
): Promise<RequestResult<T> | { notModified: true }> {
  const adapter = platform();
  const startedAt = Date.now();
  let res;
  try {
    res = await adapter.request({
      url,
      method: "GET",
      header: {
        accept: "application/json",
        ...(etag ? { "If-None-Match": etag } : {}),
      },
      timeout: REQUEST_TIMEOUT_MS,
    });
  } catch (error) {
    throw new LocalError(
      LocalErrorKind.Network,
      `请求失败 ${url}: ${String(error)}`
    );
  }

  perfLog(`GET ${url} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
  if (res.statusCode === 304) {
    return { notModified: true };
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new LocalError(
      LocalErrorKind.Http,
      `HTTP ${res.statusCode} ${url}`,
      res.statusCode
    );
  }
  if (utf8Bytes(res.data) > MAX_BODY_BYTES) {
    throw new LocalError(
      LocalErrorKind.Budget,
      `响应超 400KB 硬线 ${url}（${utf8Bytes(res.data)}B）`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.data);
  } catch (error) {
    throw new LocalError(LocalErrorKind.Parse, `JSON 解析失败 ${url}`);
  }
  const envelope = parsed as ApiEnvelope<T>;
  if (
    typeof envelope !== "object" ||
    envelope === null ||
    typeof (envelope as ApiEnvelope<T>).schemaVersion !== "number" ||
    typeof (envelope as ApiEnvelope<T>).buildId !== "string" ||
    !("data" in envelope)
  ) {
    throw new LocalError(LocalErrorKind.Parse, `响应不是 ApiEnvelope ${url}`);
  }
  if (!isKnownSchema(envelope.schemaVersion)) {
    throw new LocalError(
      LocalErrorKind.Schema,
      `schemaVersion ${envelope.schemaVersion} 不认识（软降级，D24） ${url}`
    );
  }
  return {
    envelope,
    etag: res.header?.etag ?? res.header?.ETag ?? null,
  };
}

/** GET 一个 /api/v1 JSON；同 URL 并发共享。304 由调用方处理。
 *  options.memo = 30s 内复用同 URL 已完成响应（集合层 SWR / 首屏预热用，D50）。 */
export async function getJson<T>(
  url: string,
  options: { etag?: string | null; dedupe?: boolean; memo?: boolean } = {}
): Promise<RequestResult<T> | { notModified: true }> {
  const dedupe = options.dedupe ?? true;
  const memo = options.memo ?? false;
  const flightKey = `GET ${url} etag=${options.etag ?? ""}`;
  if (dedupe) {
    const flight = inflight.get(flightKey);
    if (flight) return flight.promise as Promise<RequestResult<T>>;
  }
  if (memo) {
    const hit = memoFlights.get(url);
    if (hit && Date.now() - hit.at < MEMO_TTL_MS) {
      return Promise.resolve(hit.result as RequestResult<T>);
    }
  }

  const run = async (): Promise<RequestResult<T> | { notModified: true }> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt++) {
      try {
        return await requestOnce<T>(url, options.etag ?? null);
      } catch (error) {
        lastError = error;
        const kind =
          error instanceof LocalError ? error.kind : LocalErrorKind.Unknown;
        // 只重试网络类失败；Http/Parse/Schema/Budget 不重试
        if (kind !== LocalErrorKind.Network) throw error;
      }
    }
    throw lastError;
  };

  const promise = run()
    .then(result => {
      // 只备忘 200 响应：304 的语义在调用方的 etag 上下文里，复用无意义
      if (memo && !("notModified" in result)) {
        if (memoFlights.size >= MEMO_MAX_ENTRIES) {
          const oldest = memoFlights.keys().next().value;
          if (oldest !== undefined) memoFlights.delete(oldest);
        }
        memoFlights.set(url, {
          at: Date.now(),
          result: result as RequestResult<unknown>,
        });
      }
      return result;
    })
    .finally(() => {
      inflight.delete(flightKey);
    });
  if (dedupe) inflight.set(flightKey, { promise });
  return promise;
}
