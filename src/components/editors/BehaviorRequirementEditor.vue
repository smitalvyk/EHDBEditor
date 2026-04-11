<script setup>
import { computed } from 'vue';
import { SelectOptions, BehaviorRequirementTypeMap } from '../../data/enums';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue', 'delete']);

const updateField = (key, value) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

// === TYPE DEFINITION ===
// Get type name by ID from Map
const typeName = computed(() => {
  const id = props.modelValue.Type;
  return BehaviorRequirementTypeMap[id] || String(id);
});

// Helper to check type by name
const isType = (names) => {
  const arr = Array.isArray(names) ? names : [names];
  return arr.includes(typeName.value);
};

// === FIELD DISPLAY CONDITIONS ===
const showDeviceClass = computed(() => isType('HasDevice'));
const showDifficulty = computed(() => isType(['AiLevel', 'MinAiLevel']));
const showSizeClass = computed(() => isType('SizeClass'));
const showValue = computed(() => isType(['HasHighManeuverability', 'HasKineticResistance', 'HasHighRammingDamage', 'HasLongRangeWeapon']));
const showRequirementsList = computed(() => isType(['Any', 'All', 'None']));

// Value field label changes depending on type
const getValueLabel = () => {
  if (isType('HasLongRangeWeapon')) return 'Range';
  return 'Value';
};

// === NESTED REQUIREMENTS MANAGEMENT ===
const addRequirement = () => {
  const current = props.modelValue.Requirements ? [...props.modelValue.Requirements] : [];
  // ID 10 = HasDevice (default for new requirement)
  current.push({ Type: 10 }); 
  updateField('Requirements', current);
};

const removeRequirement = (index) => {
  const current = [...props.modelValue.Requirements];
  current.splice(index, 1);
  updateField('Requirements', current);
};

const updateRequirement = (index, newVal) => {
  const current = [...props.modelValue.Requirements];
  current[index] = newVal;
  updateField('Requirements', current);
};
</script>

<template>
  <div class="req-block">
    <div class="req-header">
      <div class="type-select-row">
        <label>Req Type</label>
        <select :value="modelValue.Type" @change="e => updateField('Type', Number(e.target.value))" class="win-input small-select">
          <option v-for="item in SelectOptions.BehaviorRequirementTypeList" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
          <option v-if="!BehaviorRequirementTypeMap[modelValue.Type]" :value="modelValue.Type">
            Unknown ({{ modelValue.Type }})
          </option>
        </select>
      </div>
      <button @click="$emit('delete')" class="btn-delete-req">×</button>
    </div>

    <div class="req-body">
      
      <div v-if="showDeviceClass" class="req-row">
        <label>Device</label>
        <select :value="modelValue.DeviceClass" @change="e => updateField('DeviceClass', e.target.value)" class="win-input">
          <option v-for="opt in SelectOptions.DeviceClass" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>

      <div v-if="showDifficulty" class="req-row">
        <label>Difficulty</label>
        <select :value="modelValue.DifficultyLevel" @change="e => updateField('DifficultyLevel', Number(e.target.value))" class="win-input">
          <option v-for="(name, id) in SelectOptions.AiDifficultyLevel" :key="id" :value="Number(id)">{{ name }}</option>
        </select>
      </div>

      <div v-if="showSizeClass" class="req-row">
        <label>Size</label>
        <select :value="modelValue.SizeClass" @change="e => updateField('SizeClass', Number(e.target.value))" class="win-input">
          <option v-for="(opt, idx) in SelectOptions.SizeClass" :key="idx" :value="idx">{{ opt }}</option>
        </select>
      </div>

      <div v-if="showValue" class="req-row">
        <label>{{ getValueLabel() }}</label>
        <input type="number" :value="modelValue.Value" @input="e => updateField('Value', parseFloat(e.target.value))" class="win-input" step="0.1">
      </div>

      <div v-if="showRequirementsList" class="nested-reqs">
        <div class="nested-header">Nested Requirements:</div>
        <div class="req-list">
          <BehaviorRequirementEditor 
            v-for="(req, idx) in modelValue.Requirements" 
            :key="idx"
            :modelValue="req"
            @update:modelValue="v => updateRequirement(idx, v)"
            @delete="removeRequirement(idx)"
          />
        </div>
        <button @click="addRequirement" class="btn-add-req">+ Add Req</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.req-block {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px;
  margin-bottom: 6px;
}
.req-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.type-select-row { display: flex; align-items: center; gap: 8px; flex: 1; }
.type-select-row label { font-size: 10px; color: var(--accent-color); font-weight: bold; white-space: nowrap; }
.small-select { padding: 2px 4px; font-size: 11px; height: 24px; min-width: 120px; }

.btn-delete-req { background: none; border: none; color: #ff5555; font-weight: bold; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 4px; }

.req-body { display: flex; flex-direction: column; gap: 4px; padding-left: 4px; }
.req-row { display: flex; align-items: center; gap: 6px; }
.req-row label { width: 60px; font-size: 10px; opacity: 0.7; }
.win-input { flex: 1; padding: 2px 4px; font-size: 11px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: white; border-radius: 3px; }

/* NESTED */
.nested-reqs { margin-top: 4px; padding-left: 8px; border-left: 1px dashed rgba(255,255,255,0.2); }
.nested-header { font-size: 10px; opacity: 0.5; margin-bottom: 4px; }
.req-list { display: flex; flex-direction: column; gap: 4px; }
.btn-add-req { width: 100%; font-size: 10px; padding: 4px; background: rgba(255,255,255,0.05); border: 1px dashed #555; color: #aaa; cursor: pointer; margin-top: 4px; }
.btn-add-req:hover { background: rgba(255,255,255,0.1); color: white; }
</style>