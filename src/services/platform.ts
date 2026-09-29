/**
 * 平台适配层：services 纯逻辑与小程序运行时的唯一边界。
 * app 里由 Taro 实现提供（taroAdapter），单测注入内存 mock —— services 不 import Taro。
 * （R8 同款原则：不深绑平台内部，契约式边界）
 */

export interface PlatformRequestOptions {
  url: string;
  method: "GET" | "HEAD";
  header?: Record<string, string>;
  timeout?: number;
}

export interface PlatformResponse {
  statusCode: number;
  /** 文本响应（JSON）；Taro 默认按 dataType 处理，这里固定收原始 string */
  data: string;
  header: Record<string, string>;
}

export interface StorageInfo {
  /** 全部 storage key */
  keys: string[];
  /** 已用 KB（wx 口径） */
  currentSize: number;
  /** 配额 KB（wx 口径） */
  limitSize: number;
}

export interface PlatformAdapter {
  request(options: PlatformRequestOptions): Promise<PlatformResponse>;
  getStorage(key: string): Promise<string | null>;
  setStorage(key: string, value: string): Promise<void>;
  removeStorage(key: string): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
}

/* ── Taro 实现（app 运行时用）────────────────────────────────────── */

export const taroAdapter: PlatformAdapter = {
  async request(_options) {
    // 动态 import 不行——Taro 需要静态可分析；app 入口在启动时 setAdapter 注入
    throw new Error(
      "taroAdapter 尚未注入实现（应在 app.ts 启动时调用 setPlatformAdapter）"
    );
  },
  async getStorage() {
    throw new Error("taroAdapter 尚未注入实现");
  },
  async setStorage() {
    throw new Error("taroAdapter 尚未注入实现");
  },
  async removeStorage() {
    throw new Error("taroAdapter 尚未注入实现");
  },
  async getStorageInfo() {
    throw new Error("taroAdapter 尚未注入实现");
  },
};

let current: PlatformAdapter = taroAdapter;

/** app.ts 启动时注入 Taro 实现 */
export function setPlatformAdapter(adapter: PlatformAdapter): void {
  current = adapter;
}

export function platform(): PlatformAdapter {
  return current;
}
