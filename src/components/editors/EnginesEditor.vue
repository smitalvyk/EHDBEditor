<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  backgroundImage: { type: String, default: null }
});
const emit = defineEmits(['update:modelValue']);

const collapsedItems = ref({});
const toggleCollapse = (idx) => { collapsedItems.value = { ...collapsedItems.value, [idx]: !collapsedItems.value[idx] }; };
const expandAll = () => { collapsedItems.value = {}; };
const collapseAll = () => {
  const newCollapsed = {};
  (props.modelValue || []).forEach((_, i) => { newCollapsed[i] = true; });
  collapsedItems.value = newCollapsed;
};

const addEngine = () => {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  arr.push({ Position: { x: 0, y: 0 }, Size: 0.5 });
  emit('update:modelValue', arr);
  collapsedItems.value = { ...collapsedItems.value, [arr.length - 1]: false };
};

const updateEngineNum = (idx, field, rawVal) => {
  const arr = [...props.modelValue];
  const num = parseFloat(String(rawVal).replace(',', '.'));
  arr[idx] = { ...arr[idx], [field]: isNaN(num) ? 0 : num };
  emit('update:modelValue', arr);
};

const updatePositionNum = (idx, axis, rawVal) => {
  const arr = [...props.modelValue];
  const pos = arr[idx].Position || { x: 0, y: 0 };
  const num = parseFloat(String(rawVal).replace(',', '.'));
  arr[idx] = { ...arr[idx], Position: { ...pos, [axis]: isNaN(num) ? 0 : num } };
  emit('update:modelValue', arr);
};

const clampPos = (rawVal) => {
  if (rawVal === undefined || rawVal === null) return 0;
  const num = parseFloat(String(rawVal).replace(',', '.'));
  return isNaN(num) ? 0 : Math.max(-1.5, Math.min(1.5, num));
};

const removeEngine = (idx) => {
  const arr = [...props.modelValue];
  arr.splice(idx, 1);
  emit('update:modelValue', arr);
};
</script>

<template>
  <div class="barrels-wrapper">
    
    <div v-if="backgroundImage" class="preview-section">
      <div class="barrel-preview-container">
        <div class="barrel-preview-bg">
          <div class="preview-content-wrapper">
            
            <img :src="backgroundImage" class="preview-image" style="transform: rotate(-90deg);" />
            
            <svg class="preview-svg" viewBox="-1 -1 2 2" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
              <g transform="scale(1, -1)">
                <line x1="-1" y1="0" x2="1" y2="0" stroke="#00ff00" stroke-width="0.01" stroke-dasharray="0.05, 0.05" opacity="0.8"/>
                <line x1="0" y1="-1" x2="0" y2="1" stroke="#00ff00" stroke-width="0.01" stroke-dasharray="0.05, 0.05" opacity="0.8"/>
                
                <g v-for="(item, idx) in modelValue" :key="idx"
                  :transform="`translate(${-clampPos(item.Position?.y)}, ${clampPos(item.Position?.x)})`">
                  <circle cx="0" cy="0" :r="Math.max(0.01, (item.Size ?? 0.5) * 0.15)" fill="rgba(255, 255, 0, 0.6)" stroke="#ffcc00" stroke-width="0.01" />
                </g>
              </g>
            </svg>
            
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="modelValue && modelValue.length > 0" class="global-controls">
      <button @click="expandAll" class="btn-control">Expand All</button>
      <button @click="collapseAll" class="btn-control">Collapse All</button>
    </div>

    <div v-for="(item, idx) in (modelValue || [])" :key="idx" class="ic-item" style="border-left-color: #ffff44;">
      <div class="ic-header">
        <button @click="toggleCollapse(idx)" class="btn-collapse">{{ collapsedItems[idx] ? '▼' : '▲' }}</button>
        <span class="ic-index" style="color: #ffff44;">Engine #{{ idx + 1 }}</span>
        <button @click="removeEngine(idx)" class="btn-del">×</button>
      </div>

      <div v-show="!collapsedItems[idx]" class="ic-body">
        <div class="ic-row">
          <div class="field-box">
            <label>Pos X</label>
            <input type="number" :value="item.Position?.x ?? 0" @input="e => updatePositionNum(idx, 'x', e.target.value)" step="0.01" class="win-input">
          </div>
          <div class="field-box">
            <label>Pos Y</label>
            <input type="number" :value="item.Position?.y ?? 0" @input="e => updatePositionNum(idx, 'y', e.target.value)" step="0.01" class="win-input">
          </div>
          <div class="field-box">
            <label>Size</label>
            <input type="number" :value="item.Size ?? 0" @input="e => updateEngineNum(idx, 'Size', e.target.value)" min="0" step="0.01" class="win-input">
          </div>
        </div>
      </div>
    </div>
    
    <button @click="addEngine" class="btn-add giant" style="color: #ffff44; border-color: #ffff44;">+ ADD ENGINE</button>
  </div>
</template>
<style scoped>
.barrels-wrapper { display: flex; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; }

/* === PREVIEW === */
.preview-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 15px; background: rgba(0,0,0,0.15); border: 1px solid var(--border-light); border-radius: 6px; padding: 10px; }

.barrel-preview-container { display: flex; justify-content: center; width: 100%; }


.barrel-preview-bg { 
  width: 100%; 
  max-width: 640px; 
  aspect-ratio: 1 / 1;
  background-color: #607d8b; 
  border-radius: 4px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
}


.preview-content-wrapper { 
  position: relative; 
  width: 62.5%;
  aspect-ratio: 1 / 1;
  border: 1px solid rgba(0,0,0,0.5); 
  display: flex; 
  justify-content: center; 
  align-items: center; 
}

.preview-image {
  position: absolute;
  top: 0; left: 0;
  width: 100%; 
  height: 100%;
  object-fit: contain;
  opacity: 0.7; 
  z-index: 1;
  pointer-events: none;
}

.preview-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; }

.global-controls { display: flex; gap: 10px; margin-bottom: 5px; }
.btn-control { flex: 1; padding: 6px; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 11px; text-transform: uppercase; font-weight: bold; }
.btn-control:hover { background: rgba(255,255,255,0.1); color: white; }
.ic-item { background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); border-left-width: 4px; padding: 12px; border-radius: 4px; box-sizing: border-box; }
.ic-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; }
.ic-body { display: flex; flex-direction: column; gap: 10px; }
.btn-collapse { background: transparent; border: none; color: var(--text-secondary); font-size: 12px; cursor: pointer; padding: 2px 5px; opacity: 0.7; }
.btn-collapse:hover { opacity: 1; color: white; }
.ic-index { flex: 1; font-weight: bold; font-size: 12px; font-family: monospace; }
.btn-del { background: rgba(255,50,50,0.1); color: #ff5555; border: 1px solid #ff5555; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* Desktop Row Styles */
.ic-row { display: flex; gap: 10px; flex-wrap: wrap; }
.field-box { display: flex; align-items: center; gap: 8px; flex: 1 1 calc(33.333% - 10px); min-width: 120px; background: rgba(255,255,255,0.02); padding: 6px; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px;}
.field-box label { font-size: 10px; font-weight: bold; color: var(--text-secondary); width: 80px; text-transform: uppercase; }
.win-input { flex: 1; width: 100%; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 11px; box-sizing: border-box;}
.win-input:focus { border-color: var(--accent-color); outline: none; }
.btn-add { width: 100%; padding: 12px; background: transparent; border: 1px dashed; cursor: pointer; border-radius: 4px; font-weight: bold; transition: 0.2s; }
.btn-add:hover { background: rgba(255, 255, 68, 0.05); }

/* === RESPONSIVE (MOBILE) === */
@media (max-width: 768px) {
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