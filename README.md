# margin-app

[Margin 博客](https://www.baiwumm.com/)（白雾茫茫丶的个人技术站点）的微信小程序阅读端。Taro 4 + React + TypeScript，内容源为 margin 站点构建期导出的静态 JSON（`/api/v1/**`，13 端点），端上零后端、全只读。

## 扫码体验

小程序已发布上线，微信扫码即可访问：

| 微信小程序 | 微信公众号 |
| --- | --- |
| ![微信小程序码](docs/images/miniprogram-qr.jpg) | ![微信公众号二维码](docs/images/official-account-qr.jpg) |

## 功能

- **五个 tab**：首页 / 标签 / 图库 / 瞬间 / 我的（自定义 tabBar，切换保留滚动位置）
- **内容浏览**：文章详情（Block AST 全量块渲染、代码高亮与超长分片、TOC、阅读进度）、归档、标签详情、画廊详情、搜索（标题层 + 全文层双索引，拼音命中）、友链、项目、数据看板
- **端上特有**：偏好设置（明暗主题、五色 accent、字号行距、站点字体、代码换行）、本地收藏、阅读记录、联系站长、免责声明
- **视觉**：对齐 margin 原设计 —— 终端/等宽气质、细边框卡片、aurora/网格/噪点装饰层、双主题 + accent 轮换

## 技术栈

Taro 4.2.1（webpack5）· React 18.3.1 · TypeScript strict · Tailwind v4 + weapp-tailwindcss 5 · pnpm · Vitest

## 快速开始

```bash
pnpm install
pnpm dev:weapp      # 监听构建，产物落 dist/
pnpm build:weapp    # 生产构建
```

1. 微信开发者工具导入项目根目录（`project.config.json` 的 `miniprogramRoot` 已指向 `dist/`）
2. 内容直接消费线上静态 JSON（`https://www.baiwumm.com/api/v1/**`），本地无需起任何服务
3. 域名白名单、AppID、备案等账号侧事实见 [docs/compliance.md](docs/compliance.md)

## 检查命令

| 任务 | 命令 |
| --- | --- |
| 单元测试 | `pnpm test` |
| Lint（含自动修复） | `pnpm lint` |
| 类型检查 | `npx tsc --noEmit` |
| 生成装饰资产（tabBar 图标/光球/噪点等） | `node scripts/gen-assets.mjs all` |

## 文档

完整文档组在 [docs/](docs/)，入口与文档地图见 [requirements.md](docs/requirements.md)：

| 文件 | 内容 |
| --- | --- |
| [requirements.md](docs/requirements.md) | 目标 / 架构 / 选型 / 页面清单 / 里程碑（主文档） |
| [api-contract.md](docs/api-contract.md) | 13 端点数据契约 + Block AST（M0 冻结对象） |
| [design.md](docs/design.md) | 视觉令牌 / WXSS 硬约束 / 交互规范 / 不做清单 |
| [compliance.md](docs/compliance.md) | 备案 / 隐私指引 / 提审 checklist |
| [decisions.md](docs/decisions.md) | 决策记录（表尾追加，不回改） |
| [research.md](docs/research.md) | 调研事实 / 排查方法论 |

## 相关仓库

- [margin](https://github.com/baiwumm/margin) —— 站点本体（Astro SSG + Cloudflare），内容、设计与 API 契约的唯一事实源

## 许可证

[MIT](LICENSE) © baiwumm
