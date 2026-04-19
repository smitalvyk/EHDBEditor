<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  backgroundImage: { type: String, default: null }
});

const emit = defineEmits(['update:modelValue']);

// === COLLAPSE MANAGEMENT ===
const collapsedItems = ref({});
const toggleCollapse = (idx) => { collapsedItems.value = { ...collapsedItems.value, [idx]: !collapsedItems.value[idx] }; };
const expandAll = () => { collapsedItems.value = {}; };
const collapseAll = () => {
  const newCollapsed = {};
  (props.modelValue || []).forEach((_, i) => { newCollapsed[i] = true; });
  collapsedItems.value = newCollapsed;
};

// === ARC LOGIC ===
const getEffectiveArc = (item) => {
  const arc = Number(item.AutoAimingArc) || 0;
  if (arc > 0) return arc;
  
  switch (Number(item.PlatformType) || 0) {
    case 1: return 360; // AutoTarget
    case 2: return 80;  // AutoTargetFrontal
    case 3: return 20;  // TargetingUnit
    case 0: 
    default: return 0;  // Common
  }
};

// Вычисляем визуальный угол (угол * 2, ограничиваем до 360)
const getVisualArc = (item) => {
  return Math.min(360, getEffectiveArc(item) * 2);
};

const getArcPath = (arcAngle) => {
  if (arcAngle <= 0 || arcAngle >= 360) return '';
  
  const radius = 0.5;
  const startAngle = -(arcAngle / 2) * (Math.PI / 180);
  const endAngle = (arcAngle / 2) * (Math.PI / 180);

  const x1 = radius * Math.sin(startAngle);
  const y1 = radius * Math.cos(startAngle);
  const x2 = radius * Math.sin(endAngle);
  const y2 = radius * Math.cos(endAngle);

  const largeArcFlag = arcAngle > 180 ? 1 : 0;

  // ИСПРАВЛЕНИЕ: Последний ноль перед ${x2} — это sweep-flag. 
  // Мы поменяли 1 на 0, чтобы дуга рисовалась правильно (не пересекаясь).
  return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${x2} ${y2} Z`;
};

// === ARRAY MANAGEMENT ===
const addBarrel = () => {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  arr.push({ Position: { x: 0, y: 0 }, Rotation: 0, Offset: 0, PlatformType: 0, AutoAimingArc: 0, RotationSpeed: 0, WeaponClass: "", Image: "", Size: 0 });
  emit('update:modelValue', arr);
  collapsedItems.value = { ...collapsedItems.value, [arr.length - 1]: false };
};

const updateBarrel = (idx, field, val) => {
  const arr = [...props.modelValue];
  arr[idx] = { ...arr[idx], [field]: val };
  emit('update:modelValue', arr);
};

const updateBarrelNum = (idx, field, rawVal) => {
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
  if (isNaN(num)) return 0;
  return Math.max(-1.5, Math.min(1.5, num));
};

const removeBarrel = (idx) => {
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
            
            <svg class="preview-svg" viewBox="-1 -1 2 2" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
              <g transform="scale(1, -1)">
                <defs>
                  <g id="arrow-shape-red">
                    <line x1="-0.15" y1="0" x2="0.15" y2="0" stroke="red" stroke-width="0.015" />
                    <line x1="0" y1="-0.15" x2="0" y2="0.4" stroke="red" stroke-width="0.015" />
                    <path d="M -0.12 0.28 L 0 0.4 L 0.12 0.28" fill="none" stroke="red" stroke-width="0.015" />
                  </g>
                </defs>

                <line x1="-1" y1="0" x2="1" y2="0" stroke="#00ff00" stroke-width="0.01" stroke-dasharray="0.05, 0.05" opacity="0.8"/>
                <line x1="0" y1="-1" x2="0" y2="1" stroke="#00ff00" stroke-width="0.01" stroke-dasharray="0.05, 0.05" opacity="0.8"/>

                <g v-for="(item, idx) in modelValue" :key="idx"
                  :transform="`translate(${-clampPos(item.Position?.y)}, ${clampPos(item.Position?.x)}) rotate(${item.Rotation ?? 0})`">
                  <g transform="scale(0.6)">
                    
                    <path v-if="getVisualArc(item) > 0 && getVisualArc(item) < 360"
                          :d="getArcPath(getVisualArc(item))"
                          fill="rgba(255, 170, 0, 0.3)" stroke="#ffaa00" stroke-width="0.015" stroke-linejoin="round" />
                          
                    <circle v-if="getVisualArc(item) >= 360"
                            cx="0" cy="0" r="0.5" 
                            fill="rgba(255, 170, 0, 0.3)" stroke="#ffaa00" stroke-width="0.015" />

                    <use href="#arrow-shape-red" />
                    <circle cx="0" cy="0" :r="Math.max(0, 0.06 * (1 + (item.Offset ?? 0)))" fill="none" stroke="red" stroke-width="0.015" />
                    
                    <circle cx="0" cy="0" r="0.08" fill="#1e1e1e" stroke="#ffff00" stroke-width="0.01" />
                    <text x="0" y="0.01" font-size="0.09" fill="#ffff00" text-anchor="middle" dominant-baseline="central" font-weight="bold" transform="scale(1, -1)">
                      {{ idx + 1 }}
                    </text>

                  </g>
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

    <div v-for="(item, idx) in (modelValue || [])" :key="idx" class="ic-item">
      <div class="ic-header">
        <button @click="toggleCollapse(idx)" class="btn-collapse">{{ collapsedItems[idx] ? '▼' : '▲' }}</button>
        <span class="ic-index">Barrel #{{ idx + 1 }}</span>
        <span class="ic-title">{{ item.WeaponClass ? item.WeaponClass : 'Empty' }}</span>
        <button @click="removeBarrel(idx)" class="btn-del">×</button>
      </div>

      <div v-show="!collapsedItems[idx]" class="ic-body">
        
        <div class="ic-row">
          <div class="field-box"><label>Pos X</label><input type="number" :value="item.Position?.x ?? 0" @input="e => updatePositionNum(idx, 'x', e.target.value)" step="0.01" min="-1.5" max="1.5" class="win-input"></div>
          <div class="field-box"><label>Pos Y</label><input type="number" :value="item.Position?.y ?? 0" @input="e => updatePositionNum(idx, 'y', e.target.value)" step="0.01" min="-1.5" max="1.5" class="win-input"></div>
          <div class="field-box"><label>Offset</label><input type="number" :value="item.Offset ?? 0" @input="e => updateBarrelNum(idx, 'Offset', e.target.value)" min="0" step="0.1" class="win-input"></div>
        </div>

        <div class="ic-row">
          <div class="field-box">
            <label>Platform Type</label>
            <select :value="item.PlatformType ?? 0" @change="e => updateBarrelNum(idx, 'PlatformType', e.target.value)" class="win-input">
              <option :value="0" class="dark-opt">Common</option>
              <option :value="1" class="dark-opt">AutoTarget</option>
              <option :value="2" class="dark-opt">AutoTargetFrontal</option>
              <option :value="3" class="dark-opt">TargetingUnit</option>
            </select>
          </div>
          <div class="field-box"><label>Rotation</label><input type="number" :value="item.Rotation ?? 0" @input="e => updateBarrelNum(idx, 'Rotation', e.target.value)" min="-360" max="360" step="0.1" class="win-input"></div>
          <div class="field-box"><label>Rot. Speed</label><input type="number" :value="item.RotationSpeed ?? 0" @input="e => updateBarrelNum(idx, 'RotationSpeed', e.target.value)" min="0" max="1000" step="0.1" class="win-input"></div>
        </div>

        <div class="ic-row">
          <div class="field-box"><label>Auto Aim Arc</label><input type="number" :value="item.AutoAimingArc ?? 0" @input="e => updateBarrelNum(idx, 'AutoAimingArc', e.target.value)" min="0" max="360" step="0.1" class="win-input"></div>
          <div class="field-box"><label>Weapon Class</label><input type="text" :value="item.WeaponClass || ''" @input="e => updateBarrel(idx, 'WeaponClass', e.target.value)" class="win-input"></div>
          <div class="field-box"><label>Size</label><input type="number" :value="item.Size ?? 0" @input="e => updateBarrelNum(idx, 'Size', e.target.value)" min="0" max="100" step="0.1" class="win-input"></div>
        </div>

        <div class="ic-row">
          <div class="field-box" style="flex: 1 1 100%;"><label>Image</label><input type="text" :value="item.Image || ''" @input="e => updateBarrel(idx, 'Image', e.target.value)" class="win-input"></div>
        </div>

      </div>
    </div>
    
    <button @click="addBarrel" class="btn-add giant">+ ADD BARREL</button>

  </div>
</template>

<style scoped>
.barrels-wrapper { display: flex; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; }

/* === PREVIEW === */
.preview-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 15px; background: rgba(0,0,0,0.15); border: 1px solid var(--border-light); border-radius: 6px; padding: 10px; }
.barrel-preview-container { display: flex; justify-content: center; width: 100%; }

.barrel-preview-bg { 
  width: 100%; 
  max-width: 500px; 
  background-color: #607d8b; 
  border-radius: 4px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  padding: 15px;
  box-sizing: border-box;
}

.preview-content-wrapper { 
  position: relative; 
  width: 100%; 
  max-width: 400px; 
  aspect-ratio: 1 / 1; 
  border: 1px solid #000000; 
  background: rgba(0,0,0,0.1);
}

.preview-image {
  position: absolute;
  width: 100%; 
  height: 100%;
  object-fit: contain;
  opacity: 0.7; 
  z-index: 1;
  pointer-events: none;
}

.preview-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; }

/* === OTHER STYLES === */
.global-controls { display: flex; gap: 10px; margin-bottom: 5px; }
.btn-control { flex: 1; padding: 6px; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 11px; text-transform: uppercase; font-weight: bold; }
.btn-control:hover { background: rgba(255,255,255,0.1); color: white; }
.ic-item { background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); border-left: 4px solid #ffaa00; padding: 12px; border-radius: 4px; display: block; }
.ic-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; }
.ic-body { padding-top: 5px; display: flex; flex-direction: column; gap: 10px;}
.btn-collapse { background: transparent; border: none; color: var(--text-secondary); font-size: 12px; cursor: pointer; padding: 2px 5px; opacity: 0.7; transition: 0.2s; }
.btn-collapse:hover { opacity: 1; color: white; }
.ic-index { font-weight: bold; color: #ffaa00; font-size: 12px; font-family: monospace; }
.ic-title { flex: 1; font-weight: bold; color: var(--text-primary); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-del { background: rgba(255,50,50,0.1); color: #ff5555; border: 1px solid #ff5555; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* Desktop Row Styles */
.ic-row { display: flex; gap: 10px; flex-wrap: wrap; }
.field-box { display: flex; align-items: center; gap: 8px; flex: 1 1 calc(33.333% - 10px); min-width: 120px; background: rgba(255,255,255,0.02); padding: 6px; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px;}
.field-box label { font-size: 10px; font-weight: bold; color: var(--text-secondary); opacity: 0.8; width: 80px; text-transform: uppercase; white-space: nowrap;}
.win-input { flex: 1; width: 100%; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 11px; box-sizing: border-box;}
.win-input:focus { border-color: var(--accent-color); outline: none; }
.dark-opt { background: #2b2b2b; color: #ffffff; }

.btn-add { width: 100%; padding: 6px; background: transparent; border: 1px dashed var(--border-light); color: var(--text-secondary); cursor: pointer; border-radius: 4px; transition: 0.2s; }
.btn-add:hover { border-color: #ffaa00; color: #ffaa00; background: rgba(255, 170, 0, 0.05); }
.btn-add.giant { padding: 12px; font-size: 14px; border-color: #ffaa00; color: #ffaa00; margin-top: 5px;}

/* === RESPONSIVE (MOBILE) === */
@media (max-width: 768px) {
  .ic-row {
    flex-direction: column; 
    gap: 8px;
  }
  
  .field-box {
    flex-direction: column; 
    align-items: flex-start;
    flex: 1 1 100% !important; 
    gap: 4px;
    padding: 8px;
  }
  
  .field-box label {
    width: 100%; 
    margin-bottom: 2px;
  }
}
</style>