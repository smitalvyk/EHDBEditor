<script setup>
import { computed } from 'vue';

const props = defineProps({
  layout: { type: String, default: "" },
  shipData: { type: Object, default: () => ({}) },
  shipSettings: { type: Object, default: () => ({}) }
});

// Helper to safely extract values from JSON (handles both direct values and { Value: X } nested structures)
const getVal = (obj, key, fallback = 0) => {
  if (!obj || obj[key] === undefined) return fallback;
  const val = obj[key];
  return typeof val === 'object' && val !== null ? (val.Value ?? fallback) : val;
};

// --- CORE MATH ---
const size = computed(() => {
  if (!props.layout) return 0;
  return props.layout.replace(/0/g, "").length;
});

const cellCounts = computed(() => {
  const data = props.layout || "";
  return {
    blue: data.length - data.replace(/1/g, "").length,
    green: data.length - data.replace(/2/g, "").length,
    blueGreen: data.length - data.replace(/3/g, "").length,
    weapon: data.length - data.replace(/4/g, "").length,
    engine: data.length - data.replace(/5/g, "").length
  };
});

// --- COMBAT STATS ---
const armor = computed(() => {
  const baseArmor = getVal(props.shipSettings, 'BaseArmorPoints', 0);
  const armorPerCell = getVal(props.shipSettings, 'ArmorPointsPerCell', 15); 
  return baseArmor + armorPerCell * size.value;
});

const calcResist = (val) => {
  const num = parseFloat(val) || 0;
  return 100 - 100 / (num + 1);
};

const energyResist = computed(() => calcResist(getVal(props.shipData, 'EnergyResistance', 0)));
const kineticResist = computed(() => calcResist(getVal(props.shipData, 'KineticResistance', 0)));
const heatResist = computed(() => calcResist(getVal(props.shipData, 'HeatResistance', 0)));

// --- PHYSICS STATS ---
const baseWeight = computed(() => {
  const defaultWeight = getVal(props.shipSettings, 'DefaultWeightPerCell', 10);
  const modifier = getVal(props.shipData, 'BaseWeightModifier', 0);
  return defaultWeight * size.value * (1 + modifier);
});

const minWeight = computed(() => {
  const minWeightCell = getVal(props.shipSettings, 'MinimumWeightPerCell', 5);
  const modifier = getVal(props.shipData, 'BaseWeightModifier', 0);
  return minWeightCell * size.value * (1 + modifier);
});

// --- ECONOMY STATS ---
const creditsCost = computed(() => {
  // Checks for Flagship category (assuming Enum 3 or string 'Flagship')
  const category = getVal(props.shipData, 'ShipCategory');
  const isFlagship = category == 3 || category === 'Flagship';
  return isFlagship ? 15 * size.value * size.value : 5 * size.value * size.value;
});

const starCost = computed(() => {
  const category = getVal(props.shipData, 'ShipCategory');
  if (category == 0 || category === 'Common') return Math.floor(creditsCost.value / 48000);
  if (category == 1 || category === 'Rare') return Math.floor(creditsCost.value / 6000);
  if (category == 3 || category === 'Flagship') return Math.floor(armor.value / 5);
  return -1; // -1 means not craftable with stars
});

const minSpawnDistance = computed(() => {
  return Math.max(Math.floor((size.value - 55) / 2), 0);
});
</script>

<template>
  <div class="layout-info-container">
    <div class="info-header">SHIP STATISTICS</div>
    
    <div class="info-grid">
      <div class="info-section">
        <div class="section-title">LAYOUT SIZES</div>
        <div class="stat-row"><span class="stat-label">Total Cells</span><span class="stat-value highlight">{{ size }}</span></div>
        <div class="stat-row"><span class="stat-label">Blue (Outer)</span><span class="stat-value">{{ cellCounts.blue }}</span></div>
        <div class="stat-row"><span class="stat-label">Green (Inner)</span><span class="stat-value">{{ cellCounts.green }}</span></div>
        <div class="stat-row"><span class="stat-label">Blue/Green</span><span class="stat-value">{{ cellCounts.blueGreen }}</span></div>
        <div class="stat-row"><span class="stat-label">Weapon</span><span class="stat-value">{{ cellCounts.weapon }}</span></div>
        <div class="stat-row"><span class="stat-label">Engine</span><span class="stat-value">{{ cellCounts.engine }}</span></div>
      </div>

      <div class="info-section">
        <div class="section-title">COMBAT & PHYSICS</div>
        <div class="stat-row"><span class="stat-label">Base HP (Armor)</span><span class="stat-value highlight">{{ armor.toFixed(2) }}</span></div>
        <div class="stat-row"><span class="stat-label">Energy Resist</span><span class="stat-value">{{ energyResist.toFixed(2) }}%</span></div>
        <div class="stat-row"><span class="stat-label">Kinetic Resist</span><span class="stat-value">{{ kineticResist.toFixed(2) }}%</span></div>
        <div class="stat-row"><span class="stat-label">Heat Resist</span><span class="stat-value">{{ heatResist.toFixed(2) }}%</span></div>
        <div class="separator"></div>
        <div class="stat-row"><span class="stat-label">Default Weight</span><span class="stat-value">{{ baseWeight.toFixed(1) }}</span></div>
        <div class="stat-row"><span class="stat-label">Minimal Weight</span><span class="stat-value">{{ minWeight.toFixed(1) }}</span></div>
      </div>

      <div class="info-section">
        <div class="section-title">ECONOMY & SPAWN</div>
        <div class="stat-row"><span class="stat-label">Credits Cost</span><span class="stat-value text-gold">{{ creditsCost }}</span></div>
        <div class="stat-row">
          <span class="stat-label">Stars Cost</span>
          <span class="stat-value text-gold">{{ starCost >= 0 ? starCost : '-' }}</span>
        </div>
        <div class="separator"></div>
        <div class="stat-row"><span class="stat-label">Min Spawn Dist.</span><span class="stat-value text-danger">{{ minSpawnDistance }}</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-info-container {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light, #333);
  border-radius: 8px;
  padding: 15px;
  color: #ccc;
  font-family: 'Consolas', monospace;
  box-sizing: border-box;
  width: 100%;
}

.info-header {
  font-size: 14px;
  font-weight: bold;
  color: #ffaa00;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
  margin-bottom: 15px;
  text-transform: uppercase;
}

.info-grid {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.info-section {
  flex: 1 1 250px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(255, 255, 255, 0.02);
  padding: 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.section-title {
  font-size: 11px;
  color: #888;
  margin-bottom: 5px;
  font-weight: bold;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.stat-label {
  color: #aaa;
}

.stat-value {
  font-weight: bold;
  color: #fff;
}

.stat-value.highlight { color: #55aaff; }
.text-gold { color: #ffdd55; }
.text-danger { color: #ff5555; }

.separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 4px 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .info-grid {
    flex-direction: column;
    gap: 10px;
  }
}
</style>