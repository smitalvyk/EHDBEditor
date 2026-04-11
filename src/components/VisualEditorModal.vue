<script setup>
import { ref, watch, computed } from 'vue';
import UniversalEditor from './editors/UniversalEditor.vue';
import { useEditorNotes } from '../composables/useEditorNotes'; 
import { itemSchemas, defaultSchema } from '../data/itemSchemas';

const props = defineProps({
  isOpen: Boolean,
  content: String, 
  fileName: String,
  showEditorNotes: { type: Boolean, default: true },
  sortJsonOnSave: { type: Boolean, default: true }
});

const emit = defineEmits(['close', 'save']);

const { getNote, saveNote } = useEditorNotes(); 
const localNote = ref(''); 
const originalId = ref(null); 

const localData = ref({});
const parseError = ref(null);

const currentItemType = computed(() => {
  if (!localData.value || !localData.value.ItemType) return 0;
  return Number(localData.value.ItemType);
});

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.content) {
    try {
      const parsed = JSON.parse(props.content);
      localData.value = parsed;
      
      localNote.value = getNote(parsed.ItemType, parsed.Id); 
      originalId.value = parsed.Id; 

    } catch (e) {
      localData.value = {};
      localNote.value = ''; 
      originalId.value = null; 
    }
  }
});

const handleSave = () => {
  saveNote(localData.value.ItemType, localData.value.Id, localNote.value);
  
  let dataToSave = localData.value;

  if (props.sortJsonOnSave) {
    const itemType = localData.value.ItemType;
    const schema = itemSchemas[itemType] || defaultSchema;
    
    if (schema && schema.fields) {
      const sortedData = {};
      
      if (localData.value.ItemType !== undefined) {
        sortedData.ItemType = localData.value.ItemType;
      }
      if (localData.value.Id !== undefined) {
        sortedData.Id = localData.value.Id;
      }
      
      for (const key of Object.keys(schema.fields)) {
        if (localData.value[key] !== undefined && sortedData[key] === undefined) {
          sortedData[key] = localData.value[key];
        }
      }
      
      for (const key of Object.keys(localData.value)) {
        if (sortedData[key] === undefined) {
          sortedData[key] = localData.value[key];
        }
      }
      
      dataToSave = sortedData;
    }
  }

  const jsonString = JSON.stringify(dataToSave, null, 2);
  emit('save', jsonString);
};
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="modal-backdrop">
      <div class="modal-window visual-mode">
        
        <header class="modal-header">
          <div class="modal-title">🔧 Setup: {{ fileName }}</div>
          <div class="modal-actions">
            <button @click="handleSave" class="btn-save">Save JSON</button>
            <button @click="$emit('close')" class="btn-close">Close</button>
          </div>
        </header>

        <div class="modal-body">
          <div v-if="parseError" class="error-msg">{{ parseError }}</div>
          
          <div v-else class="editor-scroll">
            <UniversalEditor 
              v-model="localData" 
              :itemType="localData.ItemType"
              :editorNote="localNote" 
              :showEditorNotes="showEditorNotes" 
              :originalId="originalId" 
              @update:editorNote="localNote = $event"
            />
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>
<style scoped>
/* Modal window styles */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
}

.modal-window {
  width: 96vw; 
  height: 96vh; 
  background: var(--app-bg); border-radius: 12px;
  display: flex; flex-direction: column; border: 1px solid var(--border-light);
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
}

.modal-header {
  min-height: 60px; padding: 10px 20px; border-bottom: 1px solid var(--border-light);
  background: var(--sidebar-bg); display: flex; justify-content: space-between; align-items: center;
  gap: 15px; flex-wrap: wrap;
}

.modal-title {
  font-weight: bold; font-size: 16px; color: var(--accent-color);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1 1 auto; 
}

.modal-actions {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}

.modal-body { 
  flex: 1; 
  overflow-y: auto; 
  padding: 0; 
  background: var(--app-bg); 
}

.error-msg { color: #ff5555; text-align: center; margin-top: 40px; font-size: 18px; }

/* Buttons */
.btn-save { 
  background: var(--accent-color); color: white; border: none; 
  padding: 8px 16px; border-radius: 4px; cursor: pointer; 
  display: flex; align-items: center; justify-content: center; 
  font-weight: bold; white-space: nowrap; transition: 0.2s;
}
.btn-save:hover { filter: brightness(1.1); }

.btn-close { 
  background: transparent; color: var(--text-primary); border: 1px solid var(--border-light); 
  padding: 8px 16px; border-radius: 4px; cursor: pointer; 
  display: flex; align-items: center; justify-content: center; 
  font-weight: bold; white-space: nowrap; transition: 0.2s;
}
.btn-close:hover { background: rgba(255, 255, 255, 0.1); }

/* Animations */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-window { transition: transform 0.2s ease; }
.modal-enter-from .modal-window { transform: scale(0.95); }

/* Mobile adaptation */
@media (max-width: 600px) {
  .modal-header {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 15px;
    gap: 10px;
  }
  .modal-title {
    text-align: center;
    flex: 0 0 auto; 
    width: 100%;
  }
  .modal-actions {
    width: 100%;
  }
  .btn-save, .btn-close {
    flex: 1; 
    padding: 10px; 
  }
}
</style>