/**
 * tabBar 选中态 store：custom-tab-bar 组件不能使用页面级 hook（useDidShow 在
 * 无页面实例的组件上下文会崩，见 M1-a 修复记录）——改为模块级单例，
 * 各页面在自己的 useDidShow 里 setSelectedTab(index) 广播，组件订阅回显。
 */
type Listener = (index: number) => void;

let selected = 0;
const listeners = new Set<Listener>();

export function getSelectedTab(): number {
  return selected;
}

export function setSelectedTab(index: number): void {
  if (selected === index) return;
  selected = index;
  for (const fn of listeners) fn(index);
}

export function subscribeSelectedTab(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
