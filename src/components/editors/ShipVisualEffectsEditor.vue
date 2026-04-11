<script setup>
import { SelectOptions, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';

const props = defineProps({ modelValue: { type: Object, default: () => ({}) } });
const emit = defineEmits(['update:modelValue']);
const { getItemsByType } = useGameDatabase();

const updateField = (key, val) => {
  emit('update:modelValue', { ...props.modelValue, [key]: val });
};
</script>

<template>
  <div class="effects-wrapper">
    <div class="effects-grid">
      
      <div class="field-box">
        <label>Leave Wreck</label>
        <select :value="modelValue.LeaveWreck || 0" @change="e => updateField('LeaveWreck', Number(e.target.value))" class="win-input">
          <option v-for="(opt, idx) in SelectOptions.ToggleState" :key="idx" :value="idx" class="dark-opt">{{ opt }}</option>
        </select>
      </div>

      <div class="field-box">
        <label>Custom Explosion Effect</label>
        <select :value="modelValue.CustomExplosionEffect || 0" @change="e => updateField('CustomExplosionEffect', Number(e.target.value))" class="win-input">
          <option :value="0" class="dark-opt">[NONE]</option>
          <option v-for="item in getItemsByType(26)" :key="item.id" :value="item.id" class="dark-opt">
            [ID: {{ item.id }}] {{ item.name || 'Visual Effect' }}
          </option>
        </select>
      </div>

      <div class="field-box">
        <label>Custom Explosion Sound</label>
        <input type="text" :value="modelValue.CustomExplosionSound || ''" @input="e => updateField('CustomExplosionSound', e.target.value)" class="win-input" placeholder="Audio file name">
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.effects-wrapper { background: rgba(0,0,0,0.15); border: 1px solid var(--border-light); padding: 12px; border-radius: 6px; }
.effects-grid { display: flex; flex-direction: column; gap: 10px; }
.field-box { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); padding: 8px 12px; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; }
.field-box label { font-size: 11px; font-weight: bold; color: var(--text-secondary); width: 180px; text-transform: uppercase; white-space: nowrap; }
.win-input { flex: 1; padding: 6px 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 11px; }
.win-input:focus { border-color: var(--accent-color); outline: none; }
.dark-opt { background: #2b2b2b; color: #fff; }
</style>