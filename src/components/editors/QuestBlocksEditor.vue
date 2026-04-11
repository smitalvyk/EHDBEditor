<script setup>
import { computed, ref } from 'vue';
import { SelectOptions, ItemType } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';
import { useLocalization } from '../../composables/useLocalization';
import FactionFilterEditor from './FactionFilterEditor.vue';
import RequirementEditor from './RequirementEditor.vue';

const props = defineProps({
  modelValue: { type: [Object, Array], required: true },
  mode: { type: String, required: true } // 'origin', 'requirement', 'nodes'
});

const emit = defineEmits(['update:modelValue']);
const { getItemsByType } = useGameDatabase();
const { getTranslations } = useLocalization();

const updateObjField = (field, value) => {
  const current = props.modelValue || {};
  emit('update:modelValue', { ...current, [field]: value });
};

// === COLLAPSE / EXPAND LOGIC (Fixed for reliable Vue 3 reactivity) ===
const collapsedNodes = ref({});

const toggleCollapse = (idx) => {
  collapsedNodes.value = { 
    ...collapsedNodes.value, 
    [idx]: !collapsedNodes.value[idx] 
  };
};

const expandAll = () => {
  collapsedNodes.value = {};
};

const collapseAll = () => {
  const newCollapsed = {};
  (props.modelValue || []).forEach((_, i) => {
    newCollapsed[i] = true;
  });
  collapsedNodes.value = newCollapsed;
};

// === NODES LOGIC ===
const addNode = () => {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  arr.push({ Id: arr.length + 1, Type: 10, Message: "" });
  emit('update:modelValue', arr);
  
  // Expand new element
  collapsedNodes.value = { ...collapsedNodes.value, [arr.length - 1]: false };
};

const updateNode = (idx, field, val) => {
  const arr = [...props.modelValue];
  arr[idx] = { ...arr[idx], [field]: val };
  emit('update:modelValue', arr);
};

const removeNode = (idx) => {
  const arr = [...props.modelValue];
  arr.splice(idx, 1);
  emit('update:modelValue', arr);
  
  const newCollapsed = {};
  for (const [key, isCollapsed] of Object.entries(collapsedNodes.value)) {
    const k = Number(key);
    if (k < idx) newCollapsed[k] = isCollapsed;
    else if (k > idx) newCollapsed[k - 1] = isCollapsed;
  }
  collapsedNodes.value = newCollapsed;
};

// === SORT BY ID ===
const sortNodes = () => {
  if (!Array.isArray(props.modelValue)) return;
  
  const mapped = props.modelValue.map((node, index) => ({ node, index }));
  
  mapped.sort((a, b) => {
    const idA = (a.node.Id !== undefined && a.node.Id !== null && a.node.Id !== "") ? Number(a.node.Id) : Infinity;
    const idB = (b.node.Id !== undefined && b.node.Id !== null && b.node.Id !== "") ? Number(b.node.Id) : Infinity;
    return idA - idB;
  });

  const newCollapsed = {};
  mapped.forEach((item, newIndex) => {
    if (collapsedNodes.value[item.index]) {
      newCollapsed[newIndex] = true;
    }
  });
  
  collapsedNodes.value = newCollapsed;
  
  const sortedArray = mapped.map(item => item.node);
  emit('update:modelValue', sortedArray);
};

// Node Lists (Transitions/Actions)
const addNodeListElement = (nIdx, listName) => {
  const arr = [...props.modelValue];
  const list = arr[nIdx][listName] ? [...arr[nIdx][listName]] : [];
  list.push({ TargetNode: 1, Requirement: { Type: 0 } });
  arr[nIdx] = { ...arr[nIdx], [listName]: list };
  emit('update:modelValue', arr);
};
const updateNodeListElement = (nIdx, listName, elIdx, field, val) => {
  const arr = [...props.modelValue];
  const list = [...arr[nIdx][listName]];
  list[elIdx] = { ...list[elIdx], [field]: val };
  arr[nIdx] = { ...arr[nIdx], [listName]: list };
  emit('update:modelValue', arr);
};
const removeNodeListElement = (nIdx, listName, elIdx) => {
  const arr = [...props.modelValue];
  const list = [...arr[nIdx][listName]];
  list.splice(elIdx, 1);
  arr[nIdx] = { ...arr[nIdx], [listName]: list };
  emit('update:modelValue', arr);
};

// View Conditions
const showMessage = (t) => [10, 15, 17, 16].includes(t);
const showDefTrans = (t) => [15, 16, 30, 25, 26, 35, 36, 37, 43, 56, 51, 55, 50, 11, 12, 62, 60, 61, 52, 57].includes(t);
const showVicTrans = (t) => [20, 21, 22].includes(t);
const showFailTrans = (t) => [20, 21, 22].includes(t);
const showEnemy = (t) => [10, 20].includes(t);
const showLoot = (t) => [10, 35, 36, 37, 20].includes(t);
const showQuest = (t) => t === 43;
const showCharacter = (t) => [10, 55, 50].includes(t);
const showFaction = (t) => [11, 62, 12].includes(t);
const showValue = (t) => [55, 56, 50, 51, 11, 12, 52, 57].includes(t);
const showActions = (t) => t === 10;
const showTransitions = (t) => [15, 16, 17].includes(t);
</script>

<template>
  <div class="quest-container">
    
    <div v-if="mode === 'origin'" class="ve-item" style="border-left-color: #44ff44;">
      <div class="ve-header">
        <span class="ve-index">Quest Origin</span>
        <select :value="modelValue?.Type || 0" @change="e => updateObjField('Type', Number(e.target.value))" class="win-input type-select">
          <option v-for="opt in SelectOptions.QuestOriginTypeList" :key="opt.id" :value="opt.id" class="dark-opt">{{ opt.name }}</option>
        </select>
      </div>
      <div class="ve-grid">
        <div class="field-row"><label>Min Dist</label><input type="number" :value="modelValue?.MinDistance||0" @input="e=>updateObjField('MinDistance', parseInt(e.target.value))" class="win-input"></div>
        <div class="field-row"><label>Max Dist</label><input type="number" :value="modelValue?.MaxDistance||0" @input="e=>updateObjField('MaxDistance', parseInt(e.target.value))" class="win-input"></div>
        <div class="field-row"><label>Min Rel</label><input type="number" :value="modelValue?.MinRelations||0" @input="e=>updateObjField('MinRelations', parseInt(e.target.value))" class="win-input"></div>
        <div class="field-row"><label>Max Rel</label><input type="number" :value="modelValue?.MaxRelations||0" @input="e=>updateObjField('MaxRelations', parseInt(e.target.value))" class="win-input"></div>
      </div>
      <div class="faction-box">
        <label class="section-label">Factions Filter</label>
        <FactionFilterEditor :modelValue="modelValue?.Factions || {Type:0,List:[]}" @update:modelValue="v=>updateObjField('Factions', v)" />
      </div>
    </div>

    <div v-else-if="mode === 'requirement'">
      <RequirementEditor :modelValue="modelValue || {Type:0}" @update:modelValue="v => emit('update:modelValue', v)" />
    </div>

    <div v-else-if="mode === 'nodes'" class="nodes-wrapper">
      
      <div v-if="modelValue && modelValue.length > 0" class="global-controls">
        <button @click="expandAll" class="btn-control">Expand All</button>
        <button @click="collapseAll" class="btn-control">Collapse All</button>
        <button @click="sortNodes" class="btn-control sort-btn">Sort by ID</button>
      </div>

      <div v-for="(node, nIdx) in (modelValue || [])" :key="nIdx" class="ve-item node-card" style="border-left-color: #ff5555;">
        
        <div class="ve-header">
          <button @click="toggleCollapse(nIdx)" class="btn-collapse" :title="collapsedNodes[nIdx] ? 'Expand' : 'Collapse'">
            {{ collapsedNodes[nIdx] ? '▼' : '▲' }}
          </button>
          
          <div class="node-id-box">
            <span>ID:</span><input type="number" :value="node.Id" @input="e=>updateNode(nIdx, 'Id', parseInt(e.target.value))" class="win-input id-input">
          </div>
          <select :value="node.Type" @change="e=>updateNode(nIdx, 'Type', Number(e.target.value))" class="win-input type-select">
            <option v-for="opt in SelectOptions.QuestNodeTypeList" :key="opt.id" :value="opt.id" class="dark-opt">{{ opt.name }}</option>
          </select>
          <button @click="removeNode(nIdx)" class="btn-del">×</button>
        </div>

        <div v-show="!collapsedNodes[nIdx]" class="node-body">
          <div class="ve-grid">
            <div v-if="node.Type === 10" class="field-row full-row">
              <label>Req. View</label>
              <select :value="node.RequiredView||0" @change="e=>updateNode(nIdx, 'RequiredView', Number(e.target.value))" class="win-input full-width-input">
                <option v-for="opt in SelectOptions.RequiredViewModeList" :key="opt.id" :value="opt.id" class="dark-opt">{{ opt.name }}</option>
              </select>
            </div>

            <div v-if="showMessage(node.Type)" class="field-row full-row loc-field-row">
              <label>Message</label>
              <div class="loc-input-wrapper">
                <input type="text" :value="node.Message" @input="e=>updateNode(nIdx, 'Message', e.target.value)" class="win-input full-width-input">
                <div v-if="typeof node.Message === 'string' && node.Message.startsWith('$') && getTranslations(node.Message).length > 0" class="localization-box">
                    <div v-for="(trans, tIdx) in getTranslations(node.Message)" :key="tIdx" class="loc-item">
                      <span class="loc-file">{{ trans.file }}:</span>
                      <span class="loc-text">{{ trans.text }}</span>
                    </div>
                </div>
                <div v-else-if="typeof node.Message === 'string' && node.Message.startsWith('$')" class="localization-box empty">
                    No translation found
                </div>
              </div>
            </div>
            
            <div v-if="showDefTrans(node.Type)" class="field-row"><label>Transition</label><input type="number" :value="node.DefaultTransition||0" @input="e=>updateNode(nIdx, 'DefaultTransition', parseInt(e.target.value))" class="win-input"></div>
            <div v-if="showVicTrans(node.Type)" class="field-row"><label>Vic. Trans</label><input type="number" :value="node.DefaultTransition||0" @input="e=>updateNode(nIdx, 'DefaultTransition', parseInt(e.target.value))" class="win-input"></div>
            <div v-if="showFailTrans(node.Type)" class="field-row"><label>Fail Trans</label><input type="number" :value="node.FailureTransition||0" @input="e=>updateNode(nIdx, 'FailureTransition', parseInt(e.target.value))" class="win-input"></div>
            <div v-if="showValue(node.Type)" class="field-row"><label>Value/Lvl</label><input type="number" :value="node.Value||0" @input="e=>updateNode(nIdx, 'Value', parseInt(e.target.value))" class="win-input"></div>

            <div v-if="showEnemy(node.Type)" class="field-row full-row">
              <label>Enemy Fleet</label>
              <select :value="node.Enemy||0" @change="e=>updateNode(nIdx,'Enemy',Number(e.target.value))" class="win-input full-width-input">
                <option :value="0" class="dark-opt">[NONE]</option>
                <option v-for="it in getItemsByType(ItemType.Fleet)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name||'Fleet'}} — 📂 {{it.filePath}}</option>
              </select>
            </div>
            <div v-if="showLoot(node.Type)" class="field-row full-row">
              <label>Loot Table</label>
              <select :value="node.Loot||0" @change="e=>updateNode(nIdx,'Loot',Number(e.target.value))" class="win-input full-width-input">
                <option :value="0" class="dark-opt">[NONE]</option>
                <option v-for="it in getItemsByType(ItemType.Loot)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name||'Loot'}} — 📂 {{it.filePath}}</option>
              </select>
            </div>
            <div v-if="showQuest(node.Type)" class="field-row full-row">
              <label>Quest</label>
              <select :value="node.Quest||0" @change="e=>updateNode(nIdx,'Quest',Number(e.target.value))" class="win-input full-width-input">
                <option :value="0" class="dark-opt">[NONE]</option>
                <option v-for="it in getItemsByType(ItemType.Quest)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name}} — 📂 {{it.filePath}}</option>
              </select>
            </div>
            <div v-if="showCharacter(node.Type)" class="field-row full-row">
              <label>Character</label>
              <select :value="node.Character||0" @change="e=>updateNode(nIdx,'Character',Number(e.target.value))" class="win-input full-width-input">
                <option :value="0" class="dark-opt">[NONE]</option>
                <option v-for="it in getItemsByType(ItemType.Character)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name}} — 📂 {{it.filePath}}</option>
              </select>
            </div>
            <div v-if="showFaction(node.Type)" class="field-row full-row">
              <label>Faction</label>
              <select :value="node.Faction||0" @change="e=>updateNode(nIdx,'Faction',Number(e.target.value))" class="win-input full-width-input">
                <option :value="0" class="dark-opt">[NONE]</option>
                <option v-for="it in getItemsByType(ItemType.Faction)" :key="it.id" :value="it.id" class="dark-opt">[ID: {{it.id}}] {{it.name}} — 📂 {{it.filePath}}</option>
              </select>
            </div>
          </div>

          <div v-if="showActions(node.Type)" class="list-box">
            <label class="section-label">Actions</label>
            <div v-for="(act, aIdx) in (node.Actions||[])" :key="aIdx" class="sub-item">
              
              <div class="sub-header-row">
                <div class="field-row loc-field-row" style="flex: 1; width: 100%;">
                  <label>Btn Txt</label>
                  <div class="loc-input-wrapper">
                    <input type="text" :value="act.ButtonText" @input="e=>updateNodeListElement(nIdx,'Actions',aIdx,'ButtonText',e.target.value)" class="win-input full-width-input">
                    <div v-if="typeof act.ButtonText === 'string' && act.ButtonText.startsWith('$') && getTranslations(act.ButtonText).length > 0" class="localization-box">
                        <div v-for="(trans, tIdx) in getTranslations(act.ButtonText)" :key="tIdx" class="loc-item">
                          <span class="loc-file">{{ trans.file }}:</span>
                          <span class="loc-text">{{ trans.text }}</span>
                        </div>
                    </div>
                    <div v-else-if="typeof act.ButtonText === 'string' && act.ButtonText.startsWith('$')" class="localization-box empty">
                        No translation found
                    </div>
                  </div>
                </div>
                <button @click="removeNodeListElement(nIdx,'Actions',aIdx)" class="btn-del small">×</button>
              </div>

              <div class="sub-header-row" style="margin-top: 8px; margin-bottom: 12px; width: 100%;">
                <div class="field-row" style="width: 100%; flex: 1;">
                  <label>Target Node</label>
                  <input type="number" :value="act.TargetNode" @input="e=>updateNodeListElement(nIdx,'Actions',aIdx,'TargetNode',parseInt(e.target.value))" class="win-input full-width-input">
                </div>
              </div>

              <RequirementEditor :modelValue="act.Requirement||{Type:0}" @update:modelValue="v=>updateNodeListElement(nIdx,'Actions',aIdx,'Requirement',v)" />
            </div>
            <button @click="addNodeListElement(nIdx,'Actions')" class="btn-add">+ Add Action</button>
          </div>

          <div v-if="showTransitions(node.Type)" class="list-box">
            <label class="section-label">Transitions</label>
            <div v-for="(trn, tIdx) in (node.Transitions||[])" :key="tIdx" class="sub-item">
              
              <div class="sub-header-row" style="width: 100%;">
                <div class="field-row" style="flex: 1;"><label>Target</label><input type="number" :value="trn.TargetNode" @input="e=>updateNodeListElement(nIdx,'Transitions',tIdx,'TargetNode',parseInt(e.target.value))" class="win-input full-width-input"></div>
                <div v-if="node.Type===16" class="field-row" style="flex: 1;"><label>Weight</label><input type="number" :value="trn.Weight" @input="e=>updateNodeListElement(nIdx,'Transitions',tIdx,'Weight',parseFloat(e.target.value))" class="win-input full-width-input"></div>
                <button @click="removeNodeListElement(nIdx,'Transitions',tIdx)" class="btn-del small">×</button>
              </div>
              
              <div style="margin-top: 12px; width: 100%;">
                <RequirementEditor :modelValue="trn.Requirement||{Type:0}" @update:modelValue="v=>updateNodeListElement(nIdx,'Transitions',tIdx,'Requirement',v)" />
              </div>
            </div>
            <button @click="addNodeListElement(nIdx,'Transitions')" class="btn-add">+ Add Transition</button>
          </div>
        </div> </div>
      <button @click="addNode" class="btn-add giant">+ ADD NEW NODE</button>
    </div>

  </div>
</template>

<style scoped>
.quest-container { display: flex; flex-direction: column; gap: 10px; width: 100%; min-width: 100%; box-sizing: border-box; }
.nodes-wrapper { display: flex; flex-direction: column; width: 100%; align-items: stretch; box-sizing: border-box; }
.ve-item { background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); border-left-width: 4px; padding: 12px; border-radius: 4px; margin-bottom: 10px; width: 100%; align-self: stretch; box-sizing: border-box; display: block; }

.node-card { background: rgba(255,255,255,0.02); }

.global-controls { display: flex; gap: 10px; margin-bottom: 5px; width: 100%; box-sizing: border-box;}
.btn-control { flex: 1; padding: 6px; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 11px; text-transform: uppercase; font-weight: bold; width: 100%;}
.btn-control:hover { background: rgba(255,255,255,0.1); color: white; }
.sort-btn { border-color: #55aaff; color: #55aaff; }
.sort-btn:hover { background: rgba(85, 170, 255, 0.1); color: white; border-color: white; }

.ve-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; width: 100%; box-sizing: border-box;}
.node-body { padding-top: 5px; width: 100%; box-sizing: border-box;}

.btn-collapse { background: transparent; border: none; color: var(--text-secondary); font-size: 12px; cursor: pointer; padding: 2px 5px; opacity: 0.7; transition: 0.2s; }
.btn-collapse:hover { opacity: 1; color: white; }

.ve-index { font-weight: bold; color: var(--text-secondary); font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
.node-id-box { display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; border: 1px solid #ff5555;}
.node-id-box span { font-size: 11px; color: #ff5555; font-weight: bold; }
.id-input { width: 50px; font-weight: bold; text-align: center; }
.type-select { flex: 1; width: 100%; font-weight: bold; color: var(--accent-color); }
.dark-opt { background: #2b2b2b; color: #ffffff; }
.btn-del { background: rgba(255,50,50,0.1); color: #ff5555; border: 1px solid #ff5555; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-del.small { width: 20px; height: 20px; font-size: 12px; }

.ve-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; width: 100%; box-sizing: border-box; }
.field-row { display: flex; align-items: center; gap: 8px; flex: 1; width: 100%; }
.full-row { grid-column: span 2; }
.field-row label { width: 75px; font-size: 11px; opacity: 0.8; font-weight: bold; color: var(--text-secondary); }
.win-input { flex: 1; width: 100%; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); color: white; border-radius: 4px; font-size: 11px; box-sizing: border-box; }
.full-width-input { width: 100%; box-sizing: border-box; }
.win-input:focus { border-color: var(--accent-color); outline: none; }
.faction-box { padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); width: 100%; box-sizing: border-box; }
.section-label { display: block; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; color: #44ff44; }

.list-box { padding: 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; margin-top: 10px; width: 100%; box-sizing: border-box; }
.sub-item { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; margin-bottom: 8px; width: 100%; box-sizing: border-box;}
.sub-header-row { display: flex; gap: 10px; align-items: flex-start; width: 100%; box-sizing: border-box;}

.btn-add { width: 100%; padding: 6px; background: transparent; border: 1px dashed var(--border-light); color: var(--text-secondary); cursor: pointer; border-radius: 4px; transition: 0.2s; box-sizing: border-box;}
.btn-add:hover { border-color: var(--accent-color); color: var(--accent-color); background: rgba(255,255,255,0.05); }
.btn-add.giant { padding: 12px; font-size: 14px; border-color: #ff5555; color: #ff5555; margin-top: 10px;}

.loc-field-row { align-items: flex-start; width: 100%; flex: 1; }
.loc-input-wrapper { flex: 1; display: flex; flex-direction: column; min-width: 0; width: 100%; }
.localization-box { margin-top: 4px; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-light); border-radius: 4px; padding: 6px; font-size: 11px; max-height: 120px; overflow-y: auto; width: 100%; box-sizing: border-box;}
.localization-box.empty { color: #ffaa00; font-style: italic; opacity: 0.7; }
.loc-item { display: flex; flex-direction: column; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; }
.loc-item:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
.loc-file { font-size: 9px; color: var(--accent-color); font-weight: bold; opacity: 0.8; margin-bottom: 2px; }
.loc-text { color: var(--text-primary); white-space: pre-wrap; line-height: 1.2; word-wrap: break-word; }
</style>