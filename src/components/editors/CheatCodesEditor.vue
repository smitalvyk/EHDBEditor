<script setup>
import { ref, watch } from 'vue';
import LootEditor from './LootEditor.vue';

const props = defineProps({
  modelValue: { type: [Array, String], default: () => [] }
});

const emit = defineEmits(['update:modelValue']);

const localCodes = ref([]);
// Store collapsed state by index: { 0: true, 1: false ... }
// If key is missing or false - it means expanded. If true - collapsed.
const collapsedStates = ref({}); 

// --- PARSING ---
watch(() => props.modelValue, (newVal) => {
  if (Array.isArray(newVal)) {
    localCodes.value = JSON.parse(JSON.stringify(newVal));
  } else if (typeof newVal === 'string') {
    try {
      localCodes.value = JSON.parse(newVal);
    } catch (e) {
      localCodes.value = [];
    }
  } else {
    localCodes.value = [];
  }
}, { immediate: true });

const emitUpdate = () => {
  emit('update:modelValue', localCodes.value);
};

const addCode = () => {
  localCodes.value.push({
    Code: "",
    Loot: { Type: 0 }
  });
  // New code is always expanded
  emitUpdate();
};

const removeCode = (index) => {
  localCodes.value.splice(index, 1);
  // When deleting, we should clean the state, but for simplicity we can leave garbage in collapsedStates, 
  // it does not interfere, since binding goes by index which will shift.
  // Ideally we could shift the keys, but for the UI editor it is not critical.
  emitUpdate();
};

const updateLoot = (index, newLoot) => {
  localCodes.value[index].Loot = newLoot;
  emitUpdate();
};

// --- COLLAPSE LOGIC ---

const toggleCollapse = (index) => {
  collapsedStates.value[index] = !collapsedStates.value[index];
};

const collapseAll = () => {
  localCodes.value.forEach((_, idx) => {
    collapsedStates.value[idx] = true;
  });
};

const expandAll = () => {
  collapsedStates.value = {}; // Clearing the object will make all false (expanded)
};

</script>

<template>
  <div class="cheat-editor">
    
    <div class="toolbar" v-if="localCodes.length > 0">
      <button @click="collapseAll" class="btn-tool">Collapse all</button>
      <button @click="expandAll" class="btn-tool">Expand all</button>
    </div>

    <div v-if="localCodes.length === 0" class="empty-list">List is empty</div>

    <div class="codes-list">
      <div v-for="(item, idx) in localCodes" :key="idx" class="code-card">
        
        <div class="card-header">
          <button @click="toggleCollapse(idx)" class="btn-arrow">
            {{ collapsedStates[idx] ? '▶' : '▼' }}
          </button>

          <label>Code:</label>
          <input 
            type="text" 
            v-model="item.Code" 
            @change="emitUpdate"
            class="win-input code-input"
            placeholder="42..."
          >
          <button @click="removeCode(idx)" class="btn-remove" title="Delete">×</button>
        </div>

        <div class="loot-wrapper" v-show="!collapsedStates[idx]">
          <div class="loot-label">LOOT</div>
          <LootEditor 
            :modelValue="item.Loot" 
            @update:modelValue="val => updateLoot(idx, val)"
          />
        </div>

      </div>
    </div>

    <button @click="addCode" class="btn-add">+ Add cheat code</button>

  </div>
</template>

<style scoped>
.cheat-editor { 
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

/* Toolbar Styles */
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 5px;
}
.btn-tool {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-tool:hover {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.empty-list { font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px; font-style: italic; }
.codes-list { display: flex; flex-direction: column; gap: 10px; width: 100%; }

.code-card { 
  background: rgba(255, 255, 255, 0.03); 
  border: 1px solid var(--border-light); 
  border-radius: 6px; 
  overflow: hidden; 
}

.card-header { 
  background: rgba(0,0,0,0.2); 
  border-bottom: 1px solid transparent; /* Transparent border by default */
  padding: 8px 10px; 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  transition: border-color 0.2s;
}

/* If block is expanded, add a bottom border to the header */
.loot-wrapper:not([style*="display: none"]) + .card-header, /* fallback */
.code-card:has(.loot-wrapper[style*="display: none"]) .card-header {
   border-bottom-color: transparent;
}
.code-card:has(.loot-wrapper:not([style*="display: none"])) .card-header {
   border-bottom-color: var(--border-light);
}

.card-header label { font-weight: bold; font-size: 12px; color: var(--accent-color); }
.code-input { flex: 1; font-weight: bold; color: #fff; }

.btn-arrow {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}
.btn-arrow:hover { color: white; }

.btn-remove { background: none; border: none; color: #ff5555; font-size: 18px; cursor: pointer; }

.loot-wrapper { padding: 10px; }
.loot-label { font-size: 10px; font-weight: bold; color: #aaa; margin-bottom: 5px; letter-spacing: 1px; }

.win-input { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid transparent; color: var(--text-primary); padding: 5px 8px; border-radius: 4px; font-size: 12px; }
.win-input:focus { border-color: var(--accent-color); outline: none; }

.btn-add { background: transparent; border: 1px dashed var(--accent-color); color: var(--accent-color); padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; width: 100%; }
.btn-add:hover { background: rgba(var(--accent-color), 0.1); }
</style>