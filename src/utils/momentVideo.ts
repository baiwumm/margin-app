/**
 * 瞬间视频（D52 单元）的纯函数：自托管判定 + 比例归一。
 * 从 MomentVideo.tsx 抽出来的唯一理由是可单测 —— 组件 import 会拖进
 * @tarojs/components 的运行时（ENABLE_INNER_HTML 在 node 里未定义），
 * 纯函数单独成文件测试才不挂（momentMonths.ts 同款先例）。
 */
import { currentBase } from "@/services/api/manifest";

/**
 * 自托管 mp4 的可播绝对地址；非自托管返回 null（调用方回退降级引用卡）。
 * 相对路径必须拼 currentBase()（D52 钉的契约事实：video.src 可以是站内相对路径，
 * 直接消费会复制出打不开的相对地址）。
 */
export function selfHostedVideoSrc(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("/")) return `${currentBase()}${raw}`;
  if (raw.startsWith(`${currentBase()}/`)) return raw;
  return null;
}

/** 比例串（站点 ratio=9/16 形态）转 CSS aspect-ratio；不合法回落 16/9 */
export function frameRatio(ratio: string | undefined): string {
  if (ratio && /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(ratio.trim())) {
    return ratio.trim().replace(/\s+/g, "");
  }
  return "16/9";
}
