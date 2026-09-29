/**
 * 终端提示符徽章（margin 首页/各 hero 的 terminal prompt badge，§6 打样件）：
 * ping 圆点 + `~` accent + 路径 + 半透明 `$`（+ 可选尾随命令，如 `ls -la`）。
 * 形态 = accent/border 半透明胶囊 + 等宽小字号。
 */
import { Text, View } from "@tarojs/components";
import "./TerminalBadge.scss";

interface TerminalBadgeProps {
  /** 路径段，如 /ready-to-go、/tags */
  path: string;
  /** 尾随命令（opacity 60%，margin tags 页 `ls -la` 同款） */
  trail?: string;
}

export default function TerminalBadge({ path, trail }: TerminalBadgeProps) {
  return (
    <View className='terminal-badge'>
      <View className='terminal-ping'>
        <View className='terminal-ping-wave' />
        <View className='terminal-ping-dot' />
      </View>
      <Text className='terminal-badge-prefix'>~</Text>
      <Text className='terminal-badge-path'>{path}</Text>
      <Text className='terminal-badge-suffix'>$</Text>
      {trail ? <Text className='terminal-badge-trail'>{trail}</Text> : null}
    </View>
  );
}
