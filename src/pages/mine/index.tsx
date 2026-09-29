import { Image, View, Text } from "@tarojs/components";

import { useSiteData } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useDidShow } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import "./mine.scss";

/** 八宫格（design.md §1 我的屏；demo 的投票中心/恋爱日记/通知公告去掉，D9/D20） */
const GRID = [
  { icon: "⭐", label: "我的收藏" },
  { icon: "🕘", label: "阅读记录" },
  { icon: "📚", label: "笔记归档" },
  { icon: "🔗", label: "友情链接" },
  { icon: "📊", label: "数据看板" },
  { icon: "ℹ️", label: "关于项目" },
  { icon: "📮", label: "联系博主" },
  { icon: "📄", label: "免责声明" },
];

const LIST = ["偏好设置", "免责声明", "关于项目"];

export default function Mine() {
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(4));
  const { manifest } = useManifest();
  const site = useSiteData(manifest?.buildId ?? null);

  return (
    <View className={`page page-bg mine ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* 顶部渐变 + Hero */}
      <View className='mine-hero'>
        <Image
          className='mine-avatar'
          src='https://www.baiwumm.com/avatar.png'
          mode='aspectFill'
        />
        <Text className='mine-name'>{site?.author ?? "白雾茫茫丶"}</Text>
        <Text className='mine-desc'>{site?.desc ?? ""}</Text>
      </View>

      {/* 八宫格 */}
      <View className='mine-grid card-surface'>
        {GRID.map(item => (
          <View key={item.label} className='mine-grid-item'>
            <Text className='mine-grid-icon'>{item.icon}</Text>
            <Text className='mine-grid-label'>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* 其他功能列表 */}
      <View className='mine-list card-surface'>
        {LIST.map(label => (
          <View key={label} className='mine-list-item'>
            <Text className='mine-list-label'>{label}</Text>
            <Text className='mine-list-arrow'>›</Text>
          </View>
        ))}
      </View>

      {/* 底部版权行（备案号展示挂 M4） */}
      <View className='mine-footer'>
        <Text className='mine-footer-text'>
          © {new Date().getFullYear()} {site?.title ?? "Margin"} · {site?.author}
        </Text>
      </View>
    </View>
  );
}
