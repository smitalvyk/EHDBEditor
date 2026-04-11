<script setup>
import { computed } from 'vue';
import { SelectOptions, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';

const props = defineProps({
  modelValue: { type: Object, default: () => ({ Type: 0, List: [] }) }
});

const emit = defineEmits(['update:modelValue']);
const { getItemsByType } = useGameDatabase();

const factions = computed(() => getItemsByType(ItemType.Faction) || []);

const updateType = (val) => {
  emit('update:modelValue', { ...props.modelValue, Type: Number(val) });
};

const addFaction = (id) => {
  if (!id) return;
  const currentList = props.modelValue.List ? [...props.modelValue.List] : [];
  if (!currentList.includes(id)) {
    currentList.push(id);
    emit('update:modelValue', { ...props.modelValue, List: currentList });
  }
};

const removeFaction = (index) => {
  const currentList = props.modelValue.List ? [...props.modelValue.List] : [];
  currentList.splice(index, 1);
  emit('update:modelValue', { ...props.modelValue, List: currentList });
};

const getFactionName = (id) => {
  const f = factions.value.find(x => x.id === id);
  return f ? f.name : `Unknown #${id}`;
};
</script>

<template>
  <div class="faction-filter-box">
    
    <div class="ff-row">
      <label>Type</label>
      <select :value="modelValue?.Type || 0" @change="e => updateType(e.target.value)" class="win-input type-select">
        <option v-for="(opt, idx) in SelectOptions.FactionFilterType" :key="idx" :value="idx" class="dark-option">
          {{ opt }}
        </option>
      </select>
    </div>

    <div class="ff-list-container">
      <label class="list-label">List</label>
      
      <div class="tags-container">
        <div v-for="(fId, idx) in (modelValue?.List || [])" :key="idx" class="tag-item">
          <span class="tag-text">{{ getFactionName(fId) }}</span>
          <span class="tag-id">#{{ fId }}</span>
          <button @click="removeFaction(idx)" class="tag-remove">×</button>
        </div>
        <div v-if="!modelValue?.List || modelValue.List.length === 0" class="no-tags">No factions selected</div>
      </div>
      
      <div class="tag-add-row">
        <select class="win-input add-select" @change="e => { addFaction(Number(e.target.value)); e.target.value = ''; }">
          <option value="" disabled selected class="dark-option">+ Add Faction...</option>
          <option v-for="f in factions" :key="f.id" :value="f.id" class="dark-option">
            [ID: {{ f.id }}] {{ f.name }}
          </option>
        </select>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.faction-filter-box {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  border-left: 4px solid #55aaff;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box; /* Fix for overflow */
}

.ff-row { display: flex; align-items: center; gap: 10px; }
.ff-row label { width: 60px; font-weight: bold; color: var(--text-secondary); }

.win-input { 
  flex: 1; 
  padding: 6px; 
  background: rgba(0,0,0,0.3); 
  border: 1px solid var(--border-light); 
  color: white; 
  border-radius: 4px; 
  font-size: 12px; 
  box-sizing: border-box; /* Fix for overflow inside flex */
}
.win-input:focus { outline: none; border-color: #55aaff; }

.type-select { font-weight: bold; color: #55aaff; }

/* FIX FOR SELECT OPTIONS DROPDOWN COLORS */
.dark-option {
  background-color: #2b2b2b;
  color: #ffffff;
}

.ff-list-container { display: flex; flex-direction: column; gap: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; }
.list-label { font-weight: bold; color: var(--text-secondary); font-size: 11px; text-transform: uppercase; }

.tags-container { display: flex; flex-wrap: wrap; gap: 6px; background: rgba(0,0,0,0.1); padding: 8px; border-radius: 6px; min-height: 40px; border: 1px solid rgba(255,255,255,0.05); }
.tag-item { display: flex; align-items: center; background: var(--accent-color); color: white; padding: 4px 10px; border-radius: 16px; font-size: 12px; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.1s; }
.tag-item:hover { transform: translateY(-1px); }
.tag-text { font-weight: 500; }
.tag-id { opacity: 0.7; font-size: 10px; font-family: monospace; }
.tag-remove { background: transparent; border: none; color: white; font-weight: bold; cursor: pointer; padding: 0; font-size: 14px; line-height: 1; opacity: 0.7; }
.tag-remove:hover { opacity: 1; }
.no-tags { font-size: 11px; opacity: 0.5; padding: 5px; font-style: italic; }

.tag-add-row select.add-select { border-style: dashed; opacity: 0.8; cursor: pointer; }
.tag-add-row select.add-select:hover { opacity: 1; border-style: solid; background: rgba(0,0,0,0.4); }
</style>