/**
 * 图片资产模块声明：src 里 50 处 `import x from "…*.png"`（tabBar 20 枚图标、
 * logo/字标/导航图标、aurora 光球）在 webpack 侧由 asset 模块处理成 URL 字符串，
 * TS 侧一直缺声明 ⇒ 全量 tsc 有 50 条 TS2307 噪声（M1-b 起挂到现在）。
 * 类型就按使用方式定：default export = 可直接塞进 src 的字符串。
 */
declare module "*.png" {
  const src: string;
  export default src;
}
