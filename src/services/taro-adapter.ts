/**
 * 平台适配的 Taro 实现：把 Taro API 收敛成 platform.ts 的契约接口。
 * 仅此文件 import Taro（services 其余部分保持纯逻辑可测）。
 */
import Taro from "@tarojs/taro";

import type { PlatformAdapter, PlatformResponse } from "./platform";

function headerToRecord(
  header: Record<string, unknown> | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(header ?? {})) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number") out[k] = String(v);
  }
  return out;
}

export const taroAdapter: PlatformAdapter = {
  request(options): Promise<PlatformResponse> {
    return new Promise((resolve, reject) => {
      Taro.request({
        url: options.url,
        method: "GET",
        header: options.header,
        timeout: options.timeout,
        dataType: "text", // request.ts 自己做 JSON 解析与 schema 校验
        responseType: "text",
        success: res => {
          resolve({
            statusCode: res.statusCode,
            data: String(res.data ?? ""),
            header: headerToRecord(res.header as Record<string, unknown>),
          });
        },
        fail: err => reject(new Error(err.errMsg ?? "request fail")),
      } as Taro.request.Option);
    });
  },
  async getStorage(key) {
    try {
      const res = await Taro.getStorage({ key });
      return typeof res.data === "string" ? res.data : null;
    } catch {
      return null; // 键不存在等场景 → null（调用方处理缓存 miss）
    }
  },
  async setStorage(key, value) {
    await Taro.setStorage({ key, data: value });
  },
  async removeStorage(key) {
    try {
      await Taro.removeStorage({ key });
    } catch {
      /* 移除失败不阻塞 */
    }
  },
  async getStorageInfo() {
    const info = Taro.getStorageInfoSync();
    return {
      keys: info.keys ?? [],
      currentSize: info.currentSize ?? 0,
      limitSize: info.limitSize ?? 0,
    };
  },
};
