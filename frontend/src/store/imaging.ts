import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { VolumeData, ROIResult, WindowPreset } from '@/types'

// 各检查部位默认窗方案（首次载入、无本地保存时使用）
const PART_DEFAULT_PRESET: Record<string, string> = {
  brain: 'brain',
  chest: 'lung',
  abdomen: 'abdomen',
}

const STORAGE_KEY = 'imaging-window-settings'
const LAST_PART_KEY = 'imaging-last-part'

interface PartWindow { name: string; window: number; level: number }
type StoredSettings = Record<string, PartWindow>

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const fallbackPresets: Record<string, WindowPreset> = {
  lung: { window: 1500, level: -600, desc: '肺窗 (W1500/L-600)' },
  mediastinum: { window: 350, level: 50, desc: '纵隔窗 (W350/L50)' },
  bone: { window: 2000, level: 300, desc: '骨窗 (W2000/L300)' },
  brain: { window: 80, level: 40, desc: '脑窗 (W80/L40)' },
  abdomen: { window: 400, level: 40, desc: '腹窗 (W400/L40)' },
}

export const useImagingStore = defineStore('imaging', () => {
  const loading = ref(false)
  const volumeData = ref<VolumeData | null>(null)
  const preset = ref('brain')
  const windowVal = ref(80)
  const levelVal = ref(40)
  const activePreset = ref('brain')
  const roiResults = ref<ROIResult[]>([])
  const mprSlice = ref({ axial: 32, coronal: 32, sagittal: 32 })

  const presets = () => volumeData.value?.windowPresets || fallbackPresets

  function persistWindow() {
    const settings = loadSettings()
    settings[preset.value] = { name: activePreset.value, window: windowVal.value, level: levelVal.value }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      localStorage.setItem(LAST_PART_KEY, preset.value)
    } catch { /* ignore */ }
  }

  // 应用某部位最后使用（或默认）的窗方案
  function restoreWindowForPart(part: string) {
    const saved = loadSettings()[part]
    if (saved) {
      activePreset.value = saved.name
      windowVal.value = saved.window
      levelVal.value = saved.level
    } else {
      applyPreset(PART_DEFAULT_PRESET[part] || 'abdomen')
    }
  }

  // 窗方案面板切换：立即按该方案更新窗宽窗位并持久化
  function applyPreset(name: string) {
    const p = presets()[name]
    if (!p) return
    activePreset.value = name
    windowVal.value = p.window
    levelVal.value = p.level
    persistWindow()
  }

  // 手动拖滑块调节：标记为自定义并持久化
  function setManualWindow(w: number, l: number) {
    windowVal.value = w
    levelVal.value = l
    activePreset.value = ''
    persistWindow()
  }

  async function loadVolume() {
    loading.value = true
    try {
      const { data } = await axios.post('/api/volume', {
        preset: preset.value, width: 64, height: 64, depth: 64
      })
      volumeData.value = data
      mprSlice.value = { axial: 32, coronal: 32, sagittal: 32 }
      // 切换/重新打开后按该部位的窗方案显示，而非沿用上个部位的亮度
      restoreWindowForPart(preset.value)
    } finally { loading.value = false }
  }

  // 页面重新打开时恢复上次查看的部位与窗方案
  function restoreSession(): boolean {
    let part = ''
    try { part = localStorage.getItem(LAST_PART_KEY) || '' } catch { /* ignore */ }
    if (!part) return false
    const s = loadSettings()[part]
    if (!s) return false
    preset.value = part
    activePreset.value = s.name
    windowVal.value = s.window
    levelVal.value = s.level
    return true
  }

  async function analyzeROI(rois: any[]) {
    loading.value = true
    try {
      const { data } = await axios.post('/api/roi', { volume: volumeData.value?.volume, rois })
      roiResults.value = data.rois
    } finally { loading.value = false }
  }

  function applyWindow(w: number, l: number) { setManualWindow(w, l) }

  return { loading, volumeData, preset, windowVal, levelVal, activePreset, roiResults, mprSlice,
    loadVolume, analyzeROI, applyWindow, applyPreset, setManualWindow, restoreSession }
})
