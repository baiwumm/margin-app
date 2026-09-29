/**
 * 统一请求层（requirements §5.9）：GET JSON + ApiEnvelope 校验。
 * - 超时 / 重试（网络类失败重试 1 次）/ 错误归一 LocalError
 * - 并发去重：同 URL 飞行中请求共享同一 Promise
 * - 体积断言：响应体 > 400KB 直接 Budget 错误（requirements §10 单请求硬线）
 * - 304 语义：返回 { notModified: true }，由 manifest 流程消费
 */
import type { ApiEnvelope } from "@/types/api";
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

/** GET 一个 /api/v1 JSON；同 URL 并发共享。304 由调用方处理。 */
export async function getJson<T>(
  url: string,
  options: { etag?: string | null; dedupe?: boolean } = {}
): Promise<RequestResult<T> | { notModified: true }> {
  const dedupe = options.dedupe ?? true;
  const flightKey = `GET ${url} etag=${options.etag ?? ""}`;
  if (dedupe) {
    const flight = inflight.get(flightKey);
    if (flight) return flight.promise as Promise<RequestResult<T>>;
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

  const promise = run().finally(() => {
    inflight.delete(flightKey);
  });
  if (dedupe) inflight.set(flightKey, { promise });
  return promise;
}
