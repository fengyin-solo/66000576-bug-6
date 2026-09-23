<template>
  <div class="panel">
    <h4>🎚️ 窗宽窗位调节</h4>
    <div class="preset-row">
      <el-button v-for="(p, k) in presets" :key="k" size="small" @click="store.applyPreset(k)" :type="store.activePreset===k?'primary':''">{{ p.desc ? p.desc.split(' ')[0] : k }}</el-button>
    </div>
    <div class="slider-row">
      <span>窗宽: {{ store.windowVal }}</span>
      <input type="range" :min="10" :max="3000" :value="store.windowVal" @input="onWidth"/>
    </div>
    <div class="slider-row">
      <span>窗位: {{ store.levelVal }}</span>
      <input type="range" :min="-1000" :max="1000" :value="store.levelVal" @input="onLevel"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useImagingStore } from '../store/imaging'
import type { WindowPreset } from '../types'
const store = useImagingStore()

const defaultPresets: Record<string, WindowPreset> = {
  lung: { window: 1500, level: -600, desc: '肺窗 (W1500/L-600)' },
  mediastinum: { window: 350, level: 50, desc: '纵隔窗 (W350/L50)' },
  bone: { window: 2000, level: 300, desc: '骨窗 (W2000/L300)' },
  brain: { window: 80, level: 40, desc: '脑窗 (W80/L40)' },
  abdomen: { window: 400, level: 40, desc: '腹窗 (W400/L40)' },
}

const presets = computed(() => store.volumeData?.windowPresets || defaultPresets)

function onWidth(e: Event) {
  store.setManualWindow(Number((e.target as HTMLInputElement).value), store.levelVal)
}
function onLevel(e: Event) {
  store.setManualWindow(store.windowVal, Number((e.target as HTMLInputElement).value))
}
</script>

<style scoped>
.panel { background:#161b22; border-radius:6px; padding:10px; border:1px solid #30363d }
.panel h4 { color:#58a6ff; font-size:12px; margin-bottom:8px }
.preset-row { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:10px }
.slider-row { display:flex; align-items:center; gap:8px; margin:6px 0; font-size:11px; color:#8b949e }
.slider-row input { flex:1; accent-color:#58a6ff }
</style>
