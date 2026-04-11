<script>
export default { name: 'RequirementEditor' }
</script>

<script setup>
import { computed } from 'vue';
import { SelectOptions, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';
import LootEditor from './LootEditor.vue';

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

const typeId = computed(() => props.modelValue?.Type || 0);
const colors = ['#55FF55', '#FFFF55', '#FFAA00', '#FF5555'];
const cColor = computed(() => colors[props.depth % colors.length]);

const showItemId = computed(() => [27, 25, 9, 10].includes(typeId.value));
const targetItemType = computed(() => {
  if (typeId.value === 27) return ItemType.Loot;
  if (typeId.value === 25) return ItemType.QuestItem;
  if ([9, 10].includes(typeId.value)) return ItemType.Quest;
  return 0;
});

const showMinMax = computed(() => [6, 7, 18, 15, 16, 40, 41].includes(typeId.value));
const showAmount = computed(() => typeId.value === 25);
const showBool = computed(() => [6, 7, 30].includes(typeId.value));
const showCharacter = computed(() => typeId.value === 15);
const showFaction = computed(() => typeId.value === 20);
const showLoot = computed(() => typeId.value === 26);
const showReqList = computed(() => [2, 1, 3].includes(typeId.value));

// === DYNAMIC FIELD NAMES FROM XML ALIAS ===
const minLabel = computed(() => [40, 41].includes(typeId.value) ? 'Minutes' : 'Min');
const maxLabel = computed(() => [40, 41].includes(typeId.value) ? 'Hours' : 'Max');

const addReq = () => {
  const arr = Array.isArray(props.modelValue?.Requirements) ? [...props.modelValue.Requirements] : [];
  arr.push({ Type: 0 });
  updateField('Requirements', arr);
};
const removeReq = (idx) => {
  const arr = [...props.modelValue.Requirements];
  arr.splice(idx, 1);
  updateField('Requirements', arr);
};
const updateReq = (idx, val) => {
  const arr = [...props.modelValue.Requirements];
  arr[idx] = val;
  updateField('Requirements', arr);
};
</script>

<template>
  <div class="req-box" :style="{ borderLeftColor: cColor }">
    <div class="req-header">
      <div class="type-row">
        <label>Type</label>
        <select :value="typeId" @change="e => updateField('Type', Number(e.target.value))" class="win-input type-select full-width-input">
          <option v-for="opt in SelectOptions.RequirementTypeList" :key="opt.id" :value="opt.id" class="dark-opt">{{ opt.name }}</option>
        </select>
      </div>
      <button v-if="$attrs.onDelete" @click="$emit('delete')" class="btn-del">×</button>
    </div>

    <div class="req-grid">
      <div v-if="showItemId" class="field-row full-row">
        <label>Item / Quest</label>
        <select :value="modelValue?.ItemId || 0" @change="e => updateField('ItemId', Number(e.target.value))" class="win-input full-width-input">
          <option :value="0" class="dark-opt">[NONE]</option>
          <option v-for="it in getItemsByType(targetItemType)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name}}</option>
        </select>
      </div>

      <div v-if="showMinMax" class="field-row"><label>{{ minLabel }}</label><input type="number" :value="modelValue?.MinValue||0" @input="e=>updateField('MinValue', parseInt(e.target.value))" class="win-input full-width-input"></div>
      <div v-if="showMinMax" class="field-row"><label>{{ maxLabel }}</label><input type="number" :value="modelValue?.MaxValue||0" @input="e=>updateField('MaxValue', parseInt(e.target.value))" class="win-input full-width-input"></div>
      
      <div v-if="showAmount" class="field-row"><label>Amount</label><input type="number" :value="modelValue?.MinValue||1" @input="e=>updateField('MinValue', parseInt(e.target.value))" class="win-input full-width-input"></div>
      
      <div v-if="showBool" class="field-row check-row full-row"><label class="wide-label">Allow Unsafe Stars</label><input type="checkbox" :checked="modelValue?.BoolValue" @change="e=>updateField('BoolValue', e.target.checked)"></div>

      <div v-if="showCharacter" class="field-row full-row">
        <label>Character</label>
        <select :value="modelValue?.Character || 0" @change="e=>updateField('Character', Number(e.target.value))" class="win-input full-width-input">
           <option :value="0" class="dark-opt">[NONE]</option>
           <option v-for="it in getItemsByType(ItemType.Character)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name}}</option>
        </select>
      </div>

      <div v-if="showFaction" class="field-row full-row">
        <label>Faction</label>
        <select :value="modelValue?.Faction || 0" @change="e=>updateField('Faction', Number(e.target.value))" class="win-input full-width-input">
           <option :value="0" class="dark-opt">[NONE]</option>
           <option v-for="it in getItemsByType(ItemType.Faction)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name}}</option>
        </select>
      </div>
    </div>

    <div v-if="showLoot" class="loot-subbox">
      <label class="sub-label">Loot Content</label>
      <LootEditor :modelValue="modelValue?.Loot || {Type:0}" @update:modelValue="v=>updateField('Loot', v)" />
    </div>

    <div v-if="showReqList" class="req-list">
      <div class="sub-label">Nested Requirements</div>
      <RequirementEditor 
        v-for="(r, idx) in (modelValue?.Requirements || [])" :key="idx"
        :modelValue="r" :depth="depth+1"
        @update:modelValue="v => updateReq(idx, v)" @delete="removeReq(idx)"
      />
      <button @click="addReq" class="btn-add">+ Add Nested Requirement</button>
    </div>
  </div>
</template>

<style scoped>
.req-box { background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); border-left-width: 4px; padding: 10px; border-radius: 4px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; width: 100%; box-sizing: border-box; align-self: stretch; }
.req-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 5px; width: 100%; box-sizing: border-box;}
.type-row { display: flex; gap: 10px; align-items: center; flex: 1; width: 100%; }
.type-row label { font-weight: bold; font-size: 11px; opacity: 0.8; width: 75px; }
.type-select { font-weight: bold; color: var(--accent-color); flex: 1; width: 100%; }
.dark-opt { background: #2b2b2b; color: #fff; }
.btn-del { background: rgba(255,50,50,0.1); color: #ff5555; border: 1px solid #ff5555; width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; }

.req-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; box-sizing: border-box; }
.field-row { display: flex; align-items: center; gap: 6px; width: 100%; flex: 1; }
.full-row { grid-column: span 2; }
.field-row label { width: 75px; font-size: 10px; opacity: 0.7; }
.field-row label.wide-label { width: auto; margin-right: 10px; font-weight: bold; color: var(--accent-color); }
.win-input { flex: 1; width: 100%; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 3px; font-size: 11px; box-sizing: border-box; }
.full-width-input { width: 100%; box-sizing: border-box; }
.win-input:focus { border-color: var(--accent-color); outline: none; }

.check-row { background: rgba(0,0,0,0.2); padding: 6px; border-radius: 4px; border: 1px solid var(--border-light); justify-content: flex-start; }
.check-row input { margin: 0; width: 16px; height: 16px; cursor: pointer; }

.loot-subbox { margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px; width: 100%; box-sizing: border-box;}
.sub-label { font-size: 10px; text-transform: uppercase; font-weight: bold; opacity: 0.6; margin-bottom: 6px; display: block; }

.req-list { margin-top: 8px; padding-left: 10px; border-left: 1px dashed rgba(255,255,255,0.2); width: 100%; box-sizing: border-box;}
.btn-add { width: 100%; padding: 6px; background: transparent; border: 1px dashed var(--border-light); color: var(--text-secondary); cursor: pointer; border-radius: 4px; margin-top: 5px; }
.btn-add:hover { border-color: var(--accent-color); color: var(--accent-color); background: rgba(255,255,255,0.05); }
</style>