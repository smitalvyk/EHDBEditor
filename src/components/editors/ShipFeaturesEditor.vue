<script setup>
import { ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';

const props = defineProps({ modelValue: { type: Object, default: () => ({}) } });
const emit = defineEmits(['update:modelValue']);
const { getItemsByType } = useGameDatabase();

const updateField = (key, val) => {
  const num = parseFloat(String(val).replace(',', '.'));
  emit('update:modelValue', { ...props.modelValue, [key]: isNaN(num) ? 0 : num });
};

const updateBool = (key, val) => { emit('update:modelValue', { ...props.modelValue, [key]: val }); };

// Logic for the list of built-in devices (Tag list)
const addDevice = (e) => {
  const val = Number(e.target.value);
  if (!val) return;
  const arr = props.modelValue.BuiltinDevices ? [...props.modelValue.BuiltinDevices] : [];
  if (!arr.includes(val)) { arr.push(val); emit('update:modelValue', { ...props.modelValue, BuiltinDevices: arr }); }
  e.target.value = "";
};
const removeDevice = (idx) => {
  const arr = [...props.modelValue.BuiltinDevices];
  arr.splice(idx, 1);
  emit('update:modelValue', { ...props.modelValue, BuiltinDevices: arr });
};
</script>

<template>
  <div class="features-wrapper">
    <div class="features-grid">
      <div class="field-box"><label>Energy Res</label><input type="number" :value="modelValue.EnergyResistance??0" @input="e=>updateField('EnergyResistance', e.target.value)" class="win-input"></div>
      <div class="field-box"><label>Kinetic Res</label><input type="number" :value="modelValue.KineticResistance??0" @input="e=>updateField('KineticResistance', e.target.value)" class="win-input"></div>
      <div class="field-box"><label>Heat Res</label><input type="number" :value="modelValue.HeatResistance??0" @input="e=>updateField('HeatResistance', e.target.value)" class="win-input"></div>
      
      <div class="field-box"><label>Ship Wgt Bns</label><input type="number" :value="modelValue.ShipWeightBonus??0" @input="e=>updateField('ShipWeightBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Equip Wgt Bns</label><input type="number" :value="modelValue.EquipmentWeightBonus??0" @input="e=>updateField('EquipmentWeightBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Velocity Bns</label><input type="number" :value="modelValue.VelocityBonus??0" @input="e=>updateField('VelocityBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Turn Rate Bns</label><input type="number" :value="modelValue.TurnRateBonus??0" @input="e=>updateField('TurnRateBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Armor Bns</label><input type="number" :value="modelValue.ArmorBonus??0" @input="e=>updateField('ArmorBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Shield Bns</label><input type="number" :value="modelValue.ShieldBonus??0" @input="e=>updateField('ShieldBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Energy Bns</label><input type="number" :value="modelValue.EnergyBonus??0" @input="e=>updateField('EnergyBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Drone Build Bns</label><input type="number" :value="modelValue.DroneBuildSpeedBonus??0" @input="e=>updateField('DroneBuildSpeedBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Drone Atk Bns</label><input type="number" :value="modelValue.DroneAttackBonus??0" @input="e=>updateField('DroneAttackBonus', e.target.value)" step="0.1" class="win-input"></div>
      <div class="field-box"><label>Drone Def Bns</label><input type="number" :value="modelValue.DroneDefenseBonus??0" @input="e=>updateField('DroneDefenseBonus', e.target.value)" step="0.1" class="win-input"></div>
      
      <div class="field-box check-box"><label>Regeneration</label><input type="checkbox" :checked="!!modelValue.Regeneration" @change="e=>updateBool('Regeneration', e.target.checked)"></div>
    </div>

    <div class="builtin-devices-box">
      <label class="section-label">Builtin Devices</label>
      <div class="tags-container">
        <div v-for="(devId, idx) in (modelValue.BuiltinDevices || [])" :key="idx" class="tag-item">
          <span class="tag-text">ID: {{ devId }}</span>
          <button @click="removeDevice(idx)" class="tag-remove">×</button>
        </div>
        <div v-if="!modelValue.BuiltinDevices || modelValue.BuiltinDevices.length === 0" class="no-tags">Empty</div>
      </div>
      <select class="win-input tag-select" @change="addDevice">
        <option value="" disabled selected>+ Add Device...</option>
        <option v-for="item in getItemsByType(4)" :key="item.id" :value="item.id">[ID: {{ item.id }}] {{ item.name }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.features-wrapper { background: rgba(0,0,0,0.15); border: 1px solid var(--border-light); padding: 12px; border-radius: 6px; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px; }
.field-box { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.02); padding: 6px 10px; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; }
.field-box label { font-size: 10px; font-weight: bold; color: var(--text-secondary); width: 85px; text-transform: uppercase; white-space: nowrap; }
.check-box { justify-content: flex-start; }
.win-input { flex: 1; width: 100%; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 11px; }
.win-input:focus { border-color: var(--accent-color); outline: none; }

.builtin-devices-box { border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; }
.section-label { display: block; font-size: 11px; font-weight: bold; color: var(--accent-color); text-transform: uppercase; margin-bottom: 8px; }
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-bottom: 8px; min-height: 30px; }
.tag-item { background: #4477FF; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; display: flex; gap: 6px; align-items: center; }
.tag-remove { background: transparent; border: none; color: white; cursor: pointer; font-weight: bold; padding: 0; }
.tag-select { width: 100%; border-style: dashed; }
.no-tags { font-size: 11px; color: var(--text-secondary); opacity: 0.5; }
</style>