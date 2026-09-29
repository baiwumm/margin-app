import { Image, View, Text } from "@tarojs/components";
import { useState } from "react";

import NavBar, { navAlpha } from "@/components/NavBar/NavBar";
import { useSiteData } from "@/hooks/useCollection";
import { useManifest } from "@/hooks/useManifest";
import { useDidShow, usePageScroll } from "@tarojs/taro";
import { setSelectedTab } from "@/custom-tab-bar/store";
import { useTheme } from "@/hooks/useTheme";
import "./mine.scss";

/** 八宫格（design.md §1 我的屏；demo 的投票中心/恋爱日记/通知公告去掉，D9/D20；
 *  彩底图标块 + 彩色标签对齐 3.x blogger 宫格形态，配色端上静态定义） */
const GRID = [
  { icon: "⭐", label: "我的收藏", bg: "#FFF4D6", color: "#F59E0B" },
  { icon: "🕘", label: "阅读记录", bg: "#E3ECFF", color: "#4C7DF0" },
  { icon: "📚", label: "笔记归档", bg: "#DFF5E4", color: "#10B981" },
  { icon: "🔗", label: "友情链接", bg: "#D9F2F0", color: "#14B8A6" },
  { icon: "📊", label: "数据看板", bg: "#E4E7FF", color: "#6366F1" },
  { icon: "ℹ️", label: "关于项目", bg: "#EDE9FE", color: "#8B5CF6" },
  { icon: "📮", label: "联系博主", bg: "#FDE8EE", color: "#F472B6" },
  { icon: "📄", label: "免责声明", bg: "#F1F2F4", color: "#6B7280" },
];

/** 其他功能列表（3.x 行结构：图标块 + 标题 + 副标题 + 箭头；路由 M2 接线） */
const LIST = [
  { icon: "⚙️", label: "偏好设置", desc: "字号、布局等设置", bg: "#E4E7FF", color: "#6366F1" },
  { icon: "📄", label: "免责声明", desc: "博客内容免责声明", bg: "#F1F2F4", color: "#6B7280" },
  { icon: "ℹ️", label: "关于项目", desc: "Margin · 静态博客小程序", bg: "#EDE9FE", color: "#8B5CF6" },
];

export default function Mine() {
  const theme = useTheme();
  // 同步悬浮 tabBar 选中态（组件内不可用页面级 hook）
  useDidShow(() => setSelectedTab(4));
  const { manifest } = useManifest();
  const site = useSiteData(manifest?.buildId ?? null);
  // overlay 导航滚动渐显（0.05 档量化，控制重渲染频率）
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  return (
    <View className={`page page-bg mine ${theme === 'dark' ? 'theme-dark' : ''}`}>
      {/* overlay 导航（3.x uh-mine-navbar：透明盖 hero，标题顶部白字滚后转正） */}
      <NavBar title='关于博主' overlay alpha={alpha} />

      {/* Hero（D38：背景图一期打包，先渐变占位——文字用暗色系，图落位后切白字） */}
      <View className='mine-hero'>
        <Image
          className='mine-avatar'
          src='https://www.baiwumm.com/avatar.png'
          mode='aspectFill'
        />
        <Text className='mine-name'>{site?.author ?? "白雾茫茫丶"}</Text>
        <Text className='mine-desc'>{site?.desc ?? ""}</Text>
      </View>

      {/* 八宫格（3.x 玻璃 rounded-3xl 大卡 + 彩底图标块） */}
      <View className='mine-grid card-surface'>
        {GRID.map(item => (
          <View key={item.label} className='mine-grid-item'>
            <View className='mine-grid-icon' style={{ backgroundColor: item.bg }}>
              <Text>{item.icon}</Text>
            </View>
            <Text className='mine-grid-label' style={{ color: item.color }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* 其他功能列表 */}
      <View className='section-head mine-section'>
        <Text className='section-title'>其他功能</Text>
      </View>
      <View className='mine-list card-surface'>
        {LIST.map(item => (
          <View key={item.label} className='mine-list-item'>
            <View className='mine-list-icon' style={{ backgroundColor: item.bg }}>
              <Text>{item.icon}</Text>
            </View>
            <Text className='mine-list-label'>{item.label}</Text>
            <Text className='mine-list-desc'>{item.desc}</Text>
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
