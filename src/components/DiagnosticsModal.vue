<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  isLoading: Boolean,
  validationErrors: Array,
  settings: Object
});

const emit = defineEmits(['close', 'run-scan', 'update:settings', 'fix-single', 'fix-bulk', 'open-file']);

const showErrorsFilter = ref(true);
const showWarningsFilter = ref(true);
const selectedTypeFilter = ref('All');
const displayLimit = ref(50);

const confirmAction = ref({ show: false, title: '', message: '', action: null });

const localSettings = ref({ ...props.settings });
watch(localSettings, (newVal) => emit('update:settings', newVal), { deep: true });

watch(() => props.isOpen, (val) => { 
  if(val) displayLimit.value = 50; 
});

const totalErrorsCount = computed(() => props.validationErrors.filter(e => e?.message?.includes('❌')).length);
const totalWarningsCount = computed(() => props.validationErrors.filter(e => e?.message?.includes('⚠️')).length);

const getTypeName = (id) => {
  const typeMap = {
    0: "Undefined", 1: "Component", 2: "Device", 3: "Weapon",
    4: "AmmunitionObsolete", 5: "DroneBay", 6: "Ship", 7: "Satellite",
    8: "ShipBuild", 9: "SatelliteBuild", 10: "Technology",
    11: "ComponentStats", 12: "ComponentMod", 13: "Skill",
    14: "Faction", 15: "Quest", 16: "Loot", 18: "Fleet",
    19: "Character", 20: "QuestItem", 25: "Ammunition",
    26: "VisualEffect", 27: "BulletPrefab", 28: "BehaviorTree",
    29: "GameObjectPrefab", 30: "CombatRules", 31: "ComponentStatUpgrade",
    32: "StatUpgradeTemplate", 33: "FrontierLevel", 34: "FrontierCommonLevel",
    35: "ComponentGroupTag",
    100: "ShipSettings", 101: "GalaxySettings", 102: "DatabaseSettings",
    103: "ExplorationSettings", 104: "FrontierSettings", 105: "ShipModSettings",
    106: "SpecialEventSettings", 107: "SkillSettings", 108: "DebugSettings",
    109: "CombatSettings", 110: "UiSettings", 111: "FactionsSettings",
    112: "MusicPlaylist", 113: "ResearchSetting", 114: "PvpSettings",
    115: "FrontierNpcSettings", 116: "FrontierLevelSettings",
    117: "LocalizationSettings", 118: "WeaponSlots"
  };
  return typeMap[id] || `Unknown (${id})`;
};

const availableErrorTypes = computed(() => {
  const types = new Set();
  props.validationErrors.forEach(err => {
    if (err?.itemType !== undefined) types.add(err.itemType);
  });
  const list = Array.from(types).map(id => ({ value: id, label: getTypeName(id) }));
  list.sort((a, b) => a.label.localeCompare(b.label));
  return [{ value: 'All', label: 'All' }, ...list];
});

const filteredValidationErrors = computed(() => {
  return props.validationErrors.filter(err => {
    if (!err || !err.message) return false;
    const isWarning = err.message.includes('⚠️');
    const isError = err.message.includes('❌');
    
    if (isWarning && !showWarningsFilter.value) return false;
    if (isError && !showErrorsFilter.value) return false;
    if (selectedTypeFilter.value !== 'All' && String(err.itemType) !== String(selectedTypeFilter.value)) return false;
    
    return true;
  });
});

const displayedErrors = computed(() => filteredValidationErrors.value.slice(0, displayLimit.value));
const loadMoreErrors = () => { displayLimit.value += 50; };

const askConfirmation = (title, message, action) => { 
  confirmAction.value = { show: true, title, message, action }; 
};

const executeConfirmedAction = () => {
  const actionToRun = confirmAction.value.action;
  confirmAction.value.show = false;
  if (actionToRun) actionToRun();
};

const triggerFixAll = () => {
  askConfirmation(
    'Auto-Fix All Visible?', 
    'Are you sure you want to auto-fix all visible issues (respecting your toggle settings)?', 
    () => emit('fix-bulk', displayedErrors.value)
  );
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="settings-modal validator-modal large-modal">
      <div class="settings-header">
        <div class="header-left">
          <h3>🩺 Diagnostics</h3>
          <button @click="$emit('run-scan')" class="btn-scan-main" :disabled="isLoading">
             {{ isLoading ? '⏳ Analyzing...' : '🔄 Run Scan' }}
          </button>
        </div>
        <button @click="$emit('close')" class="btn-icon close-btn">✖</button>
      </div>

      <div class="validator-scan-settings" style="display: flex; flex-direction: column; gap: 10px; font-size: 12px; padding: 12px 20px; background: rgba(0,0,0,0.1); border-bottom: 1px solid var(--border-light);">
        
        <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
            <span style="color: var(--accent-color); font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; width: 80px;">Rules:</span>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="localSettings.checkMissingRefs"> Check Missing IDs
            </label>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="localSettings.checkClamps"> Check Limits (Clamp)
            </label>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="localSettings.checkAiLogic"> Check AI Trees
            </label>
        </div>

        <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
            <span style="color: #10b981; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; width: 80px;">Auto-Fixes:</span>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="localSettings.fixClamps"> Fix Clamps
            </label>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="localSettings.fixStubs"> Create Stubs
            </label>
            <label class="cursor-pointer" style="display: flex; gap: 6px; align-items: center;">
              <input type="checkbox" v-model="localSettings.fixEnums"> Fix Enums to 0
            </label>
        </div>

      </div>
      
      <div class="settings-body" v-if="isLoading">
         <div class="loading-state">
            <div class="spinner"></div>
            <span>Scanning database, please wait...</span>
         </div>
      </div>

      <div class="settings-body" v-else>
        <div v-if="validationErrors.length === 0" class="empty-msg">
          No diagnostic data. Click "Run Scan" to start analysis.
        </div>

        <div v-else class="validator-content">
          <div class="validator-controls">
            <div class="validator-filters">
               <label class="filter-toggle cursor-pointer">
                 <div class="toggle-switch small-switch">
                   <input type="checkbox" v-model="showErrorsFilter">
                   <span class="slider error-slider"></span>
                 </div>
                 <span class="filter-label error-text">Errors ({{ totalErrorsCount }})</span>
               </label>
               <label class="filter-toggle cursor-pointer">
                 <div class="toggle-switch small-switch">
                   <input type="checkbox" v-model="showWarningsFilter">
                   <span class="slider warning-slider"></span>
                 </div>
                 <span class="filter-label warning-text">Warnings ({{ totalWarningsCount }})</span>
               </label>
            </div>

            <div class="type-filter-box">
               <label>Filter by Type:</label>
               <select v-model="selectedTypeFilter" class="win-input type-select">
                  <option v-for="t in availableErrorTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
               </select>
            </div>
          </div>

          <div class="bulk-actions" v-if="filteredValidationErrors.length > 0">
            <button class="btn-primary btn-auto-fix" @click="triggerFixAll">🔧 Auto-Fix All Visible</button>
          </div>
          
          <div class="errors-list">
            <div class="errors-warning" v-if="filteredValidationErrors.length > 0">
               Showing {{ displayedErrors.length }} of {{ filteredValidationErrors.length }} items
            </div>
            <div class="success-msg" v-else>
               ✅ All filtered items are hidden or no errors found.
            </div>
            
            <div v-for="(err, i) in displayedErrors" :key="i" class="error-item" :class="{ 'is-warning': err?.message?.includes('⚠️') }">
               <div class="err-header">
                 <span class="err-file">
                    File: {{ err?.path }} <span class="err-meta">(ID: {{ err?.itemId }} | Type: {{ getTypeName(err?.itemType) }})</span>
                 </span>
                 <div class="err-quick-actions">
                    <button v-if="err?.fixInfo" class="btn-fix" @click="$emit('fix-single', err)" title="Auto-Fix">🔧 FIX</button>
                    <button class="btn-err-edit" @click="$emit('open-file', err)">✏️ EDIT</button>
                 </div>
               </div>
               <span class="err-msg">{{ err?.message }}</span>
            </div>
            <button v-if="filteredValidationErrors.length > displayedErrors.length" @click="loadMoreErrors" class="btn-load-more">
               Show More ({{ filteredValidationErrors.length - displayedErrors.length }} left)
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="confirmAction.show" class="mini-confirm-overlay" @click.stop>
      <div class="mini-confirm-card">
        <h4>{{ confirmAction.title }}</h4>
        <p>{{ confirmAction.message }}</p>
        <div class="confirm-btns">
          <button class="btn-danger" @click="executeConfirmedAction">Yes, execute</button>
          <button class="btn-secondary" @click="confirmAction.show = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal Base */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 999999; }
.settings-modal { background: var(--content-bg); border: 1px solid var(--border-light); border-radius: var(--radius-lg); width: 350px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; }
.settings-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--sidebar-bg); border-bottom: 1px solid var(--border-light); }
.settings-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
.close-btn { font-size: 14px; padding: 4px 8px; background: transparent; border: none; color: var(--text-primary); cursor: pointer; border-radius: var(--radius-sm); }
.close-btn:hover { background: var(--item-hover); }
.settings-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

/* Validator Specific */
.large-modal { width: 800px; max-width: 95vw; }
.validator-modal { max-height: 85vh; }
.empty-msg { padding: 40px; text-align: center; color: var(--text-secondary); font-size: 14px; }
.success-msg { color: #44ff44; font-size: 14px; text-align: center; padding: 30px 10px; line-height: 1.5; }
.errors-warning { color: var(--text-secondary); font-weight: bold; font-size: 12px; margin-bottom: 10px; text-transform: uppercase;}
.errors-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; max-height: 50vh; padding-right: 5px; }

.header-left { display: flex; align-items: center; gap: 15px; }
.btn-scan-main { background: var(--accent-color); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; transition: 0.2s; }
.btn-scan-main:hover { filter: brightness(1.2); }
.btn-scan-main:disabled { opacity: 0.5; cursor: wait; }

.validator-controls { display: flex; justify-content: space-between; gap: 20px; padding: 10px 15px; background: rgba(0,0,0,0.05); border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--border-light); }
.validator-filters { display: flex; gap: 15px; }
.filter-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: bold; color: var(--text-primary); }
.error-text { color: #ff5555; }
.warning-text { color: #ffaa00; }
.type-filter-box { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: bold; color: var(--text-primary); }
.win-input { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-light); background: var(--content-bg); color: var(--text-primary); font-size: 12px; }

/* Toggles */
.toggle-switch { position: relative; display: inline-block; width: 34px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--accent-color); }
input:checked + .slider:before { transform: translateX(14px); }
.small-switch { width: 28px; height: 16px; }
.small-switch .slider:before { height: 12px; width: 12px; left: 2px; bottom: 2px; }
.small-switch input:checked + .slider:before { transform: translateX(12px); }
input:checked + .error-slider { background-color: #ff5555 !important; }
input:checked + .warning-slider { background-color: #ffaa00 !important; }

/* Error Items */
.error-item { padding: 12px; border-radius: 4px; display: flex; flex-direction: column; gap: 6px; border: 1px solid transparent; background: rgba(255, 85, 85, 0.08); border-left: 4px solid #ff5555; }
.error-item .err-file { color: #ff5555; font-size: 11px; font-family: monospace; font-weight: bold; flex: 1; }
.error-item.is-warning { background: rgba(255, 170, 0, 0.08); border-left: 4px solid #ffaa00; }
.error-item.is-warning .err-file { color: #ffaa00; }

.err-meta { color: var(--text-secondary); font-weight: normal; margin-left: 5px; opacity: 0.8; }
.err-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.err-msg { font-size: 13px; color: var(--text-primary); }

.err-quick-actions { display: flex; gap: 6px; align-items: center;}
.btn-err-edit { background: rgba(85, 170, 255, 0.2); color: #60cdff; border: 1px solid #60cdff; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: 0.2s; white-space: nowrap; font-weight: bold; }
.btn-err-edit:hover { background: #60cdff; color: #202020; }
.btn-fix { background: rgba(85, 255, 85, 0.2); color: #55ff55; border: 1px solid #55ff55; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: 0.2s; white-space: nowrap; font-weight: bold; }
.btn-fix:hover { background: #55ff55; color: #1e1e1e; }

/* Actions */
.bulk-actions { display: flex; gap: 10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-light); }
.btn-auto-fix { background: #10b981; color: white; border: 1px solid #059669; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
.btn-auto-fix:hover { background: #059669; }
.btn-load-more { background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px dashed var(--border-light); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; text-align: center; width: 100%; margin-top: 10px; }
.btn-load-more:hover { background: rgba(255,255,255,0.1); border-color: var(--accent-color); color: var(--accent-color); }

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px; gap: 15px; color: var(--accent-color); font-weight: bold;}
.spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Confirm Mini Modal */
.mini-confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.mini-confirm-card { background: var(--content-bg); padding: 25px; border-radius: 12px; border: 1px solid var(--accent-color); width: 320px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
.mini-confirm-card h4 { margin: 0 0 10px 0; color: var(--accent-color); }
.mini-confirm-card p { font-size: 14px; margin-bottom: 20px; word-break: break-word; color: var(--text-primary); }
.confirm-btns { display: flex; justify-content: center; gap: 12px; }
.btn-danger { background: #631a1a; color: #ff8585; border: 1px solid #ff5555; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
.btn-danger:hover { background: #ff5555; color: white; }
.btn-secondary { background: var(--sidebar-bg); color: var(--text-primary); border: 1px solid var(--border-light); padding: 6px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; transition: 0.2s; }
.btn-secondary:hover { background: var(--item-hover); }
</style>