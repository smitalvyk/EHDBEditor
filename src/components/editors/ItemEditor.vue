<script setup>
import { computed } from 'vue';
import { schemas, defaultSchema, FieldTypes } from '../../data/itemSchemas';

const props = defineProps({
  modelValue: Object, // This is our JSON object (v-model)
});

const emit = defineEmits(['update:modelValue']);

// Get type ID from data
const itemType = computed(() => props.modelValue?.ItemType);

// Find schema for this type
const currentSchema = computed(() => {
  return schemas[itemType.value] || defaultSchema;
});

// Calculate which fields already exist and which can be added
const existingKeys = computed(() => Object.keys(props.modelValue));

const missingFields = computed(() => {
  const allowedKeys = Object.keys(currentSchema.value.fields);
  return allowedKeys.filter(key => !existingKeys.value.includes(key));
});

// Function to add a field
const addField = (key) => {
  const fieldConfig = currentSchema.value.fields[key];
  const defaultValue = fieldConfig.default !== undefined ? fieldConfig.default : '';
  
  // Update object (create a new one so Vue detects changes)
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: defaultValue
  });
};

// Function to remove a field (optional)
const removeField = (key) => {
  const copy = { ...props.modelValue };
  delete copy[key];
  emit('update:modelValue', copy);
};
</script>

<template>
  <div class="editor-container">
    <div class="editor-header">
      <h3>{{ currentSchema.name }} <span class="badge">Type {{ itemType }}</span></h3>
    </div>

    <div class="fields-grid">
      <div v-for="(val, key) in modelValue" :key="key" class="field-group">
        
        <label>
          {{ currentSchema.fields[key]?.label || key }}
          <span class="key-name">({{ key }})</span>
        </label>
        
        <input 
          v-if="typeof val === 'number'" 
          type="number" 
          v-model.number="modelValue[key]" 
          class="input-win"
        >
        <input 
          v-else-if="typeof val === 'boolean'" 
          type="checkbox" 
          v-model="modelValue[key]" 
          class="checkbox-win"
        >
        <input 
          v-else 
          type="text" 
          v-model="modelValue[key]" 
          class="input-win"
        >

        <button 
          v-if="!currentSchema.fields[key]?.required && key !== 'ItemType'" 
          @click="removeField(key)" 
          class="btn-del" 
          title="Delete field"
        >✕</button>
      </div>
    </div>

    <div v-if="missingFields.length > 0" class="missing-panel">
      <h4>➕ Available to add:</h4>
      <div class="chips-wrapper">
        <button 
          v-for="key in missingFields" 
          :key="key" 
          @click="addField(key)"
          class="chip-add"
        >
          {{ currentSchema.fields[key].label }}
        </button>
      </div>
    </div>
    
    <div v-else class="all-good">
      ✅ All possible fields added
    </div>

  </div>
</template>

<style scoped>
.editor-container { padding: 10px; }
.badge { background: var(--accent-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.field-group {
  background: var(--sidebar-bg);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  position: relative;
}

.field-group label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  display: flex; justify-content: space-between;
}
.key-name { opacity: 0.5; }

.input-win {
  background: var(--app-bg);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  padding: 6px;
  border-radius: 4px;
  width: 100%;
}
.input-win:focus { outline: 2px solid var(--accent-color); border-color: transparent; }

.btn-del {
  position: absolute; top: 5px; right: 5px;
  background: transparent; border: none; color: #ff5555; cursor: pointer; opacity: 0.5;
}
.btn-del:hover { opacity: 1; }

.missing-panel {
  border-top: 1px solid var(--border-light);
  padding-top: 15px;
  background: rgba(255, 200, 0, 0.05); /* Light yellow background */
  padding: 15px;
  border-radius: 8px;
}

.chips-wrapper { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

.chip-add {
  background: transparent;
  border: 1px dashed var(--accent-color);
  color: var(--accent-color);
  padding: 5px 10px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.chip-add:hover { background: var(--accent-color); color: white; }

.all-good { text-align: center; color: var(--text-secondary); opacity: 0.5; margin-top: 20px; font-size: 13px; }
</style>