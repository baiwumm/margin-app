/**
 * 小节标题（margin FEATURED/RECENT 语言，design.md §3）：
 * 大写 accent 标题（可选 ★ 精选星标）+ 横线 + 可选 `[n/m]` 等宽计数。
 * 样式复用 app.scss 的 .section-head 系列。
 */
import { Text, View } from "@tarojs/components";
import "./SectionTitle.scss";

interface SectionTitleProps {
  title: string;
  /** 精选星标（margin FEATURED 标题前的实心 ★） */
  star?: boolean;
  /** 等宽计数，如 [6/68]（调用方带方括号传入） */
  count?: string;
}

export default function SectionTitle({ title, star, count }: SectionTitleProps) {
  return (
    <View className='section-head'>
      <Text className='section-title'>
        {star ? <Text className='section-star'>★ </Text> : null}
        {title}
      </Text>
      <View className='section-line' />
      {count ? <Text className='section-count'>{count}</Text> : null}
    </View>
  );
}
