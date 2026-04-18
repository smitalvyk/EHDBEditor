<script setup>
import { ref, watch, onUnmounted, onMounted, computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: "0" },
  isShipLayout: { type: Boolean, default: false },
  backgroundImage: { type: String, default: null }
});

const emit = defineEmits(['update:modelValue']);

// MODAL STATE
const isModalOpen = ref(false);
const backupValue = ref('');

const gridSize = ref(1);
const gridData = ref([]);
const currentBrush = ref('1');

// MODES
const isPanMode = ref(true); 
const isDrawing = ref(false);
const isPanning = ref(false);

const scrollWrapper = ref(null);
let startX = 0, startY = 0, scrollL = 0, scrollT = 0;

// PC DETECTION & CHECK TOGGLE
const isPC = ref(false);
const enableDeviceCheck = ref(true); 

const checkDevice = () => {
  if (enableDeviceCheck.value) {
    isPC.value = window.innerWidth > window.innerHeight && window.innerWidth >= 1024;
  } else {
    isPC.value = true;
  }
};

onMounted(() => {
  checkDevice();
  window.addEventListener('resize', checkDevice);
});
onUnmounted(() => window.removeEventListener('resize', checkDevice));

// TOOLS
const currentTool = ref('brush'); 
const polySides = ref(3);
const polyRotation = ref(0);

// SYMMETRY
const isSymmetryX = ref(false); // Mirrors Left/Right
const isSymmetryY = ref(false); // Mirrors Top/Bottom

// ZOOM
const zoomLevel = ref(100);
const resetZoom = () => { zoomLevel.value = 100; };

const palette = [
  { id: '0', color: '#666666', paint: 'transparent', label: 'Empty (0)' },
  { id: '1', color: '#4477FF', paint: 'rgba(68, 119, 255, 0.5)', label: 'Base/Armor (1)' },
  { id: '2', color: '#44FF44', paint: 'rgba(68, 255, 68, 0.5)', label: 'Energy/Reactor (2)' },
  { id: '3', color: 'linear-gradient(135deg, #4477FF 50%, #44FF44 50%)', paint: 'linear-gradient(135deg, rgba(68, 119, 255, 0.5) 50%, rgba(68, 255, 68, 0.5) 50%)', label: 'Hybrid (3)' },
  { id: '4', color: '#FF4444', paint: 'rgba(255, 68, 68, 0.5)', label: 'Weapon (4)' },
  { id: '5', color: '#FFFF44', paint: 'rgba(255, 255, 68, 0.5)', label: 'Engine (5)' }
];

const initGrid = (valStr) => {
  let val = valStr;
  if (!val || typeof val !== 'string') val = "0";

  let size = Math.ceil(Math.sqrt(val.length));
  if (size < 1) size = 1;
  gridSize.value = size;

  const expectedLength = size * size;
  if (val.length < expectedLength) {
    val = val.padEnd(expectedLength, '0');
  }

  gridData.value = val.split('');
};

watch(() => props.modelValue, (newVal) => {
  if (!isModalOpen.value && newVal !== gridData.value.join('')) {
    initGrid(newVal);
  }
}, { immediate: true });

// MODAL CONTROLS
const openEditor = () => {
  backupValue.value = gridData.value.join('');
  isModalOpen.value = true;
  zoomLevel.value = 100;
  isPanMode.value = true;
};

const saveEditor = () => {
  emit('update:modelValue', gridData.value.join(''));
  isModalOpen.value = false;
};

const closeEditor = () => {
  initGrid(backupValue.value);
  isModalOpen.value = false;
};

// GRID SIZING
const setGridSize = (delta) => {
  let newSize = gridSize.value + delta;
  if (newSize < 1) newSize = 1;
  if (newSize > 120) newSize = 120; 

  const newData = Array(newSize * newSize).fill('0');
  const minSize = Math.min(gridSize.value, newSize);

  for (let y = 0; y < minSize; y++) {
    for (let x = 0; x < minSize; x++) {
      newData[y * newSize + x] = gridData.value[y * gridSize.value + x];
    }
  }

  gridSize.value = newSize;
  gridData.value = newData;
};

const containerPixelSize = computed(() => {
  const visualSize = Math.max(gridSize.value, 10);
  const totalPx = (visualSize * 24) + (visualSize - 1); 
  return `${totalPx * (zoomLevel.value / 100)}px`;
});

// MATRIX SHIFT
const shiftUp = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 1; y < size; y++) {
    for (let x = 0; x < size; x++) { newData[(y - 1) * size + x] = gridData.value[y * size + x]; }
  }
  gridData.value = newData;
};
const shiftDown = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size; x++) { newData[(y + 1) * size + x] = gridData.value[y * size + x]; }
  }
  gridData.value = newData;
};
const shiftLeft = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 0; y < size; y++) {
    for (let x = 1; x < size; x++) { newData[y * size + (x - 1)] = gridData.value[y * size + x]; }
  }
  gridData.value = newData;
};
const shiftRight = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 1; x++) { newData[y * size + (x + 1)] = gridData.value[y * size + x]; }
  }
  gridData.value = newData;
};

// SHAPE RASTERIZATION LOGIC
const getShapeIndices = (startX, startY, endX, endY, tool, sides, rotation) => {
  const indices = [];
  const minX = Math.max(0, Math.min(startX, endX));
  const maxX = Math.min(gridSize.value - 1, Math.max(startX, endX));
  const minY = Math.max(0, Math.min(startY, endY));
  const maxY = Math.min(gridSize.value - 1, Math.max(startY, endY));

  const cx = minX + (maxX - minX) / 2;
  const cy = minY + (maxY - minY) / 2;
  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;

  let verts = [];
  if (tool === 'polygon' && rx > 0 && ry > 0) {
    const rotRad = (rotation * Math.PI) / 180;
    for (let i = 0; i < sides; i++) {
      const angle = rotRad + i * ((2 * Math.PI) / sides);
      verts.push({ vx: cx + rx * Math.cos(angle), vy: cy + ry * Math.sin(angle) });
    }
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let inside = false;

      if (tool === 'square') {
        inside = true; 
      } else if (tool === 'circle') {
        if (rx === 0 || ry === 0) inside = true;
        else {
          const dx = x - cx;
          const dy = y - cy;
          if (((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) <= 1.05) inside = true;
        }
      } else if (tool === 'polygon') {
        if (rx === 0 || ry === 0) inside = true;
        else {
          let intersectCount = 0;
          for (let i = 0, j = sides - 1; i < sides; j = i++) {
            const vi = verts[i], vj = verts[j];
            if (((vi.vy > y) !== (vj.vy > y)) && (x < (vj.vx - vi.vx) * (y - vi.vy) / (vj.vy - vi.vy) + vi.vx)) {
              intersectCount++;
            }
          }
          if (intersectCount % 2 === 1) inside = true;
        }
      }

      if (inside) indices.push(y * gridSize.value + x);
    }
  }
  return indices;
};

// SYMMETRY HELPER
const getSymmetricIndices = (index) => {
  const x = index % gridSize.value;
  const y = Math.floor(index / gridSize.value);
  const symX = gridSize.value - 1 - x;
  const symY = gridSize.value - 1 - y;

  const indices = new Set([index]);

  if (isSymmetryX.value) indices.add(y * gridSize.value + symX);
  if (isSymmetryY.value) indices.add(symY * gridSize.value + x);
  if (isSymmetryX.value && isSymmetryY.value) indices.add(symY * gridSize.value + symX);

  return Array.from(indices);
};

// DRAWING EVENT DELEGATION
let drawingBrush = '1';
let shapeStartX = 0;
let shapeStartY = 0;
const backupGrid = ref([]);
let previousShapeIndices = [];

const paintCell = (index, brush) => {
  const indices = getSymmetricIndices(index);
  for (const idx of indices) {
    if (gridData.value[idx] !== brush) gridData.value[idx] = brush;
  }
};

const updateShapePreview = (startX, startY, endX, endY, brush) => {
  for (const idx of previousShapeIndices) { gridData.value[idx] = backupGrid.value[idx]; }
  
  const baseIndices = getShapeIndices(startX, startY, endX, endY, currentTool.value, polySides.value, polyRotation.value);
  
  const symIndices = new Set();
  for (const idx of baseIndices) {
    const mirrored = getSymmetricIndices(idx);
    for (const m of mirrored) symIndices.add(m);
  }
  
  const newIndices = Array.from(symIndices);
  for (const idx of newIndices) { gridData.value[idx] = brush; }
  previousShapeIndices = newIndices;
};

const onGridMouseDown = (e) => {
  if (isPanMode.value || e.button === 1) return;
  const target = e.target;
  
  if (target.classList.contains('grid-cell')) {
    const index = Number(target.dataset.index);
    isDrawing.value = true; 
    drawingBrush = (e.button === 2) ? '0' : currentBrush.value;

    if (isPC.value && currentTool.value !== 'brush') {
      shapeStartX = index % gridSize.value;
      shapeStartY = Math.floor(index / gridSize.value);
      backupGrid.value = [...gridData.value];
      previousShapeIndices = [];
      updateShapePreview(shapeStartX, shapeStartY, shapeStartX, shapeStartY, drawingBrush);
    } else {
      paintCell(index, drawingBrush); 
    }
  }
};

const onGridMouseMove = (e) => {
  if (isPanMode.value || !isDrawing.value) return;
  const target = e.target;

  if (target.classList.contains('grid-cell')) {
    const index = Number(target.dataset.index);
    
    if (isPC.value && currentTool.value !== 'brush') {
      const x = index % gridSize.value;
      const y = Math.floor(index / gridSize.value);
      updateShapePreview(shapeStartX, shapeStartY, x, y, drawingBrush);
    } else {
      paintCell(index, drawingBrush);
    }
  }
};

// TOUCH LOGIC
let initialPinchDist = 0;
let initialZoom = 100;
let lastTouchCenterX = 0;
let lastTouchCenterY = 0;

const getPinchDistance = (touches) => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const getTouchCenter = (touches) => {
  return { x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 };
};

const paintCellFromTouch = (clientX, clientY, brush) => {
  const el = document.elementFromPoint(clientX, clientY);
  if (el && el.dataset.index !== undefined) {
    const index = Number(el.dataset.index);
    if (!isNaN(index)) paintCell(index, brush);
  }
};

const handleTouchStart = (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    isDrawing.value = false;
    initialPinchDist = getPinchDistance(e.touches);
    initialZoom = zoomLevel.value;
    const center = getTouchCenter(e.touches);
    lastTouchCenterX = center.x;
    lastTouchCenterY = center.y;
    return;
  }

  if (!isPanMode.value) {
    e.preventDefault(); 
    isDrawing.value = true;
    drawingBrush = currentBrush.value;
    paintCellFromTouch(e.touches[0].clientX, e.touches[0].clientY, drawingBrush);
  }
};

const handleTouchMove = (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const currentDist = getPinchDistance(e.touches);
    const scale = currentDist / initialPinchDist;
    zoomLevel.value = Math.max(25, Math.min(150, Math.round(initialZoom * scale)));

    const center = getTouchCenter(e.touches);
    const deltaX = center.x - lastTouchCenterX;
    const deltaY = center.y - lastTouchCenterY;
    if (scrollWrapper.value) {
      scrollWrapper.value.scrollLeft -= deltaX;
      scrollWrapper.value.scrollTop -= deltaY;
    }
    lastTouchCenterX = center.x;
    lastTouchCenterY = center.y;
    return;
  }

  if (!isPanMode.value && isDrawing.value) {
    e.preventDefault(); 
    paintCellFromTouch(e.touches[0].clientX, e.touches[0].clientY, drawingBrush);
  }
};

// PC MOUSE LOGIC
const handleWheel = (e) => {
  if (!isModalOpen.value) return;
  e.preventDefault();
  const zoomChange = e.deltaY > 0 ? -10 : 10;
  zoomLevel.value = Math.max(25, Math.min(150, zoomLevel.value + zoomChange));
};

const startPan = (e) => {
  if (!scrollWrapper.value || e.type.includes('touch')) return;
  if (!isPanMode.value && e.button !== 1) return;

  isPanning.value = true;
  startX = e.pageX - scrollWrapper.value.offsetLeft;
  startY = e.pageY - scrollWrapper.value.offsetTop;
  scrollL = scrollWrapper.value.scrollLeft;
  scrollT = scrollWrapper.value.scrollTop;
};

const doPan = (e) => {
  if (!isPanning.value || !scrollWrapper.value || e.type.includes('touch')) return;
  e.preventDefault(); 
  const x = e.pageX - scrollWrapper.value.offsetLeft;
  const y = e.pageY - scrollWrapper.value.offsetTop;
  scrollWrapper.value.scrollLeft = scrollL - (x - startX);
  scrollWrapper.value.scrollTop = scrollT - (y - startY);
};

const handleGlobalMouseUp = () => { 
  isDrawing.value = false; 
  isPanning.value = false;
};

window.addEventListener('mouseup', handleGlobalMouseUp);
onUnmounted(() => window.removeEventListener('mouseup', handleGlobalMouseUp));

const onInputStringChange = (e) => {
  initGrid(e.target.value);
  emit('update:modelValue', gridData.value.join(''));
};
</script>

<template>
  <div class="layout-module-wrapper">
    
    <div class="preview-box">
      <div class="preview-header">
        <span class="preview-title">Layout Preview ({{ gridSize }}x{{ gridSize }})</span>
        <button @click="openEditor" class="btn-open-editor">EDIT LAYOUT</button>
      </div>
      
      <div class="preview-content">
        <div class="mini-grid-wrapper">
          <img v-if="backgroundImage" :src="backgroundImage" class="mini-bg-image" />
          <div class="mini-grid" :style="{ 
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`
          }">
            <div
              v-for="(cell, index) in gridData"
              :key="'p'+index"
              class="mini-cell"
              :class="'cell-c' + cell"
            ></div>
          </div>
        </div>
      </div>

      <div class="string-preview">
        <input 
          type="text" 
          :value="gridData.join('')" 
          @input="onInputStringChange"
          class="win-input string-input" 
          title="Layout String Data"
        >
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeEditor">
          <div class="modal-window">
            
            <div class="modal-header">
              <div class="modal-title">Layout Editor</div>
              <div class="modal-actions">
                <button @click="saveEditor" class="btn-save">Save Layout</button>
                <button @click="closeEditor" class="btn-close">Close</button>
              </div>
            </div>
            
            <div class="modal-body layout-editor-container">
              
              <div class="toolbar">
                <div class="toolbar-group">
                  <span class="size-label">{{ gridSize }}x{{ gridSize }}</span>
                  <button @click="setGridSize(-1)" class="btn-size" title="Decrease Size">-</button>
                  <button @click="setGridSize(1)" class="btn-size" title="Increase Size">+</button>
                </div>

                <div class="toolbar-group">
                  <button @click="resetZoom" class="btn-tool" title="Reset Zoom">R</button>
                  <input type="range" min="25" max="150" step="1" :value="zoomLevel" @input="e => zoomLevel = Number(e.target.value)" class="zoom-slider" title="Zoom">
                  <span class="zoom-label">{{ zoomLevel }}%</span>
                </div>

                <div class="toolbar-group">
                  <button 
                    @click="isPanMode = !isPanMode" 
                    class="btn-tool mode-btn" 
                    :class="{ active: !isPanMode }" 
                    title="Toggle Draw Mode"
                  >
                    {{ isPanMode ? 'Pan' : 'Draw' }}
                  </button>
                </div>

                <div class="toolbar-group" v-if="!isPanMode">
                  <button @click="isSymmetryX = !isSymmetryX" class="btn-tool sym-btn" :class="{ active: isSymmetryX }" title="Mirror Left/Right">Sym X</button>
                  <button @click="isSymmetryY = !isSymmetryY" class="btn-tool sym-btn" :class="{ active: isSymmetryY }" title="Mirror Top/Bottom">Sym Y</button>
                </div>

                <div class="toolbar-group" v-if="isPC && !isPanMode">
                  <button @click="currentTool = 'brush'" class="btn-tool tool-type-btn" :class="{ active: currentTool === 'brush' }" title="Brush">✎</button>
                  <button @click="currentTool = 'square'" class="btn-tool tool-type-btn" :class="{ active: currentTool === 'square' }" title="Square Box">■</button>
                  <button @click="currentTool = 'circle'" class="btn-tool tool-type-btn" :class="{ active: currentTool === 'circle' }" title="Circle">●</button>
                  <button @click="currentTool = 'polygon'" class="btn-tool tool-type-btn" :class="{ active: currentTool === 'polygon' }" title="Polygon (N-gon)">⬡</button>
                  
                  <template v-if="currentTool === 'polygon'">
                    <span class="shape-label">Sides:</span>
                    <input type="number" v-model.number="polySides" min="3" max="10" class="shape-input" title="Polygon Sides (3-10)" />
                    <span class="shape-label">Rot:</span>
                    <input type="number" v-model.number="polyRotation" min="0" max="360" class="shape-input" title="Rotation Degrees" />
                  </template>
                </div>

                <div class="toolbar-group">
                  <button @click="shiftUp" class="btn-shift shift-arrow" title="Shift Layout Up">▲</button>
                  <button @click="shiftDown" class="btn-shift shift-arrow" title="Shift Layout Down">▼</button>
                  <button @click="shiftLeft" class="btn-shift shift-arrow" title="Shift Layout Left">◀</button>
                  <button @click="shiftRight" class="btn-shift shift-arrow" title="Shift Layout Right">▶</button>
                </div>

                <div class="toolbar-group">
                  <button
                    v-for="p in palette"
                    :key="p.id"
                    class="brush-btn"
                    :class="{ active: currentBrush === p.id }"
                    :style="p.color.includes('gradient') ? { background: p.color } : { backgroundColor: p.color }"
                    @click="currentBrush = p.id"
                    :title="p.label"
                  >
                    <span v-if="p.id === '0'" class="empty-icon">X</span>
                  </button>
                </div>
              </div>

              <div 
                class="grid-scroll-wrapper" 
                ref="scrollWrapper"
                :class="{ 'is-pan-mode': isPanMode, 'is-panning': isPanning }"
                @mousedown="startPan"
                @mousemove="doPan"
                @mouseleave="handleGlobalMouseUp"
                @wheel.prevent="handleWheel" 
              >
                <div class="grid-layout-wrapper">
                  
                  <div class="ruler-corner"></div>

                  <div class="ruler-top" :style="{ width: containerPixelSize, gridTemplateColumns: `repeat(${gridSize}, 1fr)` }">
                    <div v-for="i in gridSize" :key="'t'+i" class="r-cell-top">
                      <span v-if="i % 10 === 0" class="r-num">{{ i }}</span>
                      <span :class="(i % 10 === 0) ? 'r-mark-10' : ((i % 5 === 0) ? 'r-mark-5' : 'r-mark-1')"></span>
                    </div>
                  </div>

                  <div class="ruler-left" :style="{ height: containerPixelSize, gridTemplateRows: `repeat(${gridSize}, 1fr)` }">
                    <div v-for="i in gridSize" :key="'l'+i" class="r-cell-left">
                      <span v-if="i % 10 === 0" class="r-num">{{ i }}</span>
                      <span :class="(i % 10 === 0) ? 'r-mark-10' : ((i % 5 === 0) ? 'r-mark-5' : 'r-mark-1')"></span>
                    </div>
                  </div>

                  <div class="grid-container" :style="{ width: containerPixelSize, height: containerPixelSize }">
                    
                    <img v-if="backgroundImage" :src="backgroundImage" class="bg-image" />
                    
                    <div 
                      class="drawing-grid"
                      @mouseleave="handleGlobalMouseUp"
                      @mousedown.prevent="onGridMouseDown"
                      @mousemove.prevent="onGridMouseMove"
                      @touchstart="handleTouchStart"
                      @touchmove="handleTouchMove"
                      @touchend="handleGlobalMouseUp"
                      @touchcancel="handleGlobalMouseUp"
                      @contextmenu.prevent
                      :style="{ 
                        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                        gridTemplateRows: `repeat(${gridSize}, 1fr)`
                      }"
                      @dragstart.prevent
                    >
                      <div
                        v-for="(cell, index) in gridData"
                        :key="index"
                        class="grid-cell"
                        :class="'cell-c' + cell"
                        :data-index="index"
                        v-memo="[cell]"
                      ></div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
/* PREVIEW BLOCK */
.layout-module-wrapper { width: 100%; box-sizing: border-box; }
.preview-box { background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 15px; }
.preview-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px; }
.preview-title { font-size: 14px; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; }
.btn-open-editor { background: var(--accent-color); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: filter 0.2s; }
.btn-open-editor:hover { filter: brightness(1.2); }
.preview-content { display: flex; justify-content: center; align-items: center; padding: 10px; background: rgba(0,0,0,0.4); border-radius: 6px; min-height: 150px; }

.mini-grid-wrapper { position: relative; width: 150px; height: 150px; overflow: hidden; border-radius: 4px; }
.mini-bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; transform: rotate(-90deg); z-index: 1; opacity: 0.5; pointer-events: none; }

/* ИСПРАВЛЕНИЕ: Добавлен gap: 1px для создания прозрачных рамок между блоками */
.mini-grid { position: relative; width: 100%; height: 100%; z-index: 2; display: grid; gap: 1px; background: transparent; pointer-events: none; }

/* ИСПРАВЛЕНИЕ: Добавлена GPU-ускоренная тень для разметки пустых ячеек */
.mini-cell { width: 100%; height: 100%; box-sizing: border-box; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); }

.string-preview { width: 100%; }
.string-input { width: 100%; font-family: monospace; font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.4); border: 1px solid var(--border-light); padding: 8px 10px; border-radius: 4px; box-sizing: border-box; opacity: 0.8; }
.string-input:focus { opacity: 1; outline: none; border-color: var(--accent-color); }

/* MODAL STYLES */
.modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 0 !important; margin: 0 !important; }
.modal-window { width: 100%; height: 100%; max-width: 100%; max-height: 100%; background: var(--app-bg, #1e1e1e); border-radius: 0; border: none; margin: 0; display: flex; flex-direction: column; box-sizing: border-box; }
.modal-header { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--border-light); background: var(--sidebar-bg, #252526); }
.modal-title { font-weight: bold; font-size: 16px; color: var(--accent-color); text-transform: uppercase; }
.modal-actions { display: flex; gap: 10px; }
.btn-save { background: var(--accent-color); color: #fff; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
.btn-save:hover { filter: brightness(1.2); }
.btn-close { background: rgba(255, 255, 255, 0.1); color: var(--text-primary); border: 1px solid var(--border-light); padding: 6px 16px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
.btn-close:hover { background: rgba(255, 255, 255, 0.2); }
.modal-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: #1a1a1a; }

/* TOOLBAR */
.layout-editor-container { display: flex; flex-direction: column; gap: 12px; width: 100%; padding: 15px; box-sizing: border-box; }
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; padding-bottom: 8px; flex-shrink: 0; width: 100%; scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.2) transparent; }
.toolbar::-webkit-scrollbar { height: 4px; }
.toolbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }

.toolbar-group { display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.05); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05); flex-shrink: 0 !important; white-space: nowrap; }
.size-label { font-family: monospace; font-size: 13px; color: var(--text-secondary); font-weight: bold; width: 45px; text-align: center; }
.btn-size { width: 28px; height: 28px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s; }
.btn-size:hover { background: rgba(255, 255, 255, 0.2); }

.btn-tool { height: 28px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; transition: 0.2s; padding: 0 10px; font-weight: bold;}
.btn-tool:hover { background: rgba(85, 170, 255, 0.3); border-color: #55aaff; }
.btn-tool.active { background: #ffaa00; border-color: #ffaa00; color: #1e1e1e; }
.mode-btn { width: 70px; }
.sym-btn { font-size: 11px; padding: 0 6px; }
.tool-type-btn { font-size: 15px; padding: 0 8px; }

.shape-label { font-family: monospace; font-size: 11px; color: var(--text-secondary); margin-left: 4px; }
.shape-input { width: 40px; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 4px; font-family: monospace; font-size: 12px; outline: none; }
.shape-input:focus { border-color: #ffaa00; }

.zoom-slider { width: 80px; cursor: pointer; }
.zoom-label { font-family: monospace; font-size: 11px; color: var(--text-secondary); width: 35px; text-align: right; }

.btn-shift { width: 28px; height: 28px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: 0.2s; }
.btn-shift:hover { background: rgba(85, 170, 255, 0.3); border-color: #55aaff; }
.shift-arrow { font-size: 13px; }

.brush-btn { width: 32px; height: 32px; border: 2px solid transparent; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.1s, border-color 0.1s; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.3); }
.brush-btn:hover { transform: scale(1.1); }
.brush-btn.active { border-color: white; transform: scale(1.1); box-shadow: 0 0 8px rgba(255, 255, 255, 0.5); }
.empty-icon { color: rgba(255, 255, 255, 0.6); font-weight: bold; font-size: 14px; line-height: 1; }

/* RULERS & GRID */
.grid-scroll-wrapper { overflow: auto; padding: 10px; background: rgba(0, 0, 0, 0.4); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05); display: block; flex: 1; transition: cursor 0.2s; }
.is-pan-mode { cursor: grab; user-select: none; }
.is-panning { cursor: grabbing; }
.is-pan-mode .grid-cell { cursor: inherit !important; }

.grid-layout-wrapper { display: inline-grid; grid-template-columns: 24px auto; grid-template-rows: 24px auto; gap: 2px; }
.ruler-corner { position: sticky; top: 0; left: 0; z-index: 15; background: #1e1e1e; border-bottom: 1px solid rgba(255,255,255,0.2); border-right: 1px solid rgba(255,255,255,0.2); }
.ruler-top { position: sticky; top: 0; z-index: 10; background: #1e1e1e; display: grid; gap: 1px; border-bottom: 1px solid rgba(255,255,255,0.2); }
.ruler-left { position: sticky; left: 0; z-index: 10; background: #1e1e1e; display: grid; gap: 1px; border-right: 1px solid rgba(255,255,255,0.2); }

.r-cell-top { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 2px; position: relative; }
.r-cell-left { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; padding-right: 4px; position: relative; }
.r-num { font-size: 9px; font-family: monospace; color: #ffaa00; font-weight: bold; position: absolute; line-height: 1; pointer-events: none; }
.r-cell-top .r-num { bottom: 8px; } 
.r-cell-left .r-num { right: 10px; } 

.r-mark-10 { background: #ffaa00; }
.r-cell-top .r-mark-10 { width: 1px; height: 6px; }
.r-cell-left .r-mark-10 { width: 6px; height: 1px; }
.r-mark-5 { background: rgba(255,255,255,0.6); }
.r-cell-top .r-mark-5 { width: 1px; height: 5px; }
.r-cell-left .r-mark-5 { width: 5px; height: 1px; }
.r-mark-1 { background: rgba(255,255,255,0.2); }
.r-cell-top .r-mark-1 { width: 1px; height: 3px; }
.r-cell-left .r-mark-1 { width: 3px; height: 1px; }

.grid-container { position: relative; display: block; }
.bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; transform: rotate(-90deg); z-index: 1; opacity: 0.8; pointer-events: none; }
.drawing-grid { position: relative; width: 100%; height: 100%; z-index: 2; display: grid; gap: 1px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.2); box-sizing: border-box; touch-action: none; }
.is-pan-mode .drawing-grid { touch-action: auto; }

/* ИСПРАВЛЕНИЕ: Заменен тяжелый border: dashed на быструю внутреннюю тень */
.grid-cell { width: 100%; height: 100%; cursor: crosshair; user-select: none; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15); box-sizing: border-box; transition: box-shadow 0.1s; }
.grid-cell:hover { box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.8); }

/* OPTIMIZED PALETTE CLASSES */
.cell-c0 { background: transparent; }
.cell-c1 { background: rgba(68, 119, 255, 0.5); }
.cell-c2 { background: rgba(68, 255, 68, 0.5); }
.cell-c3 { background: linear-gradient(135deg, rgba(68, 119, 255, 0.5) 50%, rgba(68, 255, 68, 0.5) 50%); }
.cell-c4 { background: rgba(255, 68, 68, 0.5); }
.cell-c5 { background: rgba(255, 255, 68, 0.5); }

/* MODAL ANIMATIONS */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-window { transition: transform 0.2s ease; }
.modal-enter-from .modal-window { transform: scale(0.95); }
</style>