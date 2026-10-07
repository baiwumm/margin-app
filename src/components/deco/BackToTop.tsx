/**
 * 返回顶部（margin BackToTopButton.astro）：44px 圆钮 + accent/15 描边 + 上箭头 +
 * 「TOP」小字，滚过一屏才浮现。
 * 两处端上偏离：① margin 用 conic-gradient 画一圈进度环——conic-gradient 在 WXSS
 * 属 D20 禁赌范围，且顶部进度条已表达同一信息，故不做环；② bg-background/75 +
 * backdrop-blur 不做运行时模糊（D24），改 --c-surface 实底。箭头用边框旋转画，
 * 不新增位图素材。
 */
import { Text, View } from "@tarojs/components";

import "./BackToTop.scss";

export default function BackToTop({
  visible,
  onTop,
}: {
  visible: boolean;
  onTop: () => void;
}) {
  return (
    <View
      className={`btt ${visible ? "btt-on" : ""}`}
      hoverClass='btt-press'
      hoverStayTime={80}
      onClick={onTop}
    >
      <View className='btt-arrow' />
      <Text className='btt-label'>TOP</Text>
    </View>
  );
}
