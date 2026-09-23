import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { VolumeData, ROIResult } from '@/types'
import {
  DEFAULT_WINDOW_PRESETS,
  defaultPresetForPart,
} from '@/utils/window'

const PART_STORAGE_KEY = 'imaging.part'
const WINDOW_STORAGE_KEY = 'imaging.windowByPart'

function loadPart(): string {
  return localStorage.getItem(PART_STORAGE_KEY) || 'brain'
}

function loadWindowMap(): Record<string, { name: string }> {
  try {
    return JSON.parse(localStorage.getItem(WINDOW_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const useImagingStore = defineStore('imaging', () => {
  const loading = ref(false)
  const volumeData = ref<VolumeData | null>(null)
  const preset = ref(loadPart())             // 检查部位（brain/chest/abdomen）
  const activeWindowPreset = ref('')         // 当前窗方案名（肺窗/纵隔窗/…）
  const windowVal = ref(80)                  // 窗宽 WW
  const levelVal = ref(40)                   // 窗位 WL
  const roiResults = ref<ROIResult[]>([])
  const mprSlice = ref({ axial: 32, coronal: 32, sagittal: 32 })

  const savedWindowMap = loadWindowMap()

  function presetTable(): Record<string, { window: number; level: number }> {
    return volumeData.value?.windowPresets || DEFAULT_WINDOW_PRESETS
  }

  /** 按方案名设置窗宽窗位，并记住该部位使用的方案 */
  function applyWindowPreset(name: string, save = true) {
    const p = presetTable()[name]
    if (!p) return
    activeWindowPreset.value = name
    windowVal.value = p.window
    levelVal.value = p.level
    if (save) {
      savedWindowMap[preset.value] = { name }
      localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(savedWindowMap))
    }
  }

  /** 手动拖动滑块：取消方案高亮，不覆盖已记忆的部位方案 */
  function setManualWindow(w: number, l: number) {
    windowVal.value = w
    levelVal.value = l
    activeWindowPreset.value = ''
  }

  /** 切换检查部位：立即套用该部位记忆过（或默认）的窗方案 */
  function selectPart(part: string) {
    preset.value = part
    localStorage.setItem(PART_STORAGE_KEY, part)
    const saved = savedWindowMap[part]?.name || defaultPresetForPart(part)
    applyWindowPreset(saved, false)
  }

  /** 按当前部位与方案套用一次窗宽窗位（载入影像/页面重开时调用） */
  function applyPartWindow() {
    const saved = savedWindowMap[preset.value]?.name || defaultPresetForPart(preset.value)
    applyWindowPreset(saved, false)
  }

  // 初始化即为当前部位还原对应窗方案，保证重开页面也生效
  applyPartWindow()

  async function loadVolume() {
    loading.value = true
    try {
      const { data } = await axios.post('/api/volume', {
        preset: preset.value, width: 64, height: 64, depth: 64
      })
      volumeData.value = data
      mprSlice.value = { axial: 32, coronal: 32, sagittal: 32 }
      // 数据到达后，窗方案表以后端为准，再按当前部位方案校准一次
      applyPartWindow()
    } finally { loading.value = false }
  }

  async function analyzeROI(rois: any[]) {
    loading.value = true
    try {
      const { data } = await axios.post('/api/roi', { volume: volumeData.value?.volume, rois })
      roiResults.value = data.rois
    } finally { loading.value = false }
  }

  return {
    loading, volumeData, preset, activeWindowPreset, windowVal, levelVal,
    roiResults, mprSlice,
    loadVolume, analyzeROI, selectPart, applyWindowPreset, setManualWindow,
  }
})
