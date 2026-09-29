/**
 * CodeBlock：构建期 Shiki 预高亮 tokens 上色（零运行时解析）。
 * - 配色表由 manifest 下发（机制留接口：BLOCK_CODE_COLORS，M0 时为空表 → 退化为单色）；
 * - 文本由 tokens join 复原（不存纯文本），复制用 tokens 拼接；
 * - 行号 + 语言角标 + file 徽章 + 换行/滚动（M2 接偏好）。
 */
import { Text, View } from "@tarojs/components";

import type { Block, CodeColors } from "@/types/api";

/** 配色表：M0 由 manifest 下发（api-contract §4 CodeColors 索引 c）。
 * 独立模块级变量，M1-b 接 manifest 后由 App 注入。 */
let codeColors: CodeColors[] = [];

export function setCodeColors(colors: CodeColors[]): void {
  codeColors = colors;
}

export function CodeBlock({ block }: { block: Extract<Block, { t: "code" }> }) {
  const copyText = block.tokens.map(line => line.map(t => t.v).join("")).join("\n");

  return (
    <View className='code-block'>
      <View className='code-block-head'>
        <View className='code-block-lang'>{block.lang ?? "text"}</View>
        {block.file ? (
          <View className='code-block-file'>{block.file}</View>
        ) : null}
        <View
          className='code-block-copy'
          // M2 接 Taro.setClipboardData（一期占位）
          data-copy={copyText}
        >
          复制
        </View>
      </View>
      <View className='code-block-body'>
        {block.tokens.map((line, li) => (
          <View key={li} className='code-line'>
            <Text className='code-line-num'>{li + 1}</Text>
            <Text className='code-line-content'>
              {line.length === 0 ? (
                " "
              ) : (
                line.map((token, ti) => {
                  const c = token.c !== undefined ? codeColors[token.c] : undefined;
                  return (
                    <Text
                      key={ti}
                      style={
                        c
                          ? { color: `var(--code-c-${token.c}, #${c.light})` }
                          : undefined
                      }
                    >
                      {token.v}
                    </Text>
                  );
                })
              )}
            </Text>
          </View>
        ))}
      </View>
      <View className='code-block-lines'>{block.lines} 行</View>
    </View>
  );
}
