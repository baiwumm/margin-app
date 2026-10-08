/**
 * M1 真机验收打点（A1 清单专用）：
 * - LAUNCH_T0：本模块被求值的时刻 ≈ 小程序启动起点（app.ts 首个 import）
 * - perfLog：带启动偏移的统一日志前缀 [perf]
 * 这里**不 import Taro** —— services/request.ts 也用它，一旦带上 Taro 运行时，
 * node 环境下跑单测就会连带失败（本轮踩过：manifest/request 两个测试文件整文件挂）。
 * 平台侧的探针（getPerformance / 内存告警）在 utils/perfBoot.ts。
 * ⚠️ 打点为验收而保留，M5 提审前统一移除（D21）
 */
export const LAUNCH_T0 = Date.now();

export function perfLog(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[perf +${Date.now() - LAUNCH_T0}ms] ${message}`);
}
