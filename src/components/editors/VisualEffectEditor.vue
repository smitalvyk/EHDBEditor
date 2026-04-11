<script setup>
import { computed, ref, watch, onUnmounted } from 'vue';
import { SelectOptions, VisualEffectTypeMap, ColorModeMap } from '../../data/enums';
import { useFileSystem } from '../../composables/useFileSystem';

// ADDED FOR ANDROID (CAPACITOR)
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:modelValue']);

// === IMAGE PREVIEW LOGIC ===
const { searchImageFile } = useFileSystem();
const previews = ref({});

// UPDATED IMAGE LOADING LOGIC
const resolveImage = async (index, imageName) => {
  if (!imageName) {
    previews.value[index] = null;
    return;
  }

  // 1. Try file system
  if (typeof searchImageFile === 'function') {
    const handle = searchImageFile(imageName);
    if (handle) {
      try {
        if (handle.kind === 'native') {
          const result = await Filesystem.getUri({ path: handle.path, directory: Directory.Documents });
          const url = Capacitor.convertFileSrc(result.uri);
          if (previews.value[index] && previews.value[index].startsWith('blob:')) {
            URL.revokeObjectURL(previews.value[index]);
          }
          previews.value[index] = url;
          return;
        } else if (handle.getFile) {
          const file = await handle.getFile();
          const url = URL.createObjectURL(file);
          if (previews.value[index] && previews.value[index].startsWith('blob:')) {
            URL.revokeObjectURL(previews.value[index]);
          }
          previews.value[index] = url;
          return;
        }
      } catch (e) {
        console.error("Failed to load image:", imageName, e);
      }
    }
  }

  // 2. Fallback static path
  const staticPath = imageName.includes('.') ? imageName : `${imageName}.png`;
  previews.value[index] = `/sprites/${staticPath}`;
};

watch(() => props.modelValue, (newVal) => {
  newVal.forEach((el, idx) => {
    resolveImage(idx, el.Image);
  });
}, { deep: true, immediate: true });

onUnmounted(() => {
  Object.values(previews.value).forEach(url => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
});

// === DATA MANIPULATION ===
const updateElement = (index, field, value) => {
  const newArray = [...props.modelValue];
  newArray[index] = { ...newArray[index], [field]: value };
  emit('update:modelValue', newArray);
};

const updateVector = (index, axis, value) => {
  const newArray = [...props.modelValue];
  const currentVector = newArray[index].Offset || { x: 0, y: 0 };
  newArray[index] = { ...newArray[index], Offset: { ...currentVector, [axis]: parseFloat(value) } };
  emit('update:modelValue', newArray);
};

const addElement = () => {
  const newArray = [...props.modelValue];
  newArray.push({
    Type: 9, // Sprite
    Image: "star",
    ColorMode: 1, // UseMyOwn
    Color: "#FFFFFFFF",
    Quantity: 1,
    Size: 1,
    GrowthRate: 0,
    TurnRate: 0,
    StartTime: 0,
    Lifetime: 1,
    ParticleSize: 1,
    Offset: { x: 0, y: 0 },
    Rotation: 0,
    Loop: false,
    Inverse: false,
    UseRealTime: false
  });
  emit('update:modelValue', newArray);
};

const removeElement = (index) => {
  const newArray = [...props.modelValue];
  newArray.splice(index, 1);
  if (previews.value[index]) {
    URL.revokeObjectURL(previews.value[index]);
    delete previews.value[index];
  }
  emit('update:modelValue', newArray);
};

const toPickerColor = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  if (hex.length > 7) return '#' + hex.substring(hex.length - 6);
  return hex;
};
</script>

<template>
  <div class="ve-container">
    <div v-for="(el, idx) in modelValue" :key="idx" class="ve-item">
      
      <div class="ve-header">
        <span class="ve-index">#{{ idx + 1 }}</span>
        <select :value="el.Type" @change="e => updateElement(idx, 'Type', Number(e.target.value))" class="win-input type-select">
          <option v-for="opt in SelectOptions.VisualEffectTypeList" :key="opt.id" :value="opt.id">
            {{ opt.name }}
          </option>
        </select>
        <button @click="removeElement(idx)" class="btn-delete" title="Remove Element">×</button>
      </div>

      <div class="ve-grid">
        
        <div class="field-row full-row vertical-field">
          <div class="input-line">
            <label>Image</label>
            <input type="text" :value="el.Image" @input="e => updateElement(idx, 'Image', e.target.value)" class="win-input" placeholder="Sprite name">
          </div>
          
          <div v-if="el.Image" class="img-preview-box-large">
            <img 
              v-if="previews[idx]" 
              :src="previews[idx]" 
              class="img-preview" 
              @error="(e) => e.target.style.display='none'"
            />
            <span v-else class="img-placeholder">No Preview</span>
          </div>
        </div>

        <div class="field-row">
          <label>Mode</label>
          <select :value="el.ColorMode" @change="e => updateElement(idx, 'ColorMode', Number(e.target.value))" class="win-input">
            <option v-for="opt in SelectOptions.ColorModeList" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
        </div>
        <div class="field-row">
          <label>Color</label>
          <div class="color-wrap">
             <input type="color" :value="toPickerColor(el.Color)" @input="e => updateElement(idx, 'Color', e.target.value)" class="color-picker">
             <input type="text" :value="el.Color" @input="e => updateElement(idx, 'Color', e.target.value)" class="win-input small-text">
          </div>
        </div>

        <div class="field-row"><label>Quantity</label><input type="number" :value="el.Quantity" @input="e => updateElement(idx, 'Quantity', Number(e.target.value))" class="win-input"></div>
        <div class="field-row"><label>Size</label><input type="number" :value="el.Size" @input="e => updateElement(idx, 'Size', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        
        <div class="field-row"><label>Growth</label><input type="number" :value="el.GrowthRate" @input="e => updateElement(idx, 'GrowthRate', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        <div class="field-row"><label>TurnRate</label><input type="number" :value="el.TurnRate" @input="e => updateElement(idx, 'TurnRate', parseFloat(e.target.value))" class="win-input" step="10"></div>
        
        <div class="field-row"><label>Start</label><input type="number" :value="el.StartTime" @input="e => updateElement(idx, 'StartTime', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        <div class="field-row"><label>Lifetime</label><input type="number" :value="el.Lifetime" @input="e => updateElement(idx, 'Lifetime', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        
        <div class="field-row"><label>Part.Size</label><input type="number" :value="el.ParticleSize" @input="e => updateElement(idx, 'ParticleSize', parseFloat(e.target.value))" class="win-input" step="0.1"></div>
        <div class="field-row"><label>Rotation</label><input type="number" :value="el.Rotation" @input="e => updateElement(idx, 'Rotation', parseFloat(e.target.value))" class="win-input" step="15"></div>

        <div class="field-row full-row vector-row">
          <label>Offset</label>
          <div class="vec-inputs">
            <span>X</span><input type="number" :value="el.Offset?.x || 0" @input="e => updateVector(idx, 'x', e.target.value)" class="win-input">
            <span>Y</span><input type="number" :value="el.Offset?.y || 0" @input="e => updateVector(idx, 'y', e.target.value)" class="win-input">
          </div>
        </div>

        <div class="field-row check-row"><label>Loop</label><input type="checkbox" :checked="el.Loop" @change="e => updateElement(idx, 'Loop', e.target.checked)"></div>
        <div class="field-row check-row"><label>Inverse</label><input type="checkbox" :checked="el.Inverse" @change="e => updateElement(idx, 'Inverse', e.target.checked)"></div>
        <div class="field-row check-row"><label>RealTime</label><input type="checkbox" :checked="el.UseRealTime" @change="e => updateElement(idx, 'UseRealTime', e.target.checked)"></div>

      </div>
    </div>

    <button @click="addElement" class="btn-add">+ Add Element</button>
  </div>
</template>

<style scoped>
.ve-container { display: flex; flex-direction: column; gap: 10px; width: 100%; }

.ve-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 8px;
  position: relative;
}

.ve-header {
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 8px; margin-bottom: 8px;
}
.ve-index { font-weight: bold; color: var(--text-secondary); min-width: 25px; }
.type-select { flex: 1; font-weight: bold; color: var(--accent-color); }

.btn-delete { 
  background: rgba(255,50,50,0.1); 
  color: #ff5555; 
  border: 1px solid #ff5555; 
  border-radius: 4px; 
  cursor: pointer; 
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  line-height: 1;
}
.btn-delete:hover { background: #ff5555; color: white; }

/* GRID LAYOUT */
.ve-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  align-items: center;
}

.field-row { display: flex; align-items: center; gap: 8px; }
.full-row { grid-column: span 2; }

/* VERTICAL FIELD (For Image) */
.vertical-field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.input-line {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.field-row label { width: 60px; font-size: 11px; opacity: 0.7; overflow: hidden; white-space: nowrap; }
.win-input { flex: 1; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: white; border-radius: 3px; font-size: 11px; min-width: 0; }
.win-input:focus { border-color: var(--accent-color); outline: none; }

/* IMAGE PREVIEW LARGE */
.img-preview-box-large {
  width: 100px;
  height: 100px;
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  margin-left: 68px; /* Left margin to align with the input field (skipping 60px label + 8px gap) */
  margin-bottom: 4px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}
.img-preview { max-width: 100%; max-height: 100%; object-fit: contain; }
.img-placeholder { font-size: 10px; color: #666; font-style: italic; }

/* Color */
.color-wrap { flex: 1; display: flex; gap: 4px; align-items: center; }
.color-picker { width: 20px; height: 20px; border: none; padding: 0; background: none; cursor: pointer; }
.small-text { font-family: monospace; letter-spacing: -0.5px; }

/* Vector */
.vector-row { align-items: center; }
.vec-inputs { flex: 1; display: flex; gap: 8px; align-items: center; }
.vec-inputs span { font-size: 10px; font-weight: bold; opacity: 0.5; }

/* Checkboxes */
.check-row { justify-content: flex-start; cursor: pointer; margin-top: 4px; }
.check-row label { cursor: pointer; width: auto; margin-right: 5px; }
.check-row input { cursor: pointer; }

.btn-add {
  padding: 10px;
  background: transparent;
  border: 1px dashed var(--accent-color);
  color: var(--accent-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
}
.btn-add:hover { background: rgba(var(--accent-color), 0.1); }
</style>