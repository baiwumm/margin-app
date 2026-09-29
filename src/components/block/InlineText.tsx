/**
 * Inline 文本渲染：text / code / br + bold / italic / strike / link 修饰。
 * link 一期不外跳（D2/D6）：站内链接留待 M2 路由，外链长按复制（视觉上区分色）。
 */
import { Text } from "@tarojs/components";

import type { Inline } from "@/types/api";

export function InlineText({ inlines }: { inlines: Inline[] }) {
  return (
    <Text userSelect>
      {inlines.map((inline, i) => (
        <InlineNode key={i} inline={inline} />
      ))}
    </Text>
  );
}

function InlineNode({ inline }: { inline: Inline }) {
  if (inline.t === "br") return <Text>{"\n"}</Text>;
  if (inline.t === "code") {
    return <Text className='inline-code'>{inline.v}</Text>;
  }
  const cls = [
    inline.bold ? "is-bold" : "",
    inline.italic ? "is-italic" : "",
    inline.strike ? "is-strike" : "",
    inline.link ? (inline.link.external ? "link-ext" : "link-int") : "",
  ]
    .filter(Boolean)
    .join(" ");
  return <Text className={cls || undefined}>{inline.v}</Text>;
}
