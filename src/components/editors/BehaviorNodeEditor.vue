<script setup>
import { computed } from 'vue';
import { SelectOptions, BehaviorNodeTypeMap, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';
import { useLocalization } from '../../composables/useLocalization'; // <--- IMPORT
import BehaviorRequirementEditor from './BehaviorRequirementEditor.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  depth: { type: Number, default: 0 }
});

const emit = defineEmits(['update:modelValue', 'delete']);
const { getItemsByType } = useGameDatabase();
const { getTranslations } = useLocalization(); // <--- LOCALIZATION HOOK

const updateField = (key, value) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

// === HIERARCHY LINE COLORS ===
const depthColors = [
  '#00FFFF', '#0088FF', '#5555FF', '#8844FF', '#C044FF', '#FF44FF'
];

const hierarchyColor = computed(() => {
  return depthColors[props.depth % depthColors.length];
});

// === TYPE DEFINITION ===
const typeName = computed(() => {
  const id = props.modelValue.Type;
  return BehaviorNodeTypeMap[id] || String(id);
});

const isType = (names) => {
  const arr = Array.isArray(names) ? names : [names];
  return arr.includes(typeName.value);
};

// === COLOR ===
const toPickerColor = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  if (hex.length > 7) return '#' + hex.substring(hex.length - 6);
  return hex;
};

// === DISPLAY CONDITIONS ===
const showNodesList = computed(() => isType(['Selector','Sequence','Parallel','RandomSelector','ParallelSequence','IfThenElse']));
const showSingleNode = computed(() => isType(['Invertor','Cooldown','Execute','PreserveTarget']));
const showSubTree = computed(() => isType('SubTree'));
const showWeaponType = computed(() => isType('SelectWeapon'));
const showExecutionMode = computed(() => isType(['Execute','Cooldown']));
const showResult = computed(() => isType(['Execute','Cooldown','SetValue']));

const showMinValue = computed(() => isType([
  'HasEnoughEnergy','RechargeEnergy','IsLowOnHp','MothershipLowHp','MainTargetLowHp',
  'EnginePropulsionForce','MothershipLowEnergy','MothershipLowShield','FindEnemy',
  'FindDamagedAlly','MoveToAttackRange','MaintainAttackRange','MainTargetWithinAttackRange',
  'FlyAroundMothership','KeepDistance','IsFasterThanTarget','HasLongerAttackRange'
]));

const showMaxValue = computed(() => isType([
  'RechargeEnergy','FindEnemy','FindDamagedAlly','MoveToAttackRange','MaintainAttackRange',
  'SlowDown','MatchVelocityWithTarget','FlyAroundMothership','KeepDistance',
  'TargetDistance','MothershipDistanceExceeded'
]));

const showCooldownVal = computed(() => isType([
  'RandomSelector','Wait','Cooldown','LookForAdditionalTargets','LookForThreats',
  'IsNotControledByPlayer','HasIncomingThreat'
]));

const showInRange = computed(() => isType(['FindEnemy','FindDamagedAlly','DetonateShip','Wait','AttackMainTarget','AttackAdditionalTargets']));
const showNoDrones = computed(() => isType('FindEnemy'));
const showUseSystems = computed(() => isType('Ram'));
const showDeviceClass = computed(() => isType('ActivateDevice'));
const showText = computed(() => isType(['ShowMessage','DebugLog','SetValue','GetValue','SaveTarget','LoadTarget','SendMessage','MessageReceived','HasSavedTarget','ForgetSavedTarget']));
const showColor = computed(() => isType('ShowMessage'));

// === LABELS ===
const getLabel = (key, defaultLabel) => {
  const t = typeName.value;
  if (key === 'ItemId' && t === 'SubTree') return 'BehaviourTree';
  if (key === 'Result' && t === 'SetValue') return 'Value';
  if (key === 'MinValue') {
    if (['HasEnoughEnergy','RechargeEnergy'].includes(t)) return 'FailIfLess';
    if (['FindEnemy','FindDamagedAlly'].includes(t)) return 'MinCooldown';
    if (['MoveToAttackRange','MaintainAttackRange'].includes(t)) return 'MinMaxLerp';
    if (['FlyAroundMothership','KeepDistance'].includes(t)) return 'MinDistance';
    if (['IsFasterThanTarget','HasLongerAttackRange'].includes(t)) return 'Multiplier';
  }
  if (key === 'MaxValue') {
    if (t === 'RechargeEnergy') return 'RestoreUntil';
    if (['FindEnemy','FindDamagedAlly'].includes(t)) return 'MaxCooldown';
    if (t === 'MoveToAttackRange') return 'Multiplier';
    if (['MaintainAttackRange','SlowDown','MatchVelocityWithTarget'].includes(t)) return 'Tolerance';
    if (['FlyAroundMothership','KeepDistance','TargetDistance','MothershipDistanceExceeded'].includes(t)) return 'MaxDistance';
  }
  if (key === 'Cooldown' && t === 'HasIncomingThreat') return 'TimeToCollision';
  if (key === 'Text' && ['SetValue','GetValue','SaveTarget','LoadTarget'].includes(t)) return 'Name';
  return defaultLabel;
};

// === METHODS ===
const addNode = () => {
  const current = props.modelValue.Nodes ? [...props.modelValue.Nodes] : [];
  current.push({ Type: 3 }); 
  updateField('Nodes', current);
};
const removeNode = (index) => {
  const current = [...props.modelValue.Nodes];
  current.splice(index, 1);
  updateField('Nodes', current);
};
const moveNode = (index, direction) => {
  const current = [...props.modelValue.Nodes];
  if (index + direction < 0 || index + direction >= current.length) return;
  const temp = current[index];
  current[index] = current[index + direction];
  current[index + direction] = temp;
  updateField('Nodes', current);
};
const updateChildNode = (index, newVal) => {
  const current = [...props.modelValue.Nodes];
  current[index] = newVal;
  updateField('Nodes', current);
};
const createSingleNode = () => { updateField('Node', { Type: 3 }); };
const deleteSingleNode = () => { updateField('Node', undefined); };
const createRequirement = () => updateField('Requirement', { Type: 10 });
const deleteRequirement = () => updateField('Requirement', undefined);
const updateRequirement = (v) => updateField('Requirement', v);

</script>

<template>
  <div class="node-block" :style="{ borderLeftColor: hierarchyColor }">
    
    <div class="node-header">
      <div class="type-select-row">
        <label :style="{ color: hierarchyColor }">Type</label>
        <select :value="modelValue.Type" @change="e => updateField('Type', Number(e.target.value))" class="win-input type-select">
           <option v-for="item in SelectOptions.BehaviorNodeTypeList" :key="item.id" :value="item.id">
             {{ item.name }}
           </option>
           <option v-if="!BehaviorNodeTypeMap[modelValue.Type]" :value="modelValue.Type">
             Unknown ({{ modelValue.Type }})
           </option>
        </select>
      </div>
      <button @click="$emit('delete')" class="btn-delete-node" title="Delete Node">×</button>
    </div>

    <div class="node-row-vertical">
      <div class="req-header-row">
        <label>Requirement</label>
        <button v-if="!modelValue.Requirement" @click="createRequirement" class="btn-action-small">Create</button>
      </div>
      <div v-if="modelValue.Requirement" class="req-container">
        <BehaviorRequirementEditor 
          :modelValue="modelValue.Requirement"
          @update:modelValue="updateRequirement"
          @delete="deleteRequirement"
        />
      </div>
    </div>

    <div class="node-row" v-if="showSubTree">
      <label>{{ getLabel('ItemId', 'BehaviourTree') }}</label>
      <select :value="modelValue.ItemId" @change="e => updateField('ItemId', Number(e.target.value))" class="win-input">
        <option :value="0">[EMPTY]</option>
        <option v-for="item in getItemsByType(ItemType.BehaviorTree)" :key="item.id" :value="item.id">
           [ID: {{ item.id }}] {{ item.name }}
        </option>
      </select>
    </div>

    <div class="node-row" v-if="showWeaponType">
      <label>WeaponType</label>
      <select :value="modelValue.WeaponType" @change="e => updateField('WeaponType', Number(e.target.value))" class="win-input">
        <option v-for="(name, id) in SelectOptions.AiWeaponCategory" :key="id" :value="Number(id)">{{ name }}</option>
      </select>
    </div>

    <div class="node-row" v-if="showExecutionMode">
      <label>ExecutionMode</label>
      <select :value="modelValue.ExecutionMode" @change="e => updateField('ExecutionMode', Number(e.target.value))" class="win-input">
        <option v-for="(name, id) in SelectOptions.NodeExecutionMode" :key="id" :value="Number(id)">{{ name }}</option>
      </select>
    </div>
    
    <div class="node-row" v-if="showDeviceClass">
      <label>DeviceClass</label>
      <select :value="modelValue.DeviceClass" @change="e => updateField('DeviceClass', e.target.value)" class="win-input">
        <option v-for="opt in SelectOptions.DeviceClass" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>

    <div class="node-row" v-if="showResult">
      <label>{{ getLabel('Result', 'Result') }}</label>
      <input type="checkbox" :checked="modelValue.Result" @change="e => updateField('Result', e.target.checked)">
    </div>

    <div class="node-row" v-if="showMinValue">
      <label>{{ getLabel('MinValue', 'MinValue') }}</label>
      <input type="number" :value="modelValue.MinValue" @input="e => updateField('MinValue', parseFloat(e.target.value))" class="win-input" step="0.1">
    </div>

    <div class="node-row" v-if="showMaxValue">
      <label>{{ getLabel('MaxValue', 'MaxValue') }}</label>
      <input type="number" :value="modelValue.MaxValue" @input="e => updateField('MaxValue', parseFloat(e.target.value))" class="win-input" step="0.1">
    </div>

    <div class="node-row" v-if="showCooldownVal">
      <label>{{ getLabel('Cooldown', 'Cooldown') }}</label>
      <input type="number" :value="modelValue.Cooldown" @input="e => updateField('Cooldown', parseFloat(e.target.value))" class="win-input" step="0.1">
    </div>
    
    <div class="node-row vertical-start" v-if="showText">
      <label>{{ getLabel('Text', 'Text') }}</label>
      <div class="text-group">
        <input type="text" :value="modelValue.Text" @input="e => updateField('Text', e.target.value)" class="win-input">
        
        <div v-if="modelValue.Text && modelValue.Text.startsWith('$')" class="loc-preview-box">
           <div v-for="(trans, idx) in getTranslations(modelValue.Text)" :key="idx" class="loc-item">
             <span class="loc-file">{{ trans.file }}:</span>
             <span class="loc-content">{{ trans.text }}</span>
           </div>
           <div v-if="getTranslations(modelValue.Text).length === 0" class="loc-missing">
             Translation not found
           </div>
        </div>

      </div>
    </div>

    <div class="node-row" v-if="showColor">
      <label>Color</label>
      <div class="color-group">
        <input type="color" :value="toPickerColor(modelValue.Color)" @input="e => updateField('Color', e.target.value)" class="color-picker">
        <input type="text" :value="modelValue.Color" @input="e => updateField('Color', e.target.value)" class="win-input color-text" placeholder="#RRGGBBAA">
      </div>
    </div>

    <div class="node-row" v-if="showInRange"><label>{{ getLabel('InRange', 'InRange') }}</label><input type="checkbox" :checked="modelValue.InRange" @change="e => updateField('InRange', e.target.checked)"></div>
    <div class="node-row" v-if="showNoDrones"><label>{{ getLabel('NoDrones', 'IgnoreDrones') }}</label><input type="checkbox" :checked="modelValue.NoDrones" @change="e => updateField('NoDrones', e.target.checked)"></div>
    <div class="node-row" v-if="showUseSystems"><label>{{ getLabel('UseSystems', 'UseShipSystems') }}</label><input type="checkbox" :checked="modelValue.UseSystems" @change="e => updateField('UseSystems', e.target.checked)"></div>

    <div class="node-list-section" v-if="showNodesList" :style="{ borderLeftColor: hierarchyColor }">
      <div class="list-header" :style="{ color: hierarchyColor }">NODES</div>
      <div class="children-list">
        <div v-for="(child, idx) in modelValue.Nodes" :key="idx" class="child-wrapper">
          <div class="child-controls">
            <span class="index-badge" :style="{ color: hierarchyColor }">{{ idx + 1 }}</span>
            <div class="move-btns">
              <button @click="moveNode(idx, -1)" :disabled="idx === 0">▲</button>
              <button @click="moveNode(idx, 1)" :disabled="idx === (modelValue.Nodes?.length || 0) - 1">▼</button>
            </div>
          </div>
          <BehaviorNodeEditor 
            :modelValue="child" 
            @update:modelValue="v => updateChildNode(idx, v)"
            @delete="removeNode(idx)"
            :depth="depth + 1"
          />
        </div>
      </div>
      <div class="list-actions">
        <button @click="addNode" class="btn-add-node" :style="{ borderColor: hierarchyColor, color: hierarchyColor }">+ Add Node</button>
      </div>
    </div>

    <div class="node-single-section" v-if="showSingleNode" :style="{ borderLeftColor: hierarchyColor }">
      <div class="list-header" :style="{ color: hierarchyColor }">CHILD NODE</div>
      <div v-if="modelValue.Node" class="child-wrapper single">
        <BehaviorNodeEditor 
          :modelValue="modelValue.Node" 
          @update:modelValue="v => updateField('Node', v)"
          @delete="deleteSingleNode"
          :depth="depth + 1"
        />
      </div>
      <div v-else>
        <button @click="createSingleNode" class="btn-action">Create Node</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.node-block {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  border-left-width: 4px; 
  padding: 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  transition: border-color 0.3s;
}

.node-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 4px;
}
.type-select-row { display: flex; gap: 10px; align-items: center; flex: 1; }
.type-select-row label { font-weight: bold; min-width: 60px; font-size: 12px; }
.type-select { font-weight: bold; }

.btn-delete-node { 
  background: rgba(255, 50, 50, 0.1); 
  border: 1px solid #ff5555; 
  color: #ff5555; 
  width: 24px; height: 24px; 
  border-radius: 4px; 
  cursor: pointer; 
  font-size: 16px; 
  line-height: 1; 
  display: flex; align-items: center; justify-content: center;
}
.btn-delete-node:hover { background: #ff5555; color: white; }

.node-row { display: flex; align-items: center; gap: 10px; min-height: 28px; }
.node-row.vertical-start { align-items: flex-start; }
.node-row label { width: 120px; font-size: 11px; color: var(--text-secondary); opacity: 0.8; margin-top: 6px; }
.win-input { flex: 1; padding: 4px 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 12px; }

/* TEXT LOCALIZATION */
.text-group { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.loc-preview-box {
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed var(--accent-color);
  border-radius: 4px;
  padding: 6px;
  font-size: 11px;
}
.loc-item { margin-bottom: 2px; line-height: 1.2; }
.loc-file { color: var(--accent-color); font-weight: bold; margin-right: 4px; opacity: 0.8; }
.loc-content { color: #ddd; }
.loc-missing { color: #ffaa00; font-style: italic; opacity: 0.7; }

/* REQ */
.node-row-vertical { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; }
.req-header-row { display: flex; justify-content: space-between; align-items: center; }
.req-header-row label { font-size: 11px; font-weight: bold; color: #aaa; }
.btn-action-small { padding: 2px 8px; font-size: 10px; background: transparent; border: 1px solid var(--accent-color); color: var(--accent-color); border-radius: 4px; cursor: pointer; }
.btn-action-small:hover { background: var(--accent-color); color: white; }

/* LISTS */
.node-list-section, .node-single-section { 
  margin-top: 10px; 
  padding-left: 15px; 
  border-left: 2px solid; 
  margin-left: 5px;
}
.list-header { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }

.children-list { display: flex; flex-direction: column; gap: 10px; }
.child-wrapper { display: flex; gap: 8px; align-items: flex-start; width: 100%; }

.child-controls { 
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding-top: 10px; min-width: 20px; 
}
.index-badge { font-size: 10px; font-weight: bold; }
.move-btns button { background: none; border: 1px solid #555; color: #888; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 2px; border-radius: 2px; }
.move-btns button:hover:not(:disabled) { border-color: white; color: white; }
.move-btns button:disabled { opacity: 0.2; border-color: transparent; }

.list-actions { margin-top: 10px; }
.btn-add-node { width: 100%; padding: 8px; border: 1px dashed; background: rgba(0,0,0,0.2); cursor: pointer; font-weight: bold; transition: all 0.2s; }
.btn-add-node:hover { background: rgba(255,255,255,0.05); }

/* COLOR */
.color-group { display: flex; gap: 6px; flex: 1; align-items: center; }
.color-picker { width: 30px; height: 30px; border: none; background: none; padding: 0; cursor: pointer; }
.color-text { font-family: monospace; }
</style>