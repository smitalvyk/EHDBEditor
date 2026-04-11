<script setup>
import { computed } from 'vue';
import { SelectOptions, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';
import FactionFilterEditor from './FactionFilterEditor.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({ Type: 0 }) },
  depth: { type: Number, default: 0 }
});

const emit = defineEmits(['update:modelValue', 'delete']);
const { getItemsByType } = useGameDatabase();

const updateField = (key, value) => {
  const base = props.modelValue || { Type: 0 };
  emit('update:modelValue', { ...base, [key]: value });
};

// === DEPTH COLOR MARKERS ===
const depthColors = ['#55FF55', '#FFFF55', '#FFAA00', '#FF5555', '#FF55FF'];
const hierarchyColor = computed(() => depthColors[props.depth % depthColors.length]);

// === FIELD DISPLAY CONDITIONS ===
const typeId = computed(() => props.modelValue?.Type || 0);

const showItemId = computed(() => [25, 30, 31, 35, 40, 45].includes(typeId.value));
const showAmounts = computed(() => [2, 3, 4, 10, 20, 25, 35, 41, 45].includes(typeId.value));
const showRatio = computed(() => [1, 10].includes(typeId.value));
const showFactions = computed(() => [10, 41].includes(typeId.value));
const showItemsList = computed(() => [20, 21, 22].includes(typeId.value));

// === ITEM ID MAPPING ===
const targetItemType = computed(() => {
  switch (typeId.value) {
    case 25: return ItemType.QuestItem || 20;
    case 30: return ItemType.ShipBuild || 8;
    case 31: return ItemType.Ship || 6;
    case 35: return ItemType.Component || 1;
    case 40: return ItemType.Technology || 10;
    case 45: return ItemType.Satellite || 7;
    default: return 0;
  }
});

const availableItems = computed(() => {
  if (!targetItemType.value) return [];
  const items = getItemsByType(targetItemType.value);
  return items || [];
});

const lootTypeOptions = computed(() => SelectOptions.LootType || {});

// === ITEMS LIST MANAGEMENT ===
const addItem = () => {
  const current = Array.isArray(props.modelValue?.Items) ? [...props.modelValue.Items] : [];
  current.push({ Weight: 1, Loot: { Type: 0 } });
  updateField('Items', current);
};

const removeItem = (index) => {
  const current = Array.isArray(props.modelValue?.Items) ? [...props.modelValue.Items] : [];
  current.splice(index, 1);
  updateField('Items', current);
};

const updateItemWeight = (index, val) => {
  const current = Array.isArray(props.modelValue?.Items) ? [...props.modelValue.Items] : [];
  current[index] = { ...current[index], Weight: parseFloat(val) || 0 };
  updateField('Items', current);
};

const updateItemLoot = (index, newLootObj) => {
  const current = Array.isArray(props.modelValue?.Items) ? [...props.modelValue.Items] : [];
  current[index] = { ...current[index], Loot: newLootObj };
  updateField('Items', current);
};
</script>

<template>
  <div class="loot-block" :style="{ borderLeftColor: hierarchyColor }">
    
    <div class="loot-header">
      <div class="type-select-row">
        <label :style="{ color: hierarchyColor }">Loot Type</label>
        <select :value="typeId" @change="e => updateField('Type', Number(e.target.value))" class="win-input type-select">
          <option v-for="(name, id) in lootTypeOptions" :key="id" :value="Number(id)" class="dark-option">
            {{ name }}
          </option>
        </select>
      </div>
      <button v-if="$attrs.onDelete" @click="$emit('delete')" class="btn-delete" title="Remove Node">×</button>
    </div>

    <div class="loot-grid">
      
      <div v-if="showItemId" class="field-row full-row">
        <label>Item</label>
        <select :value="modelValue?.ItemId || 0" @change="e => updateField('ItemId', Number(e.target.value))" class="win-input">
          <option :value="0" class="dark-option">[EMPTY]</option>
          <option v-for="item in availableItems" :key="item.id" :value="item.id" class="dark-option">
            [ID: {{ item.id }}] {{ item.name }}
          </option>
        </select>
      </div>

      <div v-if="showAmounts" class="field-row"><label>MinAmount</label><input type="number" :value="modelValue?.MinAmount || 0" @input="e => updateField('MinAmount', parseInt(e.target.value))" class="win-input"></div>
      <div v-if="showAmounts" class="field-row"><label>MaxAmount</label><input type="number" :value="modelValue?.MaxAmount || 0" @input="e => updateField('MaxAmount', parseInt(e.target.value))" class="win-input"></div>
      
      <div v-if="showRatio" class="field-row"><label>ValueRatio</label><input type="number" :value="modelValue?.ValueRatio || 0" @input="e => updateField('ValueRatio', parseFloat(e.target.value))" class="win-input" step="0.1"></div>

    </div>

    <div v-if="showFactions" class="faction-section">
      <FactionFilterEditor 
        :modelValue="modelValue?.Factions || { Type: 0, List: [] }" 
        @update:modelValue="v => updateField('Factions', v)" 
      />
    </div>

    <div v-if="showItemsList" class="nested-items-section">
      <div class="section-label" :style="{ color: hierarchyColor }">Nested Items</div>
      
      <div class="items-list">
        <div v-for="(item, idx) in (modelValue?.Items || [])" :key="idx" class="loot-item-wrapper">
          
          <div class="loot-item-controls">
             <div class="weight-box">
               <label>Weight:</label>
               <input type="number" :value="item.Weight || 0" @input="e => updateItemWeight(idx, e.target.value)" class="win-input small-input" step="0.1">
             </div>
          </div>

          <div class="loot-item-content">
             <LootEditor 
               :modelValue="item.Loot || { Type: 0 }" 
               @update:modelValue="v => updateItemLoot(idx, v)"
               @delete="removeItem(idx)"
               :depth="depth + 1"
             />
          </div>
          
        </div>
      </div>

      <button @click="addItem" class="btn-add" :style="{ borderColor: hierarchyColor, color: hierarchyColor }">+ Add Nested Loot</button>
    </div>

  </div>
</template>

<style scoped>
.loot-block {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  border-left-width: 4px;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.loot-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;
}
.type-select-row { display: flex; gap: 10px; align-items: center; flex: 1; }
.type-select-row label { font-weight: bold; min-width: 70px; font-size: 12px; }
.type-select { font-weight: bold; }
.dark-option { background: #2b2b2b; color: #ffffff; }

.btn-delete { 
  background: rgba(255, 50, 50, 0.1); color: #ff5555; 
  border: 1px solid #ff5555; width: 24px; height: 24px; 
  border-radius: 4px; cursor: pointer; font-size: 16px; 
  display: flex; align-items: center; justify-content: center;
}
.btn-delete:hover { background: #ff5555; color: white; }

.loot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.field-row { display: flex; align-items: center; gap: 8px; }
.full-row { grid-column: span 2; }
.field-row label { width: 70px; font-size: 11px; opacity: 0.7; }

.win-input { flex: 1; padding: 4px 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 3px; font-size: 11px; }
.win-input:focus { outline: none; border-color: var(--accent-color); }

.faction-section { margin-top: 5px; }

.nested-items-section { margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); }
.section-label { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; }

.items-list { display: flex; flex-direction: column; gap: 12px; }

.loot-item-wrapper {
  display: flex; flex-direction: column; gap: 6px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
  padding: 8px; border-radius: 4px;
}
.loot-item-controls { display: flex; justify-content: flex-start; }
.weight-box { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-light); }
.weight-box label { font-size: 11px; color: var(--accent-color); font-weight: bold; }
.small-input { max-width: 80px; }

.btn-add { margin-top: 10px; width: 100%; padding: 8px; background: transparent; border: 1px dashed; cursor: pointer; font-weight: bold; border-radius: 4px; transition: 0.2s; }
.btn-add:hover { background: rgba(255,255,255,0.05); }
</style>