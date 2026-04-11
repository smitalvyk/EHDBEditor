<script setup>
import { ref, watch, computed } from 'vue';
import { useGameDatabase } from '../../composables/useGameDatabase';
import { SelectOptions } from '../../data/enums';

const props = defineProps({
  modelValue: { type: [Object, String], default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);
const { getItemsByType } = useGameDatabase();

// Internal object state
const localValue = ref({
  ShipSizes: [],
  NotForOrganicShips: false,
  NotForMechanicShips: false,
  ComponentGroupTag: 0,
  MaxComponentAmount: 0
});

// Size mapping (Enum -> Value)
// In XML: Frigate=0, Destroyer=1 etc. Undefined=-1
const shipSizeOptions = [
  { label: "Frigate", value: 0 },
  { label: "Destroyer", value: 1 },
  { label: "Cruiser", value: 2 },
  { label: "Battleship", value: 3 },
  { label: "Titan", value: 4 },
  { label: "Starbase", value: 5 },
  { label: "Undefined", value: -1 }
];

// Input data parsing
const parseValue = (val) => {
  if (!val) return;
  
  let parsed = val;
  // If a string (JSON) arrives, parse it
  if (typeof val === 'string') {
    try {
      parsed = JSON.parse(val);
    } catch (e) {
      console.warn("Error parsing Restrictions JSON", e);
      return;
    }
  }

  // Update local state, preserving defaults
  localValue.value = {
    ShipSizes: Array.isArray(parsed.ShipSizes) ? [...parsed.ShipSizes] : [],
    NotForOrganicShips: !!parsed.NotForOrganicShips,
    NotForMechanicShips: !!parsed.NotForMechanicShips,
    ComponentGroupTag: Number(parsed.ComponentGroupTag) || 0,
    MaxComponentAmount: Number(parsed.MaxComponentAmount) || 0
  };
};

// Initialization
watch(() => props.modelValue, (newVal) => parseValue(newVal), { immediate: true });

// Send changes up
const emitUpdate = () => {
  // Send as an object. UniversalEditor will decide whether to save as an object or stringify for JSON
  emit('update:modelValue', { ...localValue.value });
};

// --- LOGIC ---

const addSize = () => {
  // Add the first available size (e.g., 0 - Frigate) if it's missing
  if (!localValue.value.ShipSizes.includes(0)) {
    localValue.value.ShipSizes.push(0);
  } else {
    localValue.value.ShipSizes.push(0); // Just push, the user will change it themselves
  }
  emitUpdate();
};

const removeSize = (index) => {
  localValue.value.ShipSizes.splice(index, 1);
  emitUpdate();
};

const updateSize = (index, value) => {
  localValue.value.ShipSizes[index] = Number(value);
  emitUpdate();
};

const toggleBool = (field) => {
  localValue.value[field] = !localValue.value[field];
  emitUpdate();
};

const updateField = (field, value) => {
  localValue.value[field] = Number(value);
  emitUpdate();
};

// Get list of tags (ID 35)
const groupTags = computed(() => getItemsByType(35)); // 35 - ComponentGroupTag

</script>

<template>
  <div class="restrictions-editor">
    
    <div class="block-section">
      <div class="section-title">Ship Sizes (ShipSizes)</div>
      <div v-if="localValue.ShipSizes.length === 0" class="empty-list">No restrictions (available to all)</div>
      
      <div class="sizes-list">
        <div v-for="(sizeVal, idx) in localValue.ShipSizes" :key="idx" class="size-row">
          <select 
            :value="sizeVal" 
            @change="e => updateSize(idx, e.target.value)"
            class="win-input size-select"
          >
            <option v-for="opt in shipSizeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }} ({{ opt.value }})
            </option>
          </select>
          <button @click="removeSize(idx)" class="btn-remove">×</button>
        </div>
      </div>
      
      <button @click="addSize" class="btn-add">+ Add Size</button>
    </div>

    <div class="divider"></div>

    <div class="flags-section">
      <label class="checkbox-row">
        <input type="checkbox" :checked="localValue.NotForOrganicShips" @change="toggleBool('NotForOrganicShips')">
        <span class="cb-label">Prohibited for Organics (NotForOrganicShips)</span>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" :checked="localValue.NotForMechanicShips" @change="toggleBool('NotForMechanicShips')">
        <span class="cb-label">Prohibited for Mechanics (NotForMechanicShips)</span>
      </label>
    </div>

    <div class="divider"></div>

    <div class="field-row">
      <label>Group (GroupTag):</label>
      <select 
        :value="localValue.ComponentGroupTag" 
        @change="e => updateField('ComponentGroupTag', e.target.value)"
        class="win-input"
      >
        <option :value="0">[ EMPTY ]</option>
        <option v-for="tag in groupTags" :key="tag.id" :value="tag.id">
          {{ tag.name || 'Unnamed Tag' }} (ID: {{ tag.id }})
        </option>
      </select>
    </div>

    <div class="field-row">
      <label>Max Quantity (MaxAmount):</label>
      <input 
        type="number" 
        :value="localValue.MaxComponentAmount" 
        @input="e => updateField('MaxComponentAmount', e.target.value)"
        class="win-input"
      >
    </div>

  </div>
</template>

<style scoped>
.restrictions-editor {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.sizes-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.size-row {
  display: flex;
  gap: 8px;
}

.size-select {
  flex: 1;
}

.btn-remove {
  background: rgba(255, 50, 50, 0.1);
  color: #ff5555;
  border: 1px solid rgba(255, 50, 50, 0.3);
  border-radius: 4px;
  width: 30px;
  cursor: pointer;
}
.btn-remove:hover { background: #ff5555; color: white; }

.btn-add {
  background: transparent;
  border: 1px dashed var(--accent-color);
  color: var(--accent-color);
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.btn-add:hover { background: rgba(var(--accent-color), 0.1); }

.empty-list {
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
  padding: 4px 0;
}

.divider {
  height: 1px;
  background: var(--border-light);
  opacity: 0.5;
}

.flags-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.cb-label { font-size: 13px; }

.field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-row label {
  font-size: 11px;
  font-weight: bold;
  opacity: 0.7;
}

.win-input {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid transparent;
  color: var(--text-primary);
  padding: 6px 8px;
  border-radius: 4px;
  font-family: inherit;
}
.win-input:focus {
  border-color: var(--accent-color);
  outline: none;
}
</style>