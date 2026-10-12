/**
 * 设备本地时区日期格式化（D60：端上日期口径统一到 local）。
 * 原状 = home 卡 / 详情头用 `iso.slice(0,10)`（UTC），瞬间卡 / 归档用 `new Date`
 * （本地）⇒ 74 篇里 27 篇午夜档（UTC 16:00 发布）两口径差一天；本模块供前两者
 * 改本地，归档/瞬间本地口径不变（语料 0 篇午夜档，UTC slice 与本地等价）。
 */

/** YYYY-MM-DD（设备本地时区；非法日期原样回输入前 10 位） */
export function formatDateLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return (
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` +
    `-${String(d.getDate()).padStart(2, "0")}`
  );
}

/** 同日比较键（本地时区；供「修改日期 ≠ 发布日期才显示 updated」判定） */
export function dayKeyLocal(iso: string): string {
  return formatDateLocal(iso);
}
