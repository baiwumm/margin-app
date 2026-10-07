/**
 * CodeBlock：构建期 Shiki 预高亮 tokens 上色（零运行时解析）。
 * - 配色表 = manifest 的 additive 字段 `codeColors`（`utils/codeColors.ts` 读取，
 *   由详情页注入 `setCodeColors`）；表为空（旧版本站点）时退回单色 = 默认字色；
 * - 文本由 tokens join 复原（不存纯文本），复制用 tokens 拼接；
 * - 底色/默认字色取线上 `--shiki-*-bg` / `--shiki-*` 实测原值（margin .astro-code 同源）；
 * - 行号 + 语言角标 + file 徽章 + 横向滚动（换行偏好走 M2 步 9）。
 */
import { ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { useTheme } from "@/hooks/useTheme";
import { SHIKI_SURFACE, tokenColor } from "@/utils/codeColors";
import type { Block, CodeColors } from "@/types/api";

/** 配色表：详情页拿到 manifest 后注入（模块级，整份文档共享） */
let codeColors: CodeColors[] = [];

export function setCodeColors(colors: CodeColors[]): void {
  codeColors = colors;
}

export function CodeBlock({ block }: { block: Extract<Block, { t: "code" }> }) {
  const theme = useTheme();
  const surface = SHIKI_SURFACE[theme];
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
          hoverClass='row-press'
          hoverStayTime={80}
          onClick={() => void Taro.setClipboardData({ data: copyText })}
        >
          复制
        </View>
      </View>
      <ScrollView
        className='code-block-body'
        scrollX
        style={{ backgroundColor: surface.bg }}
      >
        <View className='code-block-rows'>
          {block.tokens.map((line, li) => (
            <View key={li} className='code-line'>
              <Text className='code-line-num'>{li + 1}</Text>
              <Text className='code-line-content' style={{ color: surface.fg }}>
                {line.length === 0 ? (
                  " "
                ) : (
                  line.map((token, ti) => {
                    const col = tokenColor(
                      token.c === undefined ? undefined : codeColors[token.c],
                      theme
                    );
                    /* 无颜色时整对象都不传：style={{color: undefined}} 会被序列化成
                     * 畸形声明 `color:;`，实测足以把渲染层楔住（DOM 查询全部超时） */
                    return (
                      <Text key={ti} style={col ? { color: col } : undefined}>
                        {token.v}
                      </Text>
                    );
                  })
                )}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className='code-block-lines'>{block.lines} 行</View>
    </View>
  );
}
