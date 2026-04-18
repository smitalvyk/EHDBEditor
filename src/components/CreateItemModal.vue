<script setup>
import { ref, computed, watch } from 'vue';
import { useGameDatabase } from '../composables/useGameDatabase';

const props = defineProps({
  isOpen: Boolean,
  currentPath: String,
  directories: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'create']);
const { getItemsByType } = useGameDatabase();

// Local state
const mode = ref('file'); // 'file' or 'folder'
const directoryPath = ref('');
const itemName = ref('NewItem');
const selectedType = ref(1); // Default to Component
const customId = ref(0);

// Initialize state when opened
watch(() => props.isOpen, (val) => {
  if (val) {
    if (props.directories.includes(props.currentPath)) {
      directoryPath.value = props.currentPath;
    } else {
      directoryPath.value = props.directories.includes('Database') ? 'Database' : props.directories[0];
    }
    itemName.value = mode.value === 'file' ? 'NewItem' : 'NewFolder';
    calculateNextId();
  }
});

watch(mode, (newMode) => {
  if (itemName.value.startsWith('New')) {
    itemName.value = newMode === 'file' ? 'NewItem' : 'NewFolder';
  }
});

// Type map for dropdown
const typeMap = {
  1: "Component", 2: "Device", 3: "Weapon", 4: "AmmunitionObsolete", 5: "DroneBay", 
  6: "Ship", 7: "Satellite", 8: "ShipBuild", 9: "SatelliteBuild", 10: "Technology",
  11: "ComponentStats", 12: "ComponentMod", 13: "Skill", 14: "Faction", 15: "Quest", 
  16: "Loot", 18: "Fleet", 19: "Character", 20: "QuestItem", 25: "Ammunition",
  26: "VisualEffect", 27: "BulletPrefab", 28: "BehaviorTree", 29: "GameObjectPrefab", 
  30: "CombatRules", 31: "ComponentStatUpgrade", 32: "StatUpgradeTemplate", 
  33: "FrontierLevel", 34: "FrontierCommonLevel", 35: "ComponentGroupTag",
  100: "ShipSettings", 101: "GalaxySettings", 102: "DatabaseSettings",
  103: "ExplorationSettings", 104: "FrontierSettings", 105: "ShipModSettings",
  106: "SpecialEventSettings", 107: "SkillSettings", 108: "DebugSettings",
  109: "CombatSettings", 110: "UiSettings", 111: "FactionsSettings",
  112: "MusicPlaylist", 113: "ResearchSetting", 114: "PvpSettings",
  115: "FrontierNpcSettings", 116: "FrontierLevelSettings",
  117: "LocalizationSettings", 118: "WeaponSlots"
};

const availableTypes = Object.entries(typeMap)
  .map(([id, name]) => ({ value: Number(id), label: name }))
  .sort((a, b) => a.label.localeCompare(b.label));

const calculateNextId = () => {
  const items = getItemsByType(selectedType.value);
  let max = 0;
  items.forEach(i => {
    if (i.id > max) max = i.id;
  });
  customId.value = max + 1;
};

watch(selectedType, () => {
  calculateNextId();
});


const conflictingItem = computed(() => {
  if (mode.value === 'folder') return null;
  const items = getItemsByType(selectedType.value);
  return items.find(i => i.id === customId.value);
});

const isIdTaken = computed(() => !!conflictingItem.value);

const canCreate = computed(() => {
  if (!itemName.value.trim()) return false;
  if (mode.value === 'file' && isIdTaken.value) return false;
  return true;
});

const handleCreate = () => {
  if (!canCreate.value) return;


  const fullPath = directoryPath.value 
    ? (directoryPath.value.endsWith('/') ? `${directoryPath.value}${itemName.value}` : `${directoryPath.value}/${itemName.value}`)
    : itemName.value;

  const finalPath = mode.value === 'file' && !fullPath.toLowerCase().endsWith('.json')
    ? `${fullPath}.json`
    : fullPath;

  let content = null;
  if (mode.value === 'file') {
    const base = {
      ItemType: selectedType.value,
      Id: customId.value,
      Name: itemName.value.replace('.json', '')
    };

    if (base.ItemType === 1) base.ComponentStatsId = 1;
    if (base.ItemType === 8) base.ShipId = 1;
    if (base.ItemType === 9) base.SatelliteId = 1;
    if (base.ItemType === 10) base.Type = 0;
    if (base.ItemType === 28) base.RootNode = { Type: 2, Nodes: [] };

    content = JSON.stringify(base, null, 2);
  }

  emit('create', {
    mode: mode.value,
    path: finalPath,
    content: content,
    typeId: selectedType.value,
    itemId: customId.value,
    name: itemName.value
  });
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="settings-modal create-modal">
      <div class="settings-header">
        <h3>📄 Create New Item</h3>
        <button @click="$emit('close')" class="btn-icon close-btn">✖</button>
      </div>

      <div class="settings-body">
        
        <div class="mode-selector">
          <button 
            class="mode-btn" 
            :class="{ active: mode === 'file' }" 
            @click="mode = 'file'"
          >📄 File</button>
          <button 
            class="mode-btn" 
            :class="{ active: mode === 'folder' }" 
            @click="mode = 'folder'"
          >📁 Folder</button>
        </div>

        <div class="form-group">
          <label>Directory Path</label>
          <select v-model="directoryPath" class="win-input">
             <option v-for="dir in directories" :key="dir" :value="dir">{{ dir || '(Root)' }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ mode === 'file' ? 'File Name' : 'Folder Name' }}</label>
          <input type="text" v-model="itemName" class="win-input" :placeholder="mode === 'file' ? 'MyNewItem' : 'MyFolder'">
        </div>

        <template v-if="mode === 'file'">
          <div class="form-group">
            <label>Item Type</label>
            <select v-model="selectedType" class="win-input">
              <option v-for="t in availableTypes" :key="t.value" :value="t.value">
                {{ t.label }} ({{ t.value }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Item ID</label>
            <div class="id-input-row">
              <input type="number" v-model.number="customId" class="win-input" min="0">
              <button @click="calculateNextId" class="btn-secondary" title="Find next free ID">↻ Auto</button>
            </div>
            
            <div v-if="isIdTaken" class="error-text mt-1">
               ID {{ customId }} is already taken by:<br>
               <b style="color: #ff8585;">{{ conflictingItem?.filePath || conflictingItem?.name }}</b>
            </div>
            <div v-else class="success-text mt-1">ID {{ customId }} is available.</div>
          </div>
        </template>

      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Cancel</button>
        <button class="btn-primary btn-create" :disabled="!canCreate" @click="handleCreate">
          {{ mode === 'file' ? 'Create JSON' : 'Create Folder' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-modal { width: 400px; max-width: 90vw; }
.mode-selector { display: flex; gap: 10px; margin-bottom: 10px; }
.mode-btn { flex: 1; padding: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); color: var(--text-primary); cursor: pointer; border-radius: 4px; font-weight: bold; transition: 0.2s;}
.mode-btn:hover { background: rgba(255,255,255,0.05); }
.mode-btn.active { background: var(--accent-color); border-color: var(--accent-color); color: white; }

.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 15px; }
.form-group label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: var(--text-secondary); }
.win-input { padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 13px; }
.win-input:focus { border-color: var(--accent-color); outline: none; }

.id-input-row { display: flex; gap: 10px; }
.error-text { color: #ff5555; font-size: 11px; font-weight: normal; line-height: 1.4;}
.success-text { color: #55ff55; font-size: 11px; }
.mt-1 { margin-top: 4px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 15px 20px; background: rgba(0,0,0,0.1); border-top: 1px solid var(--border-light); }
.btn-create { background: #10b981; border-color: #059669; color: white; }
.btn-create:hover:not(:disabled) { background: #059669; }
</style>