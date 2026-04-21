<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { itemSchemas, defaultSchema, FieldType } from '../../data/itemSchemas';
import { ItemTypeNames, SelectOptions, QualityDefinition } from '../../data/enums';
import { useGameDatabase } from '../../composables/useGameDatabase';
import { useFileSystem } from '../../composables/useFileSystem';
import { useLocalization } from '../../composables/useLocalization';

// ADDED FOR ANDROID (CAPACITOR)
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

import LayoutEditor from './LayoutEditor.vue';
import RestrictionsEditor from './RestrictionsEditor.vue';
import WeaponSlotsEditor from './WeaponSlotsEditor.vue';
import MusicListEditor from './MusicListEditor.vue';
import CheatCodesEditor from './CheatCodesEditor.vue';
import BehaviorTreeEditor from './BehaviorTreeEditor.vue'; 
import VisualEffectEditor from './VisualEffectEditor.vue'; 
import AmmunitionBlocksEditor from './AmmunitionBlocksEditor.vue'; 
import FactionFilterEditor from './FactionFilterEditor.vue';
import LootEditor from './LootEditor.vue'; 
import QuestBlocksEditor from './QuestBlocksEditor.vue';
import InstalledComponentsEditor from './InstalledComponentsEditor.vue';
import BarrelsEditor from './BarrelsEditor.vue';
import EnginesEditor from './EnginesEditor.vue';
import ShipFeaturesEditor from './ShipFeaturesEditor.vue';
import ShipVisualEffectsEditor from './ShipVisualEffectsEditor.vue';
import LayoutInfo from './LayoutInfo.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  itemType: { type: Number, default: 0 },
  editorNote: { type: String, default: '' },
  showEditorNotes: { type: Boolean, default: true },
  originalId: { type: Number, default: null } 
});

const emit = defineEmits(['update:modelValue', 'update:editorNote']); 
const { getItemsByType } = useGameDatabase();
const { searchImageFile } = useFileSystem();
const { getTranslations } = useLocalization();
const imagePreviews = ref({});

// === SHIP STATS MODAL ===
const isShipStatsOpen = ref(false);
const globalShipSettings = ref({});

onMounted(() => {
  const settingsItems = getItemsByType(100);
  if (settingsItems && settingsItems.length > 0) {
    globalShipSettings.value = settingsItems[0].data;
  }
});

// === BLOCK COLLAPSING ===
const collapsedFields = ref({});
const toggleField = (key) => {
  collapsedFields.value[key] = !collapsedFields.value[key];
};

const schema = computed(() => itemSchemas[props.itemType] || defaultSchema);
const existingKeys = computed(() => Object.keys(props.modelValue || {}));
const allowedKeys = computed(() => Object.keys(schema.value.fields || {}));

const missingFields = computed(() => allowedKeys.value.filter(key => {
  const isPresent = existingKeys.value.includes(key);
  const fieldDef = schema.value.fields[key];
  if (isPresent || fieldDef?.locked || fieldDef?.hideInAdd) {
    return false;
  }
  return true;
}));

// === DUPLICATE ID CHECK ===
const isDuplicateId = computed(() => {
  if (props.modelValue.Id === undefined) return false;
  const currentId = props.modelValue.Id;
  
  if (currentId === props.originalId) return false;

  const items = getItemsByType(props.itemType);
  if (!items) return false;
  
  return items.some(i => i.id === currentId);
});

const formatNumberDisplay = (num) => {
  if (num === undefined || num === null) return '';
  return String(num).replace('.', ',');
};

const updateField = (key, value) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const updateNumberField = (key, rawValue) => {
  let num = parseFloat(String(rawValue).replace(',', '.'));
  const fieldDef = schema.value.fields?.[key];
  if (isNaN(num)) num = (fieldDef && fieldDef.min !== undefined) ? fieldDef.min : 0;
  if (fieldDef) {
    if (fieldDef.min !== undefined && num < fieldDef.min) num = fieldDef.min;
    if (fieldDef.max !== undefined && num > fieldDef.max) num = fieldDef.max;
  }
  updateField(key, num);
};

const updateVector = (key, axis, rawValue) => {
  let num = parseFloat(String(rawValue).replace(',', '.'));
  if (isNaN(num)) num = 0;
  const currentVector = props.modelValue[key] || { x: 0, y: 0 };
  updateField(key, { ...currentVector, [axis]: num });
};

const addField = (key) => {
  const fieldDef = schema.value.fields[key];
  let defVal = '';
  
  if (fieldDef.default !== undefined) defVal = fieldDef.default;
  else if (fieldDef.type === FieldType.NUMBER) defVal = fieldDef.min !== undefined ? fieldDef.min : 0;
  else if (fieldDef.type === FieldType.CHECKBOX) defVal = false;
  else if (fieldDef.type === FieldType.VECTOR) defVal = { x: 0, y: 0 };
  else if (fieldDef.type === FieldType.COLOR) defVal = '#ffffff';
  else if (fieldDef.type === FieldType.REFERENCE) defVal = 0;
  else if (fieldDef.type === FieldType.LAYOUT) defVal = "0";
  else if (fieldDef.type === FieldType.IMAGE) defVal = "";
  else if (fieldDef.type === FieldType.TAG_LIST) defVal = [];
  else if (fieldDef.type === FieldType.MOD_LIST) defVal = [];
  else if (fieldDef.type === FieldType.WEAPON_SLOTS) defVal = [];
  else if (fieldDef.type === FieldType.MUSIC_LIST) defVal = [];
  else if (fieldDef.type === FieldType.CHEAT_CODE_LIST) defVal = [];
  else if (fieldDef.type === FieldType.RESTRICTIONS) defVal = {};
  else if (fieldDef.type === FieldType.BEHAVIOR_TREE) defVal = { Type: 2, Nodes: [] };
  else if (fieldDef.type === FieldType.VISUAL_EFFECT_ELEMENTS) defVal = []; 
  else if (fieldDef.type === FieldType.JSON || fieldDef.type === FieldType.TEXT) defVal = "";
  else if (fieldDef.type === FieldType.AMMUNITION_BLOCK) {
      if (fieldDef.blockType === 'body' || fieldDef.blockType === 'controller') defVal = {};
      else defVal = []; 
  }
  else if (fieldDef.type === FieldType.FACTION_FILTER) defVal = { Type: 0, List: [] }; 
  else if (fieldDef.type === FieldType.LOOT_CONTENT) defVal = { Type: 0 }; 
  else if (fieldDef.type === FieldType.QUEST_BLOCK) {
      if (fieldDef.blockType === 'nodes') defVal = [];
      else defVal = {};
  }
  else if (fieldDef.type === FieldType.INSTALLED_COMPONENTS) defVal = [];
  else if (fieldDef.type === FieldType.BARRELS_LIST) defVal = [];
  else if (fieldDef.type === FieldType.ENGINES_LIST) defVal = [];
  else if (fieldDef.type === FieldType.SHIP_FEATURES) defVal = {};
  else if (fieldDef.type === FieldType.SHIP_VISUAL_EFFECTS) defVal = {};
  else if (fieldDef.type === FieldType.SHIP_PERKS) defVal = { Perk1: 0, Perk2: 0, Perk3: 0 }; 
  
  updateField(key, defVal);
  collapsedFields.value[key] = false;
};

const removeField = (key) => {
  const copy = { ...props.modelValue };
  delete copy[key];
  emit('update:modelValue', copy);
};

const isFullWidth = (key) => {
  const fieldDef = schema.value.fields?.[key];
  const type = fieldDef?.type;
  if (fieldDef?.fullWidth) return true;

  return type === FieldType.WEAPON_SLOTS || 
         type === FieldType.LAYOUT || 
         type === FieldType.MUSIC_LIST ||
         type === FieldType.CHEAT_CODE_LIST ||
         type === FieldType.BEHAVIOR_TREE ||
         type === FieldType.VISUAL_EFFECT_ELEMENTS ||
         type === FieldType.AMMUNITION_BLOCK ||
         type === FieldType.FACTION_FILTER ||
         type === FieldType.LOOT_CONTENT ||
         type === FieldType.QUEST_BLOCK ||
         type === FieldType.INSTALLED_COMPONENTS ||
         type === FieldType.BARRELS_LIST ||
         type === FieldType.ENGINES_LIST ||
         type === FieldType.SHIP_FEATURES ||
         type === FieldType.SHIP_VISUAL_EFFECTS ||
         type === FieldType.SHIP_PERKS ||
         type === FieldType.MOD_LIST ||
         type === FieldType.TAG_LIST; 
};

// === SMART FILE NAME DISPLAY ===
const getItemDisplayName = (item) => {
  if (!item) return 'Unknown';
  if (item.data) {
    if (item.data.Name) return item.data.Name;
    if (item.data.Description) return item.data.Description;
  }
  return item.name;
};

// === DYNAMIC TECH TARGET LOGIC ===
const getRefTargetType = (key, fieldDef, data) => {
  if (key === 'ItemId' && fieldDef.targetType === 'DYNAMIC_TECH') {
    const techType = data.Type ?? 0;
    if (techType === 0) return 1; // Component
    if (techType === 1) return 6; // Ship
    if (techType === 2) return 7; // Satellite
  }
  return fieldDef.targetType;
};

// === TAG AND REFERENCE LOGIC ===
const addToArray = (key, value) => {
  const currentArray = props.modelValue[key] ? [...props.modelValue[key]] : [];
  if (!currentArray.includes(value)) {
    currentArray.push(value);
    updateField(key, currentArray);
  }
};
const removeFromArray = (key, index) => {
  const currentArray = [...props.modelValue[key]];
  currentArray.splice(index, 1);
  updateField(key, currentArray);
};
const sortTagList = (key) => {
  const currentArray = props.modelValue[key];
  if (Array.isArray(currentArray)) {
    const sorted = [...currentArray].sort((a, b) => Number(a) - Number(b));
    updateField(key, sorted);
  }
};

const getNameForTag = (typeId, itemId) => {
  const list = getItemsByType(typeId);
  const item = list?.find(i => i.id === itemId);
  return item ? getItemDisplayName(item) : `Unknown #${itemId}`;
};

const getModDetails = (typeId, itemId) => {
  const list = getItemsByType(typeId);
  const item = list?.find(i => i.id === itemId);
  return item?.data || null; 
};

const formatModValues = (mod) => {
  const typeName = SelectOptions.StatModificationType?.[mod.Type] || `Type ${mod.Type}`;
  const vals = [
    mod.Gray3,
    mod.Gray2,
    mod.Gray1,
    mod.Green,
    mod.Purple,
    mod.Gold
  ].map(v => formatNumberDisplay(v || 0));
  return `${typeName}: [${vals.join(' | ')}]`;
};

// === MOD_LIST LOGIC ===
const addMod = (key) => {
  const currentMods = props.modelValue[key] ? [...props.modelValue[key]] : [];
  currentMods.push({ Type: 0, Gray3: 0, Gray2: 0, Gray1: 0, Green: 0, Purple: 0, Gold: 0 });
  updateField(key, currentMods);
};
const removeMod = (key, index) => {
  const currentMods = [...props.modelValue[key]];
  currentMods.splice(index, 1);
  updateField(key, currentMods);
};
const updateModType = (key, index, newType) => {
  const currentMods = [...props.modelValue[key]];
  currentMods[index] = { ...currentMods[index], Type: Number(newType) };
  updateField(key, currentMods);
};
const updateModValue = (key, modIndex, qualityKey, rawValue) => {
  let valStr = String(rawValue).replace(',', '.');
  let valNum = parseFloat(valStr);
  if (isNaN(valNum)) valNum = 0;
  const currentMods = [...props.modelValue[key]];
  currentMods[modIndex] = { ...currentMods[modIndex], [qualityKey]: valNum };
  updateField(key, currentMods);
};

const toHtmlColor = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  if (hex.startsWith('#') && hex.length === 9) return '#' + hex.substring(3);
  return hex;
};
const fromHtmlColor = (htmlHex) => '#FF' + htmlHex.substring(1);

const globSprites = import.meta.glob([
  '/public/sprites/**/*.{png,jpg,jpeg}',
  '/src/sprites/**/*.{png,jpg,jpeg}',
  '/src/assets/sprites/**/*.{png,jpg,jpeg}'
], { eager: true, query: '?url' });

const allLocalSprites = {};
for (const path in globSprites) {
  if (path.startsWith('/public/')) {
    allLocalSprites[path] = import.meta.env.BASE_URL + path.replace('/public/', ''); 
  } else {
    allLocalSprites[path] = globSprites[path].default || globSprites[path];
  }
}

// UPDATED IMAGE LOADING LOGIC
const resolveImageUrl = async (fileName, fieldName, currentItemType) => {
  if (!fileName) return null;
  
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(fileName);
  
  if (hasExtension && typeof searchImageFile === 'function') {
    const handle = searchImageFile(fileName);
    if (handle) {
      try {
        if (handle.kind === 'native') {
          const result = await Filesystem.getUri({ path: handle.path, directory: Directory.Documents });
          return Capacitor.convertFileSrc(result.uri);
        } else if (handle.getFile) {
          const file = await handle.getFile();
          return URL.createObjectURL(file);
        }
      } catch (e) {
        console.error("Error loading image in editor:", e);
      }
    }
  }

  const nameToFind = fileName.includes('.') ? fileName : `${fileName}.png`;
  const nameLower = nameToFind.toLowerCase();
  let foundKey = null;

  if (currentItemType === 6) {
    if (fieldName === 'ModelImage' || fieldName === 'Image') {
      foundKey = Object.keys(allLocalSprites).find(key => 
        key.toLowerCase().includes('/ships/') && key.toLowerCase().endsWith(`/${nameLower}`)
      );
    } else if (fieldName === 'IconImage') {
      foundKey = Object.keys(allLocalSprites).find(key => 
        key.toLowerCase().includes('/shipicons/') && key.toLowerCase().endsWith(`/${nameLower}`)
      );
    }
  }

  if (!foundKey) foundKey = Object.keys(allLocalSprites).find(key => key.toLowerCase().endsWith(`/${nameLower}`));
  
  return foundKey ? allLocalSprites[foundKey] : null;
};
// === TAG IMAGE LOADING LOGIC ===
const tagImagesCache = ref({});

const loadTagImage = async (targetType, itemId) => {
  const cacheKey = `${targetType}_${itemId}`;
  if (tagImagesCache.value[cacheKey] !== undefined) return; 

  tagImagesCache.value[cacheKey] = null; 

  const item = getItemsByType(targetType)?.find(i => i.id === itemId);
  if (!item || !item.data) return;

  let imgName = null;
  let checkType = targetType;

  if (targetType === 10) {

    const techType = item.data.Type ?? 0;
    const targetTargetId = item.data.ItemId;
    let unlockType = 1; // Component by default
    if (techType === 1) unlockType = 6; // Ship
    else if (techType === 2) unlockType = 7; // Satellite

    const unlockedItem = getItemsByType(unlockType)?.find(i => i.id === targetTargetId);
    if (unlockedItem && unlockedItem.data) {
      imgName = unlockedItem.data.IconImage || unlockedItem.data.ModelImage || unlockedItem.data.Icon || unlockedItem.data.Image;
      checkType = unlockType;
    }
    
    if (!imgName) imgName = 'tech_icon';
  } else {
    imgName = item.data.IconImage || item.data.ModelImage || item.data.Icon || item.data.Image || item.data.ControlButtonIcon;
  }

  if (imgName) {
    const url = await resolveImageUrl(imgName, checkType === 6 ? 'IconImage' : '', checkType);
    tagImagesCache.value[cacheKey] = url;
  }
};

watch(() => props.modelValue, async (newVal) => {
  if (!schema.value.fields) return;

  if (props.itemType === 14) {
    if (!imagePreviews.value['tech_icon']) imagePreviews.value['tech_icon'] = await resolveImageUrl('tech_icon', 'tech_icon', 14);
    if (!imagePreviews.value['star_icon']) imagePreviews.value['star_icon'] = await resolveImageUrl('star_icon', 'star_icon', 14);
  }

  for (const [key, val] of Object.entries(newVal)) {
    const fieldDef = schema.value.fields[key];
    
    if (fieldDef && fieldDef.type === FieldType.IMAGE) {
      imagePreviews.value[key] = await resolveImageUrl(val, key, props.itemType);
    }
    

    if (fieldDef && fieldDef.type === FieldType.TAG_LIST && Array.isArray(val)) {
      val.forEach(itemId => loadTagImage(fieldDef.targetType, itemId));
    }
  }
}, { deep: true, immediate: true });
</script>

<template>
  <div class="editor-layout">
    
    <div class="editor-header">
      <div class="title-row">
        <h3>{{ schema.title }}</h3>
        <span class="type-badge">ID: {{ ItemTypeNames[itemType] || itemType }}</span>
      </div>
      
      <div class="header-actions" v-if="itemType === 6">
        <button @click="isShipStatsOpen = true" class="btn-stats" title="Calculate Ship Statistics">📊 Ship Stats</button>
      </div>
    </div>

    <div class="properties-list">
      <div v-if="showEditorNotes" class="property-row full-width-block note-block">
        <div class="prop-label">
          <div class="label-header">
            <span class="label-text">📝 Editor Note</span>
          </div>
          <span class="tech-name" style="color: #ffaa00;">Local XML Only</span>
        </div>
        <div class="prop-value">
          <textarea 
            :value="editorNote" 
            @input="$emit('update:editorNote', $event.target.value)" 
            class="win-input note-textarea" 
            placeholder="Write a custom note for this item... (Will be saved in EditorNotes.xml)"
          ></textarea>
        </div>
      </div>

      <div 
        v-for="(val, key) in modelValue" 
        :key="key" 
        class="property-row" 
        :class="{ 
          'full-width-block': isFullWidth(key), 
          'is-collapsed': isFullWidth(key) && collapsedFields[key] 
        }"
      >
        <div class="prop-label" :class="{ 'clickable-label': isFullWidth(key) }" @click="isFullWidth(key) && toggleField(key)">
          <div class="label-header">
            <span v-if="isFullWidth(key)" class="collapse-icon">
              {{ collapsedFields[key] ? '▶' : '▼' }}
            </span>
            <span class="label-text">{{ schema.fields?.[key]?.label || key }}</span>
          </div>
          <span v-if="schema.fields?.[key]?.label !== key" class="tech-name">{{ key }}</span>
        </div>

        <div class="prop-value" v-show="!(isFullWidth(key) && collapsedFields[key])">
          <div v-if="key === 'ItemType'" class="read-only-text">
            {{ ItemTypeNames[val] || val }} <span class="dimmed">({{ val }})</span>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.QUEST_BLOCK" class="full-group">
            <QuestBlocksEditor :modelValue="val" :mode="schema.fields[key].blockType" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.SHIP_PERKS" class="full-group perks-container">
            <div class="perk-col">
                <label>Perk 1</label>
                <select :value="val?.Perk1 || 0" @change="e => updateField(key, { ...(val || {}), Perk1: Number(e.target.value) })" class="win-input">
                  <option v-for="(opt, idx) in SelectOptions.ShipPerkType" :key="idx" :value="idx">{{ opt }}</option>
                </select>
            </div>
            <div class="perk-col">
                <label>Perk 2</label>
                <select :value="val?.Perk2 || 0" @change="e => updateField(key, { ...(val || {}), Perk2: Number(e.target.value) })" class="win-input">
                  <option v-for="(opt, idx) in SelectOptions.ShipPerkType" :key="idx" :value="idx">{{ opt }}</option>
                </select>
            </div>
            <div class="perk-col">
                <label>Perk 3</label>
                <select :value="val?.Perk3 || 0" @change="e => updateField(key, { ...(val || {}), Perk3: Number(e.target.value) })" class="win-input">
                  <option v-for="(opt, idx) in SelectOptions.ShipPerkType" :key="idx" :value="idx">{{ opt }}</option>
                </select>
            </div>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.IMAGE" class="image-group">
            <div class="image-input-row">
                <input type="text" :value="val" @input="e => updateField(key, e.target.value)" class="win-input" placeholder="Sprite">
            </div>
            <div v-if="imagePreviews[key]" class="image-preview-box">
                <div class="image-stack">
                  <img :src="imagePreviews[key]" class="base-image" alt="Preview" @error="(e) => e.target.style.display='none'" @load="(e) => e.target.style.display='block'"/>
                  <div v-if="modelValue.Color" class="tint-layer" :style="{ backgroundColor: toHtmlColor(modelValue.Color), maskImage: `url('${imagePreviews[key]}')`, WebkitMaskImage: `url('${imagePreviews[key]}')` }"></div>
                </div>
            </div>
            <div v-else-if="val" class="image-not-found">No Image Found</div>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.LAYOUT" class="layout-group">
            <LayoutEditor :modelValue="val" :cellType="modelValue['CellType']" :isShipLayout="itemType === 6" :backgroundImage="imagePreviews['ModelImage']" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.BEHAVIOR_TREE" class="full-group">
            <BehaviorTreeEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.VISUAL_EFFECT_ELEMENTS" class="full-group">
            <VisualEffectEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.RESTRICTIONS" class="full-group">
            <RestrictionsEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.WEAPON_SLOTS" class="full-group">
            <WeaponSlotsEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.MUSIC_LIST" class="full-group">
            <MusicListEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.CHEAT_CODE_LIST" class="full-group">
            <CheatCodesEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.TAG_LIST" class="tag-group">
            <div class="tags-container vertical-list">
              
              <template v-if="schema.fields[key].targetType === 12">
                <div v-for="(itemId, idx) in val" :key="idx" class="mod-ext-card">
                  <div class="mod-ext-header">
                    <span class="mod-ext-title">{{ getNameForTag(12, itemId) }}</span>
                    <span class="tag-id">#{{ itemId }}</span>
                    <button @click="removeFromArray(key, idx)" class="tag-remove">×</button>
                  </div>
                  <div class="mod-ext-body" v-if="getModDetails(12, itemId)?.Modifications?.length">
                    <div v-for="(m, mIdx) in getModDetails(12, itemId).Modifications" :key="mIdx" class="mod-ext-stat">
                       • {{ formatModValues(m) }}
                    </div>
                  </div>
                  <div class="mod-ext-body" v-else-if="!getModDetails(12, itemId)">
                    <span class="mod-ext-stat" style="opacity:0.5; font-style:italic;">Data not loaded...</span>
                  </div>
                </div>
              </template>

              <template v-else>
                <div v-for="(itemId, idx) in val" :key="idx" class="tag-item">
                  <div class="tag-left">
                     <img v-if="tagImagesCache[`${schema.fields[key].targetType}_${itemId}`]" 
                          :src="tagImagesCache[`${schema.fields[key].targetType}_${itemId}`]" 
                          class="tag-thumb" />
                     <span class="tag-text">{{ getNameForTag(schema.fields[key].targetType, itemId) }}</span>
                     <span class="tag-id">#{{ itemId }}</span>
                  </div>
                  <button @click="removeFromArray(key, idx)" class="tag-remove">×</button>
                </div>
              </template>

              <div v-if="!val || val.length === 0" class="no-tags">Empty</div>
            </div>
            
            <div class="tag-add-row">
              <select class="win-input add-select" @change="e => { addToArray(key, Number(e.target.value)); e.target.value = ''; }">
                <option value="" disabled selected>+ Add...</option>
                <option v-for="item in getItemsByType(schema.fields[key].targetType)" :key="item.id" :value="item.id">
                   [ID: {{ item.id }}] {{ getItemDisplayName(item) }} — 📂 {{ item.filePath }}
                </option>
              </select>
              <button v-if="val && val.length > 1" @click="sortTagList(key)" class="btn-control sort-btn" title="Sort by ID">
                  Sort ID
              </button>
            </div>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.MOD_LIST" class="mod-list-group">
            <div v-for="(mod, index) in val" :key="index" class="mod-item-card">
              <div class="mod-header">
                <select :value="mod.Type" @change="e => updateModType(key, index, e.target.value)" class="win-input mod-select">
                  <option v-for="(opt, idx) in SelectOptions.StatModificationType" :key="idx" :value="idx">{{ opt }}</option>
                </select>
                <button @click="removeMod(key, index)" class="btn-remove-mod">Del</button>
              </div>
              <div class="quality-list">
                <div v-for="qDef in QualityDefinition" :key="qDef.key" class="quality-row" :class="'q-' + qDef.key">
                  <label class="quality-label">{{ qDef.label }}</label>
                  <input type="text" inputmode="decimal" :value="formatNumberDisplay(mod[qDef.key])" @change="e => updateModValue(key, index, qDef.key, e.target.value)" class="win-input q-input">
                </div>
              </div>
            </div>
            <button @click="addMod(key)" class="btn-add-mod">+ Add Mod</button>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.TEXT || schema.fields?.[key]?.type === FieldType.JSON || !schema.fields?.[key]?.type" class="text-input-group" style="width: 100%;">
             <input type="text" :value="typeof val === 'object' ? JSON.stringify(val) : val" @input="e => updateField(key, e.target.value)" class="win-input">
             <div v-if="typeof val === 'string' && val.startsWith('$') && getTranslations(val).length > 0" class="localization-box">
                <div v-for="(trans, tIdx) in getTranslations(val)" :key="tIdx" class="loc-item">
                  <span class="loc-file">{{ trans.file }}:</span>
                  <span class="loc-text">{{ trans.text }}</span>
                </div>
             </div>
             <div v-else-if="typeof val === 'string' && val.startsWith('$')" class="localization-box empty">No translation found</div>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.REFERENCE" class="ref-group">
            <input 
              type="number" 
              :value="val" 
              @input="e => updateField(key, typeof val === 'string' ? e.target.value : Number(e.target.value))" 
              class="win-input ref-input"
              title="Manual ID Input"
            >
            <select :value="val" @change="e => updateField(key, typeof val === 'string' ? e.target.value : Number(e.target.value))" class="win-input ref-select">
              <option :value="0">[NONE]</option>
              <option v-if="val !== 0 && !getItemsByType(getRefTargetType(key, schema.fields[key], modelValue))?.some(i => i.id === val)" :value="val">
                ID: {{ val }} (Not Found)
              </option>
              <option v-for="item in getItemsByType(getRefTargetType(key, schema.fields[key], modelValue))" :key="item.id" :value="item.id">
                [ID: {{ item.id }}] {{ getItemDisplayName(item) }} — 📂 {{ item.filePath }}
              </option>
            </select>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.VECTOR" class="vector-group">
            <div class="vec-item">
              <span class="vec-label">X</span>
              <input type="text" inputmode="decimal" :value="formatNumberDisplay(val?.x)" @change="e => { updateVector(key, 'x', e.target.value); e.target.value = formatNumberDisplay(props.modelValue[key]?.x); }" class="win-input">
            </div>
            <div class="vec-item">
              <span class="vec-label">Y</span>
              <input type="text" inputmode="decimal" :value="formatNumberDisplay(val?.y)" @change="e => { updateVector(key, 'y', e.target.value); e.target.value = formatNumberDisplay(props.modelValue[key]?.y); }" class="win-input">
            </div>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.COLOR" class="color-group">
            <input type="color" :value="toHtmlColor(val)" @input="e => updateField(key, fromHtmlColor(e.target.value))" class="color-picker">
            <input type="text" :value="val" @input="e => updateField(key, e.target.value)" class="win-input color-text">
          </div>

          <select v-else-if="schema.fields?.[key]?.type === FieldType.SELECT" :value="val" @change="e => updateField(key, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))" class="win-input">
            <template v-if="Array.isArray(schema.fields[key].options)">
                <option v-for="(opt, idx) in schema.fields[key].options" :key="opt" :value="idx">{{ idx }} - {{ opt }}</option>
             </template>
             <template v-else>
                <option v-for="(label, valKey) in schema.fields[key].options" :key="valKey" :value="Number(valKey)">{{ label }}</option>
             </template>
          </select>

          <div v-else-if="typeof val === 'boolean' || schema.fields?.[key]?.type === FieldType.CHECKBOX" class="checkbox-group">
            <label class="toggle-switch">
              <input type="checkbox" :checked="!!val" @change="e => updateField(key, e.target.checked)">
              <span class="slider"></span>
            </label>
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.AMMUNITION_BLOCK" class="full-group">
            <AmmunitionBlocksEditor :modelValue="val" :mode="schema.fields[key].blockType" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.FACTION_FILTER" class="full-group">
            <FactionFilterEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.LOOT_CONTENT" class="full-group">
            <LootEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.INSTALLED_COMPONENTS" class="full-group">
            <InstalledComponentsEditor :modelValue="val" :parentData="props.modelValue" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.BARRELS_LIST" class="full-group">
            <BarrelsEditor :modelValue="val" :backgroundImage="imagePreviews['ModelImage']" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.ENGINES_LIST" class="full-group">
            <EnginesEditor :modelValue="val" :backgroundImage="imagePreviews['ModelImage']" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.SHIP_FEATURES" class="full-group">
            <ShipFeaturesEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="schema.fields?.[key]?.type === FieldType.SHIP_VISUAL_EFFECTS" class="full-group">
            <ShipVisualEffectsEditor :modelValue="val" @update:modelValue="v => updateField(key, v)" />
          </div>

          <div v-else-if="typeof val === 'number' || schema.fields?.[key]?.type === FieldType.NUMBER" class="input-with-warning">
             <input type="text" 
                    inputmode="decimal"
                    :value="formatNumberDisplay(val)" 
                    @change="e => { updateNumberField(key, e.target.value); e.target.value = formatNumberDisplay(props.modelValue[key]); }" 
                    class="win-input"
                    :class="{ 'input-error': key === 'Id' && isDuplicateId }">
             
             <div v-if="key === 'Id' && isDuplicateId" class="id-warning">
                ⚠️ ID {{ val }} is already used in another file!
             </div>
          </div>

        </div>

        <button v-if="!schema.fields?.[key]?.locked && key !== 'ItemType'" @click.stop="removeField(key)" class="btn-delete" title="Delete">×</button>
      </div>
    </div>

    <div v-if="missingFields.length > 0" class="missing-panel">
      <div class="missing-header">Add Property:</div>
      <div class="chips-wrapper">
        <button v-for="key in missingFields" :key="key" @click="addField(key)" class="chip-add">+ {{ schema.fields[key].label }}</button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isShipStatsOpen" class="modal-backdrop" @click.self="isShipStatsOpen = false">
          <div class="modal-window stats-modal">
            
            <div class="modal-header">
              <div class="modal-title">Ship Statistics</div>
              <div class="modal-actions">
                <button @click="isShipStatsOpen = false" class="btn-close">Close</button>
              </div>
            </div>

            <div class="modal-body stats-modal-body">
              <LayoutInfo 
                :layout="modelValue.Layout" 
                :shipData="modelValue" 
                :shipSettings="globalShipSettings" 
              />
            </div>
            
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.editor-layout { padding: 20px 25px; color: var(--text-primary); font-size: 13px; }
.editor-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid transparent; }
.title-row { display: flex; align-items: center; gap: 10px; }
.title-row h3 { margin: 0; font-size: 18px; font-weight: 600; }
.type-badge { background: #444; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 11px; }


.header-actions { display: flex; align-items: center; }
.btn-stats { background: rgba(85, 170, 255, 0.1); color: #55aaff; border: 1px solid #55aaff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s; display: flex; align-items: center; gap: 6px;}
.btn-stats:hover { background: #55aaff; color: white; box-shadow: 0 0 8px rgba(85, 170, 255, 0.4);}


.modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.stats-modal { width: 95vw; max-width: 600px; height: auto; max-height: 90vh; background: var(--app-bg, #1e1e1e); border-radius: 12px; display: flex; flex-direction: column; border: 1px solid var(--border-light); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
.modal-header { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--border-light); background: var(--sidebar-bg, #252526); }
.modal-title { font-weight: bold; font-size: 16px; color: var(--accent-color); text-transform: uppercase; }
.btn-close { background: rgba(255, 255, 255, 0.1); color: var(--text-primary); border: 1px solid var(--border-light); padding: 6px 16px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
.btn-close:hover { background: rgba(255, 255, 255, 0.2); }
.stats-modal-body { padding: 15px; overflow-y: auto; background: #1a1a1a; }

.properties-list { display: flex; flex-direction: column; gap: 10px; }

.property-row { 
  display: flex; align-items: flex-start; padding: 12px 15px; 
  background: var(--sidebar-bg); border: 1px solid var(--border-light); 
  border-radius: 12px; position: relative; transition: all 0.2s ease; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
}
.property-row:hover { background: rgba(255, 255, 255, 0.05); border-color: var(--accent-color); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

.property-row.full-width-block { flex-direction: column; gap: 10px; }
.property-row.full-width-block .prop-label { 
  width: 100%; max-width: none; border-bottom: 1px solid var(--border-light); 
  padding-bottom: 5px; margin-bottom: 5px; 
}
.property-row.full-width-block .prop-value { width: 100%; }

.property-row.full-width-block.is-collapsed { gap: 0; }
.property-row.full-width-block.is-collapsed .prop-label { 
  border-bottom: none; padding-bottom: 0; margin-bottom: 0; 
}

.prop-label { 
  width: 40%; min-width: 150px; max-width: 250px; padding-right: 15px; 
  display: flex; flex-direction: column; justify-content: flex-start; padding-top: 5px; 
}
.clickable-label { cursor: pointer; user-select: none; transition: opacity 0.2s; }
.clickable-label:hover { opacity: 0.8; }
.clickable-label:hover .label-text { color: var(--accent-color); }

.label-header { display: flex; align-items: center; gap: 6px; }
.label-text { font-weight: 600; font-size: 13px; }
.collapse-icon { font-size: 10px; color: var(--accent-color); font-family: monospace; transition: transform 0.2s; }
.tech-name { font-size: 10px; color: var(--text-secondary); opacity: 0.6; font-family: monospace; margin-top: 2px; }

.prop-value { flex: 1; display: flex; align-items: center; width: 100%; }
.full-group { width: 100%; }

.perks-container { display: flex; gap: 15px; width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); }
.perk-col { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.perk-col label { font-size: 11px; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; }

.read-only-text { font-weight: bold; color: var(--accent-color); font-size: 14px; }
.dimmed { color: var(--text-secondary); font-weight: normal; font-size: 12px; margin-left: 5px; opacity: 0.7; }

.win-input { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid transparent; color: var(--text-primary); padding: 6px 10px; border-radius: 6px; font-family: inherit; transition: all 0.2s; box-sizing: border-box; }
.win-input:hover { background: rgba(0,0,0,0.3); }
.win-input:focus { background: var(--app-bg); border-color: var(--accent-color); outline: none; }

.mod-list-group { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.mod-item-card { background: rgba(0,0,0,0.15); border: 1px solid var(--border-light); border-radius: 8px; padding: 10px; }
.mod-header { display: flex; justify-content: space-between; margin-bottom: 8px; gap: 10px; }
.mod-select { font-weight: bold; flex: 1; }
.btn-remove-mod { background: rgba(255, 50, 50, 0.1); color: #ff5555; border: 1px solid rgba(255, 50, 50, 0.3); border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 11px; }
.btn-remove-mod:hover { background: #ff5555; color: white; }
.quality-list { display: flex; flex-direction: column; gap: 6px; }
.quality-row { display: flex; align-items: center; gap: 10px; }
.quality-label { width: 80px; font-size: 11px; text-align: right; opacity: 0.8; white-space: nowrap; }
.q-input { flex: 1; font-family: monospace; }
.q-Green .quality-label { color: #44ff44; font-weight: bold; }
.q-Purple .quality-label { color: #aa44ff; font-weight: bold; }
.q-Gold .quality-label { color: #ffaa00; font-weight: bold; }
.btn-add-mod { background: transparent; border: 1px dashed var(--accent-color); color: var(--accent-color); border-radius: 6px; padding: 8px; cursor: pointer; width: 100%; transition: all 0.2s; }
.btn-add-mod:hover { background: rgba(var(--accent-color), 0.1); }

.tag-group { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; background: rgba(0,0,0,0.1); padding: 5px; border-radius: 6px; min-height: 34px; }
.tag-add-row { display: flex; gap: 10px; width: 100%; align-items: center; }
.add-select { flex: 1; border-style: dashed; opacity: 0.8; }
.add-select:hover { opacity: 1; border-style: solid; }
.btn-control { padding: 6px 12px; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 11px; text-transform: uppercase; font-weight: bold; height: 30px; box-sizing: border-box; }
.btn-control:hover { background: rgba(255,255,255,0.1); color: white; }
.sort-btn { flex: 0 0 auto; width: auto; }

.mod-ext-card {
  background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); border-left: 3px solid var(--accent-color);
  border-radius: 6px; padding: 8px 12px; width: 100%; display: flex; flex-direction: column; gap: 6px; box-sizing: border-box;
}
.mod-ext-header {
  display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 6px; gap: 10px;
}
.mod-ext-title { font-weight: bold; color: var(--accent-color); font-size: 13px; flex: 1; }
.mod-ext-body { display: flex; flex-direction: column; gap: 4px; padding-top: 4px;}
.mod-ext-stat { font-family: monospace; font-size: 11px; color: var(--text-primary); opacity: 0.9; }

/* === TAG ITEM THUMBNAIL STYLES === */
.tags-container.vertical-list { flex-direction: column; gap: 4px; background: transparent; padding: 0; }
.tags-container.vertical-list .tag-item { 
  background: rgba(255, 255, 255, 0.05); 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  color: var(--text-primary); 
  box-shadow: none; 
  justify-content: space-between; 
  padding: 6px 10px; 
  display: flex; 
  align-items: center;
  border-radius: 6px;
}
.tags-container.vertical-list .tag-item:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); transform: none; }
.tag-left { display: flex; align-items: center; gap: 8px; }
.tag-thumb { width: 22px; height: 22px; object-fit: contain; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); }

.tags-container.vertical-list .tag-id { color: var(--text-secondary); opacity: 0.5; }
.tags-container.vertical-list .tag-remove { color: var(--text-secondary); opacity: 0.6; background: transparent; border: none; font-size: 16px; cursor: pointer; }
.tags-container.vertical-list .tag-remove:hover { color: #ff5555; opacity: 1; }


.image-group { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.image-input-row { width: 100%; }
.image-preview-box { background: rgba(0, 0, 0, 0.2); border-radius: 6px; padding: 10px; display: flex; justify-content: center; align-items: center; border: 1px solid var(--border-light); min-height: 40px; }
.image-stack { position: relative; display: inline-block; }
.base-image { display: block; max-width: 100%; max-height: 100px; object-fit: contain; }
.tint-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; -webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; mix-blend-mode: multiply; opacity: 1; pointer-events: none; }
.image-not-found { font-size: 11px; color: var(--text-secondary); opacity: 0.5; padding-left: 5px; }

.localization-box { margin-top: 6px; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-light); border-radius: 6px; padding: 8px; font-size: 12px; max-height: 150px; overflow-y: auto; }
.localization-box.empty { color: #ffaa00; font-style: italic; opacity: 0.7; }
.loc-item { display: flex; flex-direction: column; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; }
.loc-item:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
.loc-file { font-size: 10px; color: var(--accent-color); font-weight: bold; opacity: 0.8; margin-bottom: 2px; }
.loc-text { color: var(--text-primary); white-space: pre-wrap; line-height: 1.3; }

.layout-group { width: 100%; }
.vector-group, .color-group { display: flex; gap: 10px; width: 100%; align-items: center; }
.vec-item { display: flex; align-items: center; gap: 8px; flex: 1; }
.vec-label { font-size: 11px; font-weight: bold; opacity: 0.5; }
.color-picker { width: 28px; height: 28px; border: none; background: none; cursor: pointer; padding: 0; border-radius: 50%; overflow: hidden; }
.color-text { font-family: monospace; }

.ref-group { width: 100%; display: flex; align-items: center; gap: 10px; }
.ref-input { width: 80px; flex-shrink: 0; text-align: center; font-family: monospace; font-size: 13px; font-weight: bold; color: var(--accent-color); }
.ref-select { flex: 1; }

.toggle-switch { position: relative; display: inline-block; width: 34px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--accent-color); }
input:checked + .slider:before { transform: translateX(14px); }

.btn-delete { 
  position: absolute; right: -25px; top: 50%; transform: translateY(-50%); 
  background: rgba(255, 50, 50, 0.1); color: #ff5555; border: none; width: 24px; height: 24px; 
  border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; 
  opacity: 0; transition: all 0.2s; 
}
.property-row:hover .btn-delete { opacity: 1; }
.btn-delete:hover { background: #ff5555; color: white; }

.property-row.full-width-block .btn-delete {
  top: 15px; right: 15px; transform: none; opacity: 0.2; 
}
.property-row.full-width-block:hover .btn-delete { opacity: 1; }

.missing-panel { margin-top: 30px; padding: 20px; border: 1px dashed var(--border-light); border-radius: 12px; background: rgba(255, 255, 255, 0.02); }
.missing-header { margin-bottom: 12px; font-weight: 600; opacity: 0.8; }
.chips-wrapper { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-add { background: transparent; border: 1px solid var(--border-light); color: var(--text-secondary); padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.chip-add:hover { border-color: var(--accent-color); color: var(--accent-color); background: rgba(var(--accent-color), 0.05); }

.note-block { border-left: 3px solid #ffaa00 !important; background: rgba(255, 170, 0, 0.05) !important; }
.note-textarea { width: 100%; min-height: 60px; resize: vertical; font-family: inherit; font-size: 13px; line-height: 1.4; padding: 10px; }
.input-with-warning { width: 100%; position: relative; display: flex; flex-direction: column; gap: 4px; }
.input-error { border-color: #ff5555 !important; color: #ffaa00 !important; background: rgba(255, 85, 85, 0.1) !important; font-weight: bold; }
.id-warning { font-size: 11px; color: #ff5555; font-weight: bold; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; border-left: 2px solid #ff5555; animation: pulse 1s infinite alternate; }

@keyframes pulse {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

@media (max-width: 600px) {
  .editor-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .property-row { padding: 10px; }
  .label-text { font-size: 14px; }
  .property-row.full-width-block .prop-label { width: 100%; }
  .ref-group { flex-direction: column; align-items: flex-start; gap: 5px; }
  .ref-input, .ref-select { width: 100% !important; box-sizing: border-box; }
}
</style>