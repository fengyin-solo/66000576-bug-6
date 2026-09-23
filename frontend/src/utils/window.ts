import type { WindowPreset } from '@/types'

// 与后端 WINDOW_PRESETS 保持一致的兜底方案（接口未返回时使用）
export const DEFAULT_WINDOW_PRESETS: Record<string, WindowPreset> = {
  lung: { window: 1500, level: -600, desc: '肺窗 (W1500/L-600)' },
  mediastinum: { window: 350, level: 50, desc: '纵隔窗 (W350/L50)' },
  bone: { window: 2000, level: 300, desc: '骨窗 (W2000/L300)' },
  brain: { window: 80, level: 40, desc: '脑窗 (W80/L40)' },
  abdomen: { window: 400, level: 40, desc: '腹窗 (W400/L40)' },
}

// 各检查部位默认启用的窗方案
export const PART_DEFAULT_PRESET: Record<string, string> = {
  brain: 'brain',
  chest: 'mediastinum',
  abdomen: 'abdomen',
}

export function defaultPresetForPart(part: string): string {
  return PART_DEFAULT_PRESET[part] ?? 'mediastinum'
}

/**
 * 统一的窗宽窗位（WW/WL）映射：把 CT/HU 值归一化到 0~1 的灰度。
 * 立体画面与切面画面必须共用此函数，保证同一份数据明暗一致。
 */
export function windowIntensity(value: number, width: number, level: number): number {
  if (width <= 0) return value >= level ? 1 : 0
  const lower = level - width / 2
  const t = (value - lower) / width
  return Math.max(0, Math.min(1, t))
}

/** 当前 WW/WL 是否与某个预设方案一致（用于面板高亮） */
export function matchPreset(
  p: WindowPreset | undefined,
  width: number,
  level: number,
): boolean {
  return !!p && p.window === width && p.level === level
}
