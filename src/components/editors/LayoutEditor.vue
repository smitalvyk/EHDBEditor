<script setup>
import { ref, watch, onUnmounted, computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: "0" },
  isShipLayout: { type: Boolean, default: false },
  backgroundImage: { type: String, default: null }
});

const emit = defineEmits(['update:modelValue']);

const gridSize = ref(1);
const gridData = ref([]);
const currentBrush = ref('1');

// === MODES (Drawing / Panning) ===
const isPanMode = ref(false); 
const isDrawing = ref(false);
const isPanning = ref(false);

const scrollWrapper = ref(null);
let startX = 0, startY = 0, scrollL = 0, scrollT = 0;

// === ZOOM ===
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

const initGrid = () => {
  let val = props.modelValue;
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
  if (newVal !== gridData.value.join('')) {
    initGrid();
  }
}, { immediate: true });

const updateModel = () => {
  emit('update:modelValue', gridData.value.join(''));
};

const setGridSize = (delta) => {
  let newSize = gridSize.value + delta;
  if (newSize < 1) newSize = 1;
  if (newSize > 120) newSize = 120; 

  const newData = Array(newSize * newSize).fill('0');
  const minSize = Math.min(gridSize.value, newSize);

  const offset = Math.floor((newSize - gridSize.value) / 2);

  for (let y = 0; y < gridSize.value; y++) {
    for (let x = 0; x < gridSize.value; x++) {
      const newY = y + offset;
      const newX = x + offset;
      if (newX >= 0 && newX < newSize && newY >= 0 && newY < newSize) {
        newData[newY * newSize + newX] = gridData.value[y * gridSize.value + x];
      }
    }
  }

  gridSize.value = newSize;
  gridData.value = newData;
  updateModel();
};

const containerPixelSize = computed(() => {
  const visualSize = Math.max(gridSize.value, 10);
  const totalPx = (visualSize * 24) + (visualSize - 1); 
  return `${totalPx * (zoomLevel.value / 100)}px`;
});

// === MATRIX SHIFT ===
const shiftUp = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 1; y < size; y++) {
    for (let x = 0; x < size; x++) { newData[(y - 1) * size + x] = gridData.value[y * size + x]; }
  }
  gridData.value = newData; updateModel();
};

const shiftDown = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size; x++) { newData[(y + 1) * size + x] = gridData.value[y * size + x]; }
  }
  gridData.value = newData; updateModel();
};

const shiftLeft = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 0; y < size; y++) {
    for (let x = 1; x < size; x++) { newData[y * size + (x - 1)] = gridData.value[y * size + x]; }
  }
  gridData.value = newData; updateModel();
};

const shiftRight = () => {
  const size = gridSize.value;
  const newData = Array(size * size).fill('0');
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 1; x++) { newData[y * size + (x + 1)] = gridData.value[y * size + x]; }
  }
  gridData.value = newData; updateModel();
};

// === DRAWING LOGIC (Mouse) ===
const paintCell = (index) => {
  if (gridData.value[index] !== currentBrush.value) {
    gridData.value[index] = currentBrush.value;
    updateModel();
  }
};

const startDrawing = (index) => { 
  if (isPanMode.value) return; 
  isDrawing.value = true; 
  paintCell(index); 
};
const hoverCell = (index) => { 
  if (isPanMode.value) return;
  if (isDrawing.value) paintCell(index); 
};

// === DRAWING LOGIC (Touch screens / Mobile) ===
const paintCellFromTouch = (clientX, clientY) => {
  const el = document.elementFromPoint(clientX, clientY);
  if (el && el.dataset.index !== undefined) {
    const index = Number(el.dataset.index);
    if (!isNaN(index)) {
      paintCell(index);
    }
  }
};

const handleTouchStart = (e) => {
  if (isPanMode.value) return; // In Pan mode, let the browser scroll the page
  e.preventDefault(); // Prevent scrolling while drawing
  isDrawing.value = true;
  paintCellFromTouch(e.touches[0].clientX, e.touches[0].clientY);
};

const handleTouchMove = (e) => {
  if (isPanMode.value || !isDrawing.value) return;
  e.preventDefault(); // Prevent scrolling while dragging finger
  paintCellFromTouch(e.touches[0].clientX, e.touches[0].clientY);
};

// === PAN LOGIC (Mouse pan for PC) ===
const startPan = (e) => {
  // Ignore touch events for Pan, as native browser scroll works on mobile
  if (!isPanMode.value || !scrollWrapper.value || e.type.includes('touch')) return;
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

// Global reset
const handleGlobalMouseUp = () => { 
  isDrawing.value = false; 
  isPanning.value = false;
};

window.addEventListener('mouseup', handleGlobalMouseUp);
onUnmounted(() => window.removeEventListener('mouseup', handleGlobalMouseUp));

const getCellStyle = (val) => {
  const p = palette.find(p => p.id === val);
  if (!p) return { background: 'transparent' };
  return p.paint.includes('gradient') ? { background: p.paint } : { backgroundColor: p.paint };
};
</script>

<template>
  <div class="layout-editor-container">
    
    <div class="toolbar">
      
      <div class="size-controls">
        <span class="size-label">{{ gridSize }}x{{ gridSize }}</span>
        <button @click="setGridSize(-1)" class="btn-size" title="Decrease Size">-</button>
        <button @click="setGridSize(1)" class="btn-size" title="Increase Size">+</button>
      </div>

      <div class="zoom-controls">
        <button @click="resetZoom" class="btn-tool" title="Reset Zoom">↺</button>
        <input type="range" min="25" max="150" step="1" :value="zoomLevel" @input="e => zoomLevel = Number(e.target.value)" class="zoom-slider" title="Zoom">
        <span class="zoom-label">{{ zoomLevel }}%</span>
      </div>

      <div class="mode-controls">
        <button 
          @click="isPanMode = !isPanMode" 
          class="btn-tool mode-btn" 
          :class="{ active: isPanMode }" 
          title="Toggle Pan/Draw Mode"
        >
          {{ isPanMode ? '✋ Move' : '🖌️ Draw' }}
        </button>
      </div>

      <div class="shift-controls">
        <button @click="shiftUp" class="btn-shift" title="Shift Layout Up">⬆</button>
        <button @click="shiftDown" class="btn-shift" title="Shift Layout Down">⬇</button>
        <button @click="shiftLeft" class="btn-shift" title="Shift Layout Left">⬅</button>
        <button @click="shiftRight" class="btn-shift" title="Shift Layout Right">➡</button>
      </div>

      <div class="palette" :class="{ 'disabled-palette': isPanMode }">
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
            @mouseleave="stopDrawing"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleGlobalMouseUp"
            @touchcancel="handleGlobalMouseUp"
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
              :data-index="index"
              :style="getCellStyle(cell)"
              @mousedown.prevent="startDrawing(index)"
              @mouseenter.prevent="hoverCell(index)"
            ></div>
          </div>
        </div>

      </div>
    </div>

    <div class="string-preview">
      <input type="text" :value="gridData.join('')" readonly class="win-input string-input" title="Layout String Data">
    </div>

  </div>
</template>

<style scoped>
.layout-editor-container {
  display: flex; flex-direction: column; gap: 12px; width: 100%;
  background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-light); border-radius: 6px; padding: 12px; box-sizing: border-box;
}

/* Toolbar */
.toolbar {
  display: flex; justify-content: flex-start; align-items: center; gap: 15px; flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.02); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05);
}

.size-controls { display: flex; align-items: center; gap: 8px; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px;}
.size-label { font-family: monospace; font-size: 13px; color: var(--text-secondary); font-weight: bold; width: 45px; text-align: center; }

.btn-size {
  width: 24px; height: 24px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
  color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s;
}
.btn-size:hover { background: rgba(255, 255, 255, 0.2); }

/* Zoom & Mode Controls */
.zoom-controls { display: flex; align-items: center; gap: 8px; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px;}
.mode-controls { display: flex; align-items: center; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px;}

.btn-tool { height: 26px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: 0.2s; padding: 0 8px; font-weight: bold;}
.btn-tool:hover { background: rgba(85, 170, 255, 0.3); border-color: #55aaff; }
.btn-tool.active { background: #ffaa00; border-color: #ffaa00; color: #1e1e1e; }
.mode-btn { font-size: 12px; width: 85px; }

.zoom-slider { width: 80px; cursor: pointer; }
.zoom-label { font-family: monospace; font-size: 11px; color: var(--text-secondary); width: 35px; text-align: right; }

/* Shift Controls */
.shift-controls { display: flex; gap: 4px; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px;}
.btn-shift {
  width: 28px; height: 28px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: 0.2s;
}
.btn-shift:hover { background: rgba(85, 170, 255, 0.3); border-color: #55aaff; }

/* Palette */
.palette { display: flex; gap: 6px; align-items: center; transition: opacity 0.3s; }
.disabled-palette { opacity: 0.3; pointer-events: none; }

.brush-btn {
  width: 30px; height: 30px; border: 2px solid transparent; border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: transform 0.1s, border-color 0.1s; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.3);
}
.brush-btn:hover { transform: scale(1.1); }
.brush-btn.active { border-color: white; transform: scale(1.1); box-shadow: 0 0 8px rgba(255, 255, 255, 0.5); }
.empty-icon { color: rgba(255, 255, 255, 0.6); font-weight: bold; font-size: 14px; line-height: 1; }

/* === RULERS & GRID === */
.grid-scroll-wrapper {
  overflow: auto; 
  padding: 10px; 
  background: rgba(0, 0, 0, 0.3); 
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05); 
  display: block; 
  max-height: 600px; 
  transition: cursor 0.2s;
}

/* Cursor change when Pan mode is enabled */
.is-pan-mode { cursor: grab; user-select: none; }
.is-panning { cursor: grabbing; }
.is-pan-mode .grid-cell { cursor: inherit !important; }

.grid-layout-wrapper {
  display: inline-grid;
  grid-template-columns: 24px auto; 
  grid-template-rows: 24px auto;    
  gap: 2px;
}

.ruler-corner {
  position: sticky; top: 0; left: 0; z-index: 15;
  background: #1e1e1e; 
  border-bottom: 1px solid rgba(255,255,255,0.2);
  border-right: 1px solid rgba(255,255,255,0.2);
}

.ruler-top {
  position: sticky; top: 0; z-index: 10;
  background: #1e1e1e; display: grid; gap: 1px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.ruler-left {
  position: sticky; left: 0; z-index: 10;
  background: #1e1e1e; display: grid; gap: 1px;
  border-right: 1px solid rgba(255,255,255,0.2);
}

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

.grid-container {
  position: relative;
  display: block; 
}

.bg-image {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: contain;
  transform: rotate(-90deg); 
  z-index: 1;
  opacity: 0.8; 
  pointer-events: none; 
}

.drawing-grid {
  position: relative;
  width: 100%; height: 100%;
  z-index: 2; display: grid; gap: 1px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-sizing: border-box;
  
  /* Disable default browser gestures (scroll) in drawing mode */
  touch-action: none; 
}

/* Re-enable browser gestures if we are in Pan (Move) mode */
.is-pan-mode .drawing-grid {
  touch-action: auto; 
}

.grid-cell {
  width: 100%; height: 100%;
  cursor: crosshair; user-select: none;
  border: 1px dashed rgba(255, 255, 255, 0.15); 
  box-sizing: border-box;
}

.grid-cell:hover {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.string-preview { width: 100%; }
.string-input {
  width: 100%; font-family: monospace; font-size: 11px; color: var(--text-secondary);
  background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); padding: 6px 8px; border-radius: 4px; box-sizing: border-box; opacity: 0.8;
}
.string-input:focus { opacity: 1; outline: none; border-color: var(--accent-color); }
</style>