/**
 * CT 窗宽窗位归一化：把 HU 值线性映射为 0~1 的灰度
 * @param value 体素 HU 值
 * @param width 窗宽 WW（store.windowVal）
 * @param level 窗位 WL（store.levelVal，即窗中心）
 */
export function applyWindowLevel(value: number, width: number, level: number): number {
  const w = Math.max(width, 1e-6)
  const lower = level - w / 2
  const t = (value - lower) / w
  return t < 0 ? 0 : t > 1 ? 1 : t
}
