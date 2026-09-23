<template>
  <div ref="container" class="viewer3d"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useImagingStore } from '../store/imaging'
import { applyWindowLevel } from '../utils/windowing'
const store = useImagingStore()
const container = ref<HTMLDivElement>()
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls, animId: number
let volGroup = new THREE.Group()

function initScene() {
  const c = container.value!
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d1117)
  camera = new THREE.PerspectiveCamera(45, c.clientWidth/c.clientHeight, 0.1, 50); camera.position.set(3, 2, 4)
  renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(c.clientWidth, c.clientHeight)
  c.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0, 0, 0)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  scene.add(volGroup)
}

function renderVolume() {
  volGroup.clear()
  const vd = store.volumeData
  if (!vd) return
  const vol = vd.volume
  const [d, h, w] = vd.dimensions
  const step = 2

  const ww = store.windowVal, wl = store.levelVal

  // Sample volume as point cloud with transfer function
  const positions: number[] = [], colors: number[] = []
  const scaleX = 3/w, scaleY = 3/h, scaleZ = 3/d

  for (let z = 0; z < d; z += step) {
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const val = vol[z][y][x]
        // 与 MPR 切面共用同一份窗宽窗位归一化和灰度映射
        const t = applyWindowLevel(val, ww, wl)

        if (t > 0.0) {
          positions.push((x - w/2) * scaleX, (y - h/2) * scaleY, (z - d/2) * scaleZ)
          // 与切面一致的灰度：低值黑、高值白
          colors.push(t, t, t)
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, blending: THREE.NormalBlending, depthWrite: true, transparent: true, opacity: 0.9 })
  volGroup.add(new THREE.Points(geom, mat))

  // Axes cross
  const axGeom = new THREE.BufferGeometry()
  axGeom.setAttribute('position', new THREE.Float32BufferAttribute([-2,0,0,2,0,0,0,-2,0,0,2,0,0,0,-2,0,0,2], 3))
  volGroup.add(new THREE.Line(axGeom, new THREE.LineBasicMaterial({ color: 0x30363d })))
}

function animate() { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }

onMounted(() => { initScene(); animate() })
watch(() => [store.volumeData, store.windowVal, store.levelVal], renderVolume, { deep: true })
onUnmounted(() => { cancelAnimationFrame(animId); renderer?.dispose() })
</script>
<style scoped>.viewer3d{width:100%;height:100%;min-height:400px}</style>