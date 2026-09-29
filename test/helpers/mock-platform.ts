/**
 * 平台适配 mock：内存 storage + 可编程请求路由（单测用）。
 */
import type {
  PlatformAdapter,
  PlatformRequestOptions,
  PlatformResponse,
  StorageInfo,
} from "@/services/platform";

export type RouteHandler = (
  options: PlatformRequestOptions
) => PlatformResponse | Promise<PlatformResponse> | Error;

export class MockPlatform {
  storage = new Map<string, string>();
  routes = new Map<string, RouteHandler>();
  requestLog: string[] = [];

  adapter: PlatformAdapter = {
    request: async (options): Promise<PlatformResponse> => {
      this.requestLog.push(options.url);
      const handler = this.routes.get(options.url);
      if (!handler) throw new Error(`mock: no route for ${options.url}`);
      const result = await handler(options);
      if (result instanceof Error) throw result;
      return result;
    },
    getStorage: async key => this.storage.get(key) ?? null,
    setStorage: async (key, value) => {
      this.storage.set(key, value);
    },
    removeStorage: async key => {
      this.storage.delete(key);
    },
    getStorageInfo: async (): Promise<StorageInfo> => ({
      keys: [...this.storage.keys()],
      // 模拟 wx 口径：KB。用 storage 总字节近似换算，测试可覆盖
      currentSize: Math.ceil(
        [...this.storage.values()].reduce((a, v) => a + v.length, 0) / 1024
      ),
      limitSize: this.limitSizeKb,
    }),
  };

  limitSizeKb = 10 * 1024;

  route(url: string, handler: RouteHandler): void {
    this.routes.set(url, handler);
  }

  json(url: string, body: unknown, etag?: string): void {
    this.route(url, () => ({
      statusCode: 200,
      data: JSON.stringify(body),
      header: etag ? { etag } : {},
    }));
  }

  etagOf(body: unknown): string {
    return `"${JSON.stringify(body).length}"`;
  }

  envelope(data: unknown, buildId = "b1", schemaVersion = 1) {
    return {
      schemaVersion,
      buildId,
      generatedAt: "2026-09-29T00:00:00Z",
      data,
    };
  }
}
