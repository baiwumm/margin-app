/**
 * 页面装饰层（margin Layout.astro site-backdrop 同族）：accent 网格底纹 +
 * 颗粒噪点。放在每页 root View 首位，内容包 .page-body 压在 z-index 1。
 * 降级：不支持 mask 的机型网格自动均匀化（design.md §6/§8 打样第 6 项）。
 */
import { View } from "@tarojs/components";

export default function PageBackdrop() {
  return (
    <>
      <View className='bg-grid' />
      <View className='bg-noise' />
    </>
  );
}
