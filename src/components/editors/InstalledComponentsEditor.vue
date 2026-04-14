<script setup>
import { ref, watch, computed, nextTick } from 'vue';
import { SelectOptions, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';
import { useFileSystem } from '../../composables/useFileSystem';

// ADDED FOR ANDROID (CAPACITOR)
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  parentData: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);
const { getItemsByType } = useGameDatabase();
const { searchImageFile } = useFileSystem();

const globSprites = import.meta.glob([
  '/public/sprites/**/*.{png,jpg,jpeg}',
  '/src/sprites/**/*.{png,jpg,jpeg}',
  '/src/assets/sprites/**/*.{png,jpg,jpeg}'
], { eager: true, query: '?url' });

const allLocalSprites = {};
for (const path in globSprites) {
  if (path.startsWith('/public/')) {
    // Prepend Vite's base URL so it works on GitHub Pages
    allLocalSprites[path] = import.meta.env.BASE_URL + path.replace('/public/', ''); 
  } else {
    allLocalSprites[path] = globSprites[path].default || globSprites[path];
  }
}

// UPDATED IMAGE LOADING LOGIC
const resolveImage = async (fileName) => {
  if (!fileName) return null;

  if (typeof searchImageFile === 'function') {
    const handle = searchImageFile(fileName);
    if (handle) {
      try {
        if (handle.kind === 'native') {
          const result = await Filesystem.getUri({ path: handle.path, directory: Directory.Documents });
          return Capacitor.convertFileSrc(result.uri);
        } else if (handle.getFile) {
          const file = await handle.getFile();
          return URL.createObjectURL(file);
        }
      } catch (e) {
        console.error("Error loading image:", e);
      }
    }
  }

  const nameLower = fileName.includes('.') ? fileName.toLowerCase() : `${fileName.toLowerCase()}.png`;
  const foundKey = Object.keys(allLocalSprites).find(key => key.toLowerCase().endsWith(`/${nameLower}`));
  return foundKey ? allLocalSprites[foundKey] : `${import.meta.env.BASE_URL}sprites/${nameLower}`;
};

const componentIcons = ref({});

const loadIcon = async (compId) => {
  if (!compId || componentIcons.value[compId] !== undefined) return;
  componentIcons.value[compId] = null;
  const components = getItemsByType(ItemType.Component) || [];
  const comp = components.find(c => c.id === compId);
  if (comp && comp.data && comp.data.Icon) {
    const url = await resolveImage(comp.data.Icon);
    componentIcons.value[compId] = { url: url, color: comp.data.Color || null };
  }
};

const toHtmlColor = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  if (hex.startsWith('#') && hex.length === 9) return '#' + hex.substring(3);
  return hex;
};

// COLORS FROM THE GAME
const getShipCellBg = (typeChar) => {
  const c1 = 'rgba(74, 134, 232, 0.4)';  // 1: Blue
  const c2 = 'rgba(106, 168, 79, 0.4)';  // 2: Green
  const c4 = 'rgba(204, 0, 0, 0.4)';     // 4: Red
  const c5 = 'rgba(241, 194, 50, 0.4)';  // 5: Yellow
  switch(typeChar) {
    case '1': return c1;
    case '2': return c2;
    case '3': return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`; // 3: Blue-green
    case '4': return c4;
    case '5': return c5;
    default: return 'rgba(136, 136, 136, 0.2)';
  }
};

const getShipCellBorder = (typeChar) => {
  switch(typeChar) {
    case '1': return '#4a86e8';
    case '2': return '#6aa84f';
    case '3': return '#4a86e8';
    case '4': return '#cc0000';
    case '5': return '#f1c232';
    default: return 'rgba(136, 136, 136, 0.5)';
  }
};

watch(() => props.modelValue, (newVal) => {
  if (newVal && Array.isArray(newVal)) {
    newVal.forEach(item => { if (item.ComponentId) loadIcon(item.ComponentId); });
  }
}, { deep: true, immediate: true });

const collapsedItems = ref({});
const hoveredItemIdx = ref(null);

const toggleCollapse = (idx) => {
  collapsedItems.value = { ...collapsedItems.value, [idx]: !collapsedItems.value[idx] };
};

const focusItem = async (idx) => {
  collapsedItems.value = { ...collapsedItems.value, [idx]: false };
  await nextTick();
  const el = document.getElementById('ic-item-' + idx);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash-highlight');
    void el.offsetWidth;
    el.classList.add('flash-highlight');
  }
};

const expandAll = () => { collapsedItems.value = {}; };
const collapseAll = () => {
  const newCollapsed = {};
  (props.modelValue || []).forEach((_, i) => { newCollapsed[i] = true; });
  collapsedItems.value = newCollapsed;
};

const addItem = () => {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  arr.push({ ComponentId: 0, Modification: 0, Quality: 0, X: 0, Y: 0, BarrelId: 0, Behaviour: 0, KeyBinding: 0 });
  emit('update:modelValue', arr);
  collapsedItems.value = { ...collapsedItems.value, [arr.length - 1]: false };
};

const updateItem = (idx, field, val) => {
  const arr = [...props.modelValue];
  arr[idx] = { ...arr[idx], [field]: val };
  emit('update:modelValue', arr);
  if (field === 'ComponentId') loadIcon(val);
};

const removeItem = (idx) => {
  const arr = [...props.modelValue];
  arr.splice(idx, 1);
  emit('update:modelValue', arr);
  const newCollapsed = {};
  for (const [key, isCollapsed] of Object.entries(collapsedItems.value)) {
    const k = Number(key);
    if (k < idx) newCollapsed[k] = isCollapsed;
    else if (k > idx) newCollapsed[k - 1] = isCollapsed;
  }
  collapsedItems.value = newCollapsed;
};

const getComponentName = (id) => {
  const components = getItemsByType(ItemType.Component) || [];
  const comp = components.find(c => c.id === id);
  return comp ? comp.name : 'Empty';
};

const baseShipCells = computed(() => {
  const cells = [];
  if (!props.parentData) return cells;
  let layoutStr = null;
  if (props.parentData.ShipId) {
    const ships = getItemsByType(ItemType.Ship) || [];
    const ship = ships.find(s => s.id === props.parentData.ShipId);
    if (ship && ship.data) layoutStr = ship.data.Layout;
  } else if (props.parentData.SatelliteId) {
    const sats = getItemsByType(ItemType.Satellite) || [];
    const sat = sats.find(s => s.id === props.parentData.SatelliteId);
    if (sat && sat.data) layoutStr = sat.data.Layout;
  }
  if (layoutStr && typeof layoutStr === 'string') {
    const str = layoutStr.replace(/\s/g, '');
    const size = Math.ceil(Math.sqrt(str.length));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const char = str[r * size + c];
        if (char && char !== '0') {
          cells.push({ rx: c, ry: r, type: char });
        }
      }
    }
  }
  return cells;
});

const previewGrid = computed(() => {
  const items = props.modelValue || [];
  const shipCells = baseShipCells.value;
  if (items.length === 0 && shipCells.length === 0) return null;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  shipCells.forEach(cell => {
    minX = Math.min(minX, cell.rx);
    maxX = Math.max(maxX, cell.rx);
    minY = Math.min(minY, cell.ry);
    maxY = Math.max(maxY, cell.ry);
  });
  const placed = items.map((item, idx) => {
    const compId = item.ComponentId;
    const components = getItemsByType(ItemType.Component) || [];
    const compData = components.find(c => c.id === compId)?.data || {};
    const cx = item.X || 0;
    const cy = item.Y || 0;
    let cells = [];
    let size = 1;
    let minDx = Infinity, maxDx = -Infinity, minDy = Infinity, maxDy = -Infinity;
    if (compData.Layout && typeof compData.Layout === 'string') {
      const str = compData.Layout.replace(/\s/g, '');
      size = Math.ceil(Math.sqrt(str.length));
      for(let r = 0; r < size; r++) {
        for(let c = 0; c < size; c++) {
          if (str[r * size + c] !== '0') {
            cells.push({ rx: cx + c, ry: cy + r });
            if (c < minDx) minDx = c;
            if (c > maxDx) maxDx = c;
            if (r < minDy) minDy = r;
            if (r > maxDy) maxDy = r;
          }
        }
      }
    }
    if (cells.length === 0) {
      cells.push({ rx: cx, ry: cy });
      minDx = 0; maxDx = 0; minDy = 0; maxDy = 0;
    }
    cells.forEach(c => {
      minX = Math.min(minX, c.rx);
      maxX = Math.max(maxX, c.rx);
      minY = Math.min(minY, c.ry);
      maxY = Math.max(maxY, c.ry);
    });
    const layoutCenter = (size - 1) / 2;
    const activeCenterDx = (minDx + maxDx) / 2;
    const activeCenterDy = (minDy + maxDy) / 2;
    const shiftX = activeCenterDx - layoutCenter;
    const shiftY = activeCenterDy - layoutCenter;
    return {
      idx, id: compId, size, cells,
      x: cx, y: cy,
      shiftX, shiftY,
      iconUrl: componentIcons.value[compId]?.url || null,
      iconColor: componentIcons.value[compId]?.color || null
    };
  });
  if (minX === Infinity) return null;
  minX -= 2; maxX += 2;
  minY -= 2; maxY += 2;
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const cellSize = 28;
  return { minX, maxX, minY, maxY, cols, rows, cellSize, placed, shipCells };
});
</script>

<template>
  <div class="installed-components-wrapper">
    
    <div v-if="previewGrid" class="map-preview-panel">
      <div class="map-preview-header">
        <span>Ship Assembly Grid</span>
        <span style="opacity:0.5; font-weight:normal;">Hover to highlight</span>
      </div>
      <div class="map-viewport">
        <div class="map-grid-container" 
             :style="{ 
               width: previewGrid.cols * previewGrid.cellSize + 'px', 
               height: previewGrid.rows * previewGrid.cellSize + 'px',
               backgroundSize: previewGrid.cellSize + 'px ' + previewGrid.cellSize + 'px'
             }">
             
           <div v-for="(cell, cIdx) in previewGrid.shipCells" :key="'ship-'+cIdx"
                class="map-cell ship-base-cell"
                :style="{
                   left: (cell.rx - previewGrid.minX) * previewGrid.cellSize + 'px',
                   top: (cell.ry - previewGrid.minY) * previewGrid.cellSize + 'px',
                   width: previewGrid.cellSize + 'px',
                   height: previewGrid.cellSize + 'px',
                   background: getShipCellBg(cell.type),
                   borderColor: getShipCellBorder(cell.type)
                }">
           </div>

           <template v-for="item in previewGrid.placed" :key="item.idx">
             <div class="map-component-wrapper">
               
               <div v-for="(cell, cIdx) in item.cells" :key="cIdx"
                    class="map-cell comp-cell"
                    @click.stop="focusItem(item.idx)"
                    :style="{
                       left: (cell.rx - previewGrid.minX) * previewGrid.cellSize + 'px',
                       top: (cell.ry - previewGrid.minY) * previewGrid.cellSize + 'px',
                       width: previewGrid.cellSize + 'px',
                       height: previewGrid.cellSize + 'px'
                    }">
               </div>
               
               <div class="map-icon-layer"
                    :style="{
                       left: (item.x - previewGrid.minX) * previewGrid.cellSize + 'px',
                       top: (item.y - previewGrid.minY) * previewGrid.cellSize + 'px',
                       width: item.size * previewGrid.cellSize + 'px',
                       height: item.size * previewGrid.cellSize + 'px'
                    }">
                    <div class="map-icon-stack" v-if="item.iconUrl"
                         :style="{ transform: `translate(${item.shiftX * previewGrid.cellSize}px, ${item.shiftY * previewGrid.cellSize}px)` }">
                      <img :src="item.iconUrl" @error="e => e.target.style.display='none'" />
                      <div v-if="item.iconColor" class="map-icon-tint" :style="{
                          backgroundColor: toHtmlColor(item.iconColor),
                          maskImage: `url('${item.iconUrl}')`,
                          WebkitMaskImage: `url('${item.iconUrl}')`
                      }"></div>
                    </div>
                    <div v-else class="map-no-icon">#{{ item.idx + 1 }}</div>
               </div>
               
             </div>
           </template>
        </div>
      </div>
    </div>

    <div v-if="modelValue && modelValue.length > 0" class="global-controls">
      <button @click="expandAll" class="btn-control">Expand All</button>
      <button @click="collapseAll" class="btn-control">Collapse All</button>
    </div>

    <div v-for="(item, idx) in (modelValue || [])" :key="idx" :id="'ic-item-' + idx" class="ic-item">
      
      <div class="ic-header">
        <button @click="toggleCollapse(idx)" class="btn-collapse" :title="collapsedItems[idx] ? 'Expand' : 'Collapse'">
          {{ collapsedItems[idx] ? '▼' : '▲' }}
        </button>
        
        <span class="ic-index">#{{ idx + 1 }}</span>
        
        <div v-if="componentIcons[item.ComponentId]?.url" class="ic-mini-icon-wrapper">
          <div class="ic-mini-icon-stack">
            <img :src="componentIcons[item.ComponentId].url" class="ic-mini-img" @error="e => e.target.style.display='none'" />
            <div v-if="componentIcons[item.ComponentId].color" class="ic-mini-tint" :style="{ 
              backgroundColor: toHtmlColor(componentIcons[item.ComponentId].color), 
              maskImage: `url('${componentIcons[item.ComponentId].url}')`,
              WebkitMaskImage: `url('${componentIcons[item.ComponentId].url}')`
            }"></div>
          </div>
        </div>
        
        <span class="ic-title">{{ getComponentName(item.ComponentId) }}</span>
        <button @click="removeItem(idx)" class="btn-del">×</button>
      </div>

      <div v-show="!collapsedItems[idx]" class="ic-body">
        <div class="ic-row">
          <div class="field-box">
            <label>Component</label>
            <select :value="item.ComponentId || 0" @change="e => updateItem(idx, 'ComponentId', Number(e.target.value))" class="win-input">
              <option :value="0" class="dark-opt">[NONE]</option>
              <option v-for="comp in getItemsByType(ItemType.Component)" :key="comp.id" :value="comp.id" class="dark-opt">
                [ID: {{ comp.id }}] {{ comp.name }}
              </option>
            </select>
          </div>
          <div class="field-box">
            <label>Modification</label>
            <select :value="item.Modification || 0" @change="e => updateItem(idx, 'Modification', Number(e.target.value))" class="win-input">
              <option :value="0" class="dark-opt">[NONE]</option>
              <option v-for="mod in getItemsByType(ItemType.ComponentMod)" :key="mod.id" :value="mod.id" class="dark-opt">
                [ID: {{ mod.id }}] {{ mod.name || 'Mod' }}
              </option>
            </select>
          </div>
        </div>

        <div class="ic-row">
          <div class="field-box">
            <label>Quality</label>
            <select :value="item.Quality || 0" @change="e => updateItem(idx, 'Quality', Number(e.target.value))" class="win-input">
              <option v-for="(opt, oIdx) in SelectOptions.ModificationQuality" :key="oIdx" :value="oIdx" class="dark-opt">
                {{ opt }}
              </option>
            </select>
          </div>
          <div class="field-box">
            <label>Barrel ID</label>
            <input type="number" :value="item.BarrelId || 0" @input="e => updateItem(idx, 'BarrelId', parseInt(e.target.value))" min="0" max="255" class="win-input">
          </div>
          <div class="field-box">
            <label>Behaviour</label>
            <input type="number" :value="item.Behaviour || 0" @input="e => updateItem(idx, 'Behaviour', parseInt(e.target.value))" min="0" max="10" class="win-input">
          </div>
          <div class="field-box">
            <label>Key Binding</label>
            <input type="number" :value="item.KeyBinding || 0" @input="e => updateItem(idx, 'KeyBinding', parseInt(e.target.value))" min="-10" max="10" class="win-input">
          </div>
        </div>

        <div class="ic-row">
          <div class="field-box">
            <label>Pos X</label>
            <input type="number" :value="item.X || 0" @input="e => updateItem(idx, 'X', parseInt(e.target.value))" min="-32768" max="32767" class="win-input">
          </div>
          <div class="field-box">
            <label>Pos Y</label>
            <input type="number" :value="item.Y || 0" @input="e => updateItem(idx, 'Y', parseInt(e.target.value))" min="-32768" max="32767" class="win-input">
          </div>
        </div>
      </div>
    </div>
    
    <button @click="addItem" class="btn-add giant">+ ADD COMPONENT</button>
  </div>
</template>

<style scoped>
.installed-components-wrapper { display: flex; flex-direction: column; gap: 10px; width: 100%; min-width: 100%; box-sizing: border-box; }

/* === FIXED CSS CENTERING (REMOVED TOP CLIPPING) === */
.map-preview-panel { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; display: flex; flex-direction: column; overflow: hidden; box-shadow: inset 0 5px 15px rgba(0,0,0,0.5);}
.map-preview-header { padding: 8px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px; font-weight: bold; color: var(--accent-color); text-transform: uppercase; display: flex; justify-content: space-between; background: rgba(255,255,255,0.02);}

.map-viewport { 
  overflow: auto; 
  max-height: 60vh; 
  padding: 30px; 
}

.map-grid-container { 
  position: relative; 
  margin: 0 auto; 
  background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px); 
}

.ship-base-cell { position: absolute; box-sizing: border-box; border: 1px solid; border-radius: 2px; pointer-events: none; z-index: 0; }
.map-component-wrapper { display: contents; }

.comp-cell { 
  position: absolute; box-sizing: border-box; border-radius: 2px;
  background-color: transparent !important; border: 1px solid transparent !important;
  cursor: pointer; pointer-events: auto; z-index: 1; transition: background-color 0.1s;
}

.map-icon-layer { position: absolute; pointer-events: none; transition: transform 0.1s; z-index: 2; }
.map-icon-stack { position: relative; width: 100%; height: 100%; transition: transform 0.1s linear;}
.map-icon-stack img { width: 100%; height: 100%; object-fit: contain; object-position: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
.map-icon-tint { position: absolute; top: 0; left: 0; width: 100%; height: 100%; mask-size: contain; mask-repeat: no-repeat; mask-position: center; -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; mix-blend-mode: multiply; pointer-events: none; }
.map-no-icon { font-size: 10px; font-family: monospace; font-weight: bold; color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;}

.map-component-wrapper:hover .comp-cell { background-color: rgba(255,255,255,0.2) !important; border-color: white !important; z-index: 5; }
.map-component-wrapper:hover .map-icon-layer { transform: scale(1.15); z-index: 10; filter: drop-shadow(0 0 10px var(--accent-color)); }

/* === OTHER LIST STYLES === */
.global-controls { display: flex; gap: 10px; margin-bottom: 5px; width: 100%; box-sizing: border-box;}
.btn-control { flex: 1; padding: 6px; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 11px; text-transform: uppercase; font-weight: bold; width: 100%;}
.btn-control:hover { background: rgba(255,255,255,0.1); color: white; }

.ic-item { background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); border-left: 4px solid #55aaff; padding: 12px; border-radius: 4px; width: 100%; align-self: stretch; box-sizing: border-box; display: block; transition: all 0.3s ease; }
.ic-item:hover { border-color: rgba(85, 170, 255, 0.5); }
.ic-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; width: 100%; box-sizing: border-box;}
.ic-body { padding-top: 5px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;}

.btn-collapse { background: transparent; border: none; color: var(--text-secondary); font-size: 12px; cursor: pointer; padding: 2px 5px; opacity: 0.7; transition: 0.2s; }
.btn-collapse:hover { opacity: 1; color: white; }

.ic-index { font-weight: bold; color: #55aaff; font-size: 12px; font-family: monospace; }

.ic-mini-icon-wrapper { width: 24px; height: 24px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 2px; }
.ic-mini-icon-stack { position: relative; width: 100%; height: 100%; }
.ic-mini-img { width: 100%; height: 100%; object-fit: contain; }
.ic-mini-tint { position: absolute; top: 0; left: 0; width: 100%; height: 100%; mix-blend-mode: multiply; pointer-events: none; mask-size: 100% 100%; -webkit-mask-size: 100% 100%; }

.ic-title { flex: 1; font-weight: bold; color: var(--text-primary); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.btn-del { background: rgba(255,50,50,0.1); color: #ff5555; border: 1px solid #ff5555; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;}
.btn-del:hover { background: #ff5555; color: white; }

/* === RESPONSIVE ROW STYLES === */
.ic-row { display: flex; gap: 10px; width: 100%; box-sizing: border-box; flex-wrap: wrap; }

.field-box { 
  display: flex; align-items: center; gap: 8px; 
  flex: 1 1 calc(25% - 10px); min-width: 120px; 
  background: rgba(255,255,255,0.02); padding: 6px; 
  border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; box-sizing: border-box;
}

.field-box label { font-size: 10px; font-weight: bold; color: var(--text-secondary); opacity: 0.8; width: 80px; text-transform: uppercase; white-space: nowrap;}

.win-input { flex: 1; width: 100%; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 11px; box-sizing: border-box; }
.win-input:focus { border-color: var(--accent-color); outline: none; }
.dark-opt { background: #2b2b2b; color: #ffffff; }

.btn-add { width: 100%; padding: 6px; background: transparent; border: 1px dashed var(--border-light); color: var(--text-secondary); cursor: pointer; border-radius: 4px; transition: 0.2s; box-sizing: border-box;}
.btn-add:hover { border-color: #55aaff; color: #55aaff; background: rgba(85, 170, 255, 0.05); }
.btn-add.giant { padding: 12px; font-size: 14px; border-color: #55aaff; color: #55aaff; margin-top: 5px;}

.flash-highlight { animation: flash-animation 1.5s ease-out !important; }
@keyframes flash-animation {
  0% { border-color: #55aaff; box-shadow: 0 0 20px rgba(85, 170, 255, 0.8); background: rgba(85, 170, 255, 0.2); }
  100% { border-color: var(--border-light); box-shadow: none; background: rgba(0,0,0,0.2); }
}

/* === MOBILE ADAPTATION === */
@media (max-width: 768px) {
  .map-viewport {
    padding: 10px; /* Less empty space around the map on mobile */
  }

  .ic-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .field-box {
    flex-direction: column;
    align-items: flex-start;
    flex: 1 1 100%;
    gap: 4px;
    padding: 8px;
  }
  
  .field-box label {
    width: 100%;
    margin-bottom: 2px;
  }
}
</style>