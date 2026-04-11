<script setup>
import { ref, watch } from 'vue';
import { useFileSystem } from '../../composables/useFileSystem';
import { useLocalization } from '../../composables/useLocalization';

// ADDED FOR ANDROID (CAPACITOR)
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const props = defineProps({
  modelValue: { type: [Array, String], default: () => [] }
});
const emit = defineEmits(['update:modelValue']);

const { searchImageFile } = useFileSystem();
const { getTranslations } = useLocalization();
const localSlots = ref([]);
const imagePreviews = ref({});

// UPDATED IMAGE LOADING LOGIC
const updatePreview = async (index, fileName) => {
  if (!fileName) {
    imagePreviews.value[index] = null;
    return;
  }
  
  if (typeof searchImageFile === 'function') {
    const handle = searchImageFile(fileName);
    if (handle) {
      try {
        if (handle.kind === 'native') {
          const result = await Filesystem.getUri({ path: handle.path, directory: Directory.Documents });
          imagePreviews.value[index] = Capacitor.convertFileSrc(result.uri);
          return;
        } else if (handle.getFile) {
          const file = await handle.getFile();
          imagePreviews.value[index] = URL.createObjectURL(file);
          return;
        }
      } catch (e) {
        console.error("Error loading image:", e);
      }
    }
  }
  
  const staticPath = fileName.includes('.') ? fileName : `${fileName}.png`;
  imagePreviews.value[index] = `/sprites/${staticPath}`;
};

// --- PARSING ---
watch(() => props.modelValue, (newVal) => {
  if (Array.isArray(newVal)) {
    localSlots.value = [...newVal];
  } else if (typeof newVal === 'string') {
    try {
      localSlots.value = JSON.parse(newVal);
    } catch (e) {
      localSlots.value = [];
    }
  } else {
    localSlots.value = [];
  }
  
  localSlots.value.forEach((slot, idx) => {
    if (slot && slot.Icon) updatePreview(idx, slot.Icon);
  });
}, { immediate: true, deep: true });

// --- LOGIC ---
const emitUpdate = () => {
  emit('update:modelValue', localSlots.value);
};

const addSlot = () => {
  localSlots.value.push({ Letter: "", Name: "", Icon: "" });
  emitUpdate();
};

const removeSlot = (index) => {
  localSlots.value.splice(index, 1);
  emitUpdate();
};

const updateField = (index, field, value) => {
  localSlots.value[index][field] = value;
  if (field === 'Icon') updatePreview(index, value);
  emitUpdate();
};
</script>

<template>
  <div class="slots-editor">
    
    <div v-if="localSlots.length === 0" class="empty-list">Slot list is empty</div>

    <div class="slots-list">
      <div v-for="(slot, idx) in localSlots" :key="idx" class="slot-card">
        
        <div class="card-header">
          <div class="letter-badge" :title="`Letter: ${slot.Letter}`">{{ slot.Letter || '?' }}</div>
          <button @click="removeSlot(idx)" class="btn-remove" title="Delete slot">×</button>
        </div>

        <div class="card-body">
          
          <div class="field-group">
            <label>Letter</label>
            <input 
              type="text" 
              v-model="slot.Letter" 
              @input="emitUpdate" 
              class="win-input short-input" 
              maxlength="1"
              placeholder="A"
            >
          </div>

          <div class="field-group">
            <label>Name ($Key)</label>
            <input 
              type="text" 
              v-model="slot.Name" 
              @input="emitUpdate" 
              class="win-input"
              placeholder="$GroupWeapon..."
            >
            
            <div v-if="slot.Name && slot.Name.startsWith('$')" class="trans-container">
              <div v-if="getTranslations(slot.Name).length === 0" class="trans-empty">
                No translation
              </div>
              <div v-else v-for="(trans, tIdx) in getTranslations(slot.Name)" :key="tIdx" class="trans-row">
                <span class="trans-file">{{ trans.file }}:</span>
                <span class="trans-text">{{ trans.text }}</span>
              </div>
            </div>

          </div>

          <div class="field-group">
            <label>Icon</label>
            <div class="icon-input-wrapper">
              <input 
                type="text" 
                :value="slot.Icon" 
                @input="e => updateField(idx, 'Icon', e.target.value)" 
                class="win-input"
                placeholder="icon_name"
              >
              <div class="icon-preview">
                <img v-if="imagePreviews[idx]" :src="imagePreviews[idx]" alt="">
                <span v-else class="no-icon">?</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <button @click="addSlot" class="btn-add">+ Add Slot</button>

  </div>
</template>

<style scoped>
.slots-editor {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.empty-list { font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px; font-style: italic; }
.slots-list { display: flex; flex-direction: column; gap: 8px; width: 100%; }

.slot-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  display: flex;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.card-header {
  width: 40px; flex-shrink: 0; background: rgba(0,0,0,0.2); border-right: 1px solid var(--border-light);
  display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 8px 0;
}
.letter-badge { font-weight: bold; font-size: 18px; color: var(--accent-color); text-transform: uppercase; }
.btn-remove { background: none; border: none; color: #ff5555; font-size: 20px; cursor: pointer; opacity: 0.6; line-height: 1; }
.btn-remove:hover { opacity: 1; transform: scale(1.1); }

.card-body { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.field-group { display: flex; flex-direction: column; gap: 3px; width: 100%; }
.field-group label { font-size: 10px; color: var(--text-secondary); font-weight: bold; text-transform: uppercase; }

.win-input {
  background: rgba(0,0,0,0.3); border: 1px solid transparent; color: var(--text-primary);
  padding: 5px 8px; border-radius: 4px; font-size: 12px; width: 100%; box-sizing: border-box;
}
.win-input:focus { border-color: var(--accent-color); outline: none; }
.short-input { width: 100%; text-align: center; font-weight: bold; }

.icon-input-wrapper { display: flex; gap: 8px; align-items: center; width: 100%; }
.icon-preview {
  flex-shrink: 0; width: 28px; height: 28px; background: rgba(0,0,0,0.5); border-radius: 4px; 
  display: flex; justify-content: center; align-items: center; overflow: hidden; border: 1px solid var(--border-light);
}
.icon-preview img { width: 100%; height: 100%; object-fit: contain; }
.no-icon { font-size: 10px; color: var(--text-secondary); }

/* Translation styles */
.trans-container { margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }
.trans-row { font-size: 11px; line-height: 1.2; color: #ccc; }
.trans-file { color: var(--accent-color); font-weight: bold; margin-right: 4px; opacity: 0.8; font-size: 10px; }
.trans-empty { font-size: 11px; color: #666; font-style: italic; }

.btn-add {
  background: transparent; border: 1px dashed var(--accent-color); color: var(--accent-color);
  padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s; text-align: center; width: 100%;
}
.btn-add:hover { background: rgba(var(--accent-color), 0.1); }
</style>