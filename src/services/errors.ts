/**
 * 错误归一（requirements §5.9）：业务层只接触 LocalError，不接触 HTTP 细节。
 * 网络失败 / 无缓存 → LocalError；有缓存 → 读缓存（api-contract §7 启动流程）。
 */
export enum LocalErrorKind {
  /** 网络失败 / 超时 / abort */
  Network = "network",
  /** 4xx / 5xx */
  Http = "http",
  /** JSON 解析失败 */
  Parse = "parse",
  /** schemaVersion 不认识（软降级信号，D24） */
  Schema = "schema",
  /** 单请求超体积硬线（requirements §10：≤400KB） */
  Budget = "budget",
  /** 其它未归类 */
  Unknown = "unknown",
}

export class LocalError extends Error {
  readonly kind: LocalErrorKind;
  readonly statusCode?: number;

  constructor(kind: LocalErrorKind, message: string, statusCode?: number) {
    super(`[${kind}] ${message}`);
    this.name = "LocalError";
    this.kind = kind;
    if (statusCode !== undefined) this.statusCode = statusCode;
  }
}
