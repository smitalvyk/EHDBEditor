<script setup>
import { computed, ref, watch } from 'vue';
import { ItemTypeNames } from '../data/enums'; 
import { useFileSystem } from '../composables/useFileSystem';
import { useEditorNotes } from '../composables/useEditorNotes'; 
import { useGameDatabase } from '../composables/useGameDatabase';

// ADDED FOR ANDROID (CAPACITOR)
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const props = defineProps({
  content: { type: String, required: true },
  fileName: { type: String, default: 'Unknown File' },
  showEditorNotes: { type: Boolean, default: true }
});

const { searchImageFile } = useFileSystem();
const { getNote } = useEditorNotes(); 
const { getItemsByType } = useGameDatabase(); 

// Parse JSON data
const parsedData = computed(() => {
  if (!props.content) return null;
  try {
    return JSON.parse(props.content);
  } catch {
    return null;
  }
});

// Auto-fetch editor note for the current file
const editorNote = computed(() => {
  if (!parsedData.value || parsedData.value.ItemType === undefined || parsedData.value.Id === undefined) return '';
  return getNote(parsedData.value.ItemType, parsedData.value.Id);
});

// Search images in local built-in database
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

const iconUrl = ref(null);
const modelUrl = ref(null);
const techFactionColor = ref(null);

// Image loading logic
const resolveImage = async (fileName, itemType, isIconDir = false) => {
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
        console.error("Error loading image in preview card:", e);
      }
    }
  }
  const nameLower = fileName.includes('.') ? fileName.toLowerCase() : `${fileName.toLowerCase()}.png`;
  let foundKey = null;

  if (itemType === 6) { 
    if (isIconDir) {
      foundKey = Object.keys(allLocalSprites).find(key => key.toLowerCase().includes('/shipicons/') && key.toLowerCase().endsWith(`/${nameLower}`));
    } else {
      foundKey = Object.keys(allLocalSprites).find(key => key.toLowerCase().includes('/ships/') && key.toLowerCase().endsWith(`/${nameLower}`));
    }
  }

  if (!foundKey) {
    foundKey = Object.keys(allLocalSprites).find(key => key.toLowerCase().endsWith(`/${nameLower}`));
  }
  
  return foundKey ? allLocalSprites[foundKey] : null;
};


watch(() => parsedData.value, async (newVal) => {
  iconUrl.value = null;
  modelUrl.value = null;
  techFactionColor.value = null;
  
  if (newVal) {
    const typeId = Number(newVal.ItemType);

    if (typeId === 6) {
      if (newVal.IconImage) iconUrl.value = await resolveImage(newVal.IconImage, 6, true);
      if (newVal.ModelImage) modelUrl.value = await resolveImage(newVal.ModelImage, 6, false);
    } 
    else if (typeId === 8 && newVal.ShipId !== undefined) {
      const shipsList = getItemsByType(6); 
      const parentShip = shipsList?.find(s => s.id === newVal.ShipId);
      
      if (parentShip && parentShip.data) {
        if (parentShip.data.IconImage) iconUrl.value = await resolveImage(parentShip.data.IconImage, 6, true);
        if (parentShip.data.ModelImage) modelUrl.value = await resolveImage(parentShip.data.ModelImage, 6, false);
      }
    }
    else if (typeId === 14) {
      iconUrl.value = await resolveImage('star_icon', 14, false);
    }
    else if (typeId === 10) {

      iconUrl.value = await resolveImage('tech_icon', 10, false);
      

      if (newVal.Faction !== undefined && newVal.Faction !== null) {
        const factionsList = getItemsByType(14);
        const factionObj = factionsList?.find(f => f.id === newVal.Faction);
        if (factionObj && factionObj.data && factionObj.data.Color) {
          techFactionColor.value = factionObj.data.Color;
        }
      }
      

      const techType = newVal.Type ?? 0;
      const targetItemId = newVal.ItemId;
      
      if (targetItemId !== undefined && targetItemId !== null) {
        let targetItemType = 1; 
        if (techType === 1) targetItemType = 6; 
        else if (techType === 2) targetItemType = 7; 
        
        const targetList = getItemsByType(targetItemType);
        const targetItem = targetList?.find(i => i.id === targetItemId);
        
        if (targetItem && targetItem.data) {
          let imgName = targetItem.data.Icon || targetItem.data.ModelImage || targetItem.data.Image;
          if (targetItemType === 6) {
            imgName = targetItem.data.IconImage || targetItem.data.ModelImage;
            modelUrl.value = await resolveImage(imgName, 6, true);
          } else {
            modelUrl.value = await resolveImage(imgName, targetItemType, false);
          }
        }
      }
    }
    else {
      const imgName = newVal.Icon || newVal.ModelImage || newVal.IconImage || newVal.Image || newVal.ControlButtonIcon;
      if (imgName) {
        iconUrl.value = await resolveImage(imgName, typeId, false);
      }
    }
  }
}, { immediate: true, deep: true });

const toHtmlColor = (hex) => {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  if (hex.startsWith('#') && hex.length === 9) return '#' + hex.substring(3);
  return hex;
};

const getTintStyle = (imgUrl, hexColor) => {
  if (!hexColor || !imgUrl) return {};
  const c = toHtmlColor(hexColor);
  return {
    backgroundColor: c,
    maskImage: `url('${imgUrl}')`,
    WebkitMaskImage: `url('${imgUrl}')`
  };
};

const filteredData = computed(() => {
  if (!parsedData.value) return {};
  const skipKeys = ['Name', 'Id', 'ItemType', 'Description', 'Icon', 'ModelImage', 'IconImage', 'Image', 'Color', 'Layout', 'ControlButtonIcon'];
  const result = {};
  for (const [key, val] of Object.entries(parsedData.value)) {
    if (skipKeys.includes(key)) continue;
    result[key] = val;
  }
  return result;
});

const formatVal = (val) => {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) {
    if (val.length === 0) return 'Empty List';
    if (typeof val[0] === 'object') return `[ ${val.length} Objects ]`;
    return val.join(', ');
  }
  if (typeof val === 'object' && val !== null) {
    return Object.keys(val).length === 0 ? '{}' : '{ Object Data }';
  }
  return val;
};
</script>

<template>
  <div class="preview-container">
    <div v-if="!parsedData" class="error-state">
       Warning: Cannot preview. Invalid JSON format.
    </div>
    
    <div v-else class="item-card">
       
       <div class="card-header">
           
           <div class="images-container">
              <template v-if="iconUrl || modelUrl">
                 
                 <div class="icon-box" v-if="iconUrl" title="Icon">
                    <div class="image-stack">
                       <img :src="iconUrl" class="base-image" @error="e => e.target.style.display='none'" />
                       <div v-if="(parsedData.ItemType === 10 ? techFactionColor : parsedData.Color)" 
                            class="tint-layer" 
                            :style="getTintStyle(iconUrl, parsedData.ItemType === 10 ? techFactionColor : parsedData.Color)">
                       </div>
                    </div>
                 </div>

                 <div class="icon-box model-box" v-if="modelUrl" title="Model Image">
                    <div class="image-stack">
                       <img :src="modelUrl" class="base-image" @error="e => e.target.style.display='none'" />
                       <div v-if="parsedData.Color && parsedData.ItemType !== 10" 
                            class="tint-layer" 
                            :style="getTintStyle(modelUrl, parsedData.Color)">
                       </div>
                    </div>
                 </div>

              </template>
              
              <div class="icon-box empty" v-else>
                 <span class="no-icon">NO IMAGE</span>
              </div>
           </div>
           
           <div class="title-area">
            <h2>{{ parsedData.Name || fileName.replace('.json', '') }}</h2>
              <div class="tags">
                 <span class="tag id-tag">ID: {{ parsedData.Id ?? 'N/A' }}</span>
                 <span class="tag type-tag">Type: {{ parsedData.ItemType !== undefined ? `${parsedData.ItemType} (${ItemTypeNames[parsedData.ItemType] || 'Unknown'})` : 'Unknown' }}</span>              
              </div>
              
              <div v-if="showEditorNotes && editorNote" class="editor-note-display">
                <span class="note-icon">📝</span>
                <div class="note-text-box">
                  <span class="note-title">Editor Note</span>
                  <p>{{ editorNote }}</p>
                </div>
              </div>

           </div>
           
       </div>

       <div class="card-body">
          <div class="data-grid">
              <div class="data-item" v-for="(val, key) in filteredData" :key="key">
                  <span class="d-label">{{ key }}</span>
                  <span class="d-val" :class="{'bool-yes': val === true, 'bool-no': val === false}">
                     {{ formatVal(val) }}
                  </span>
              </div>
          </div>
       </div>

    </div>
  </div>
</template>

<style scoped>
.preview-container { width: 100%; height: 100%; overflow-y: auto; box-sizing: border-box; }
.item-card { background: var(--sidebar-bg, #2a2a2a); border: 1px solid var(--border-light, #444); border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

.card-header { display: flex; flex-wrap: wrap; gap: 24px; border-bottom: 1px dashed rgba(255, 255, 255, 0.1); padding-bottom: 24px; margin-bottom: 24px; }

.images-container { display: flex; gap: 15px; flex-shrink: 0; }
.icon-box { width: 110px; height: 110px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 4px 10px rgba(0,0,0,0.3); position: relative; }
.model-box { border-color: rgba(85, 170, 255, 0.3); background: rgba(0, 0, 0, 0.3); }
.icon-box.empty { border-style: dashed; }
.no-icon { font-size: 11px; color: var(--text-secondary); font-weight: bold; letter-spacing: 1px; }

.image-stack { position: relative; width: 90px; height: 90px; }
.base-image { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }

.tint-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; -webkit-mask-size: 100% 100%; mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; mix-blend-mode: multiply; pointer-events: none; }

.title-area { flex: 1 1 200px; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.title-area h2 { margin: 0 0 10px 0; font-size: 26px; color: var(--accent-color, #55aaff); font-weight: 700; overflow-wrap: break-word; word-wrap: break-word; hyphens: auto; }

.tags { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.tag { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-family: monospace; font-weight: bold; letter-spacing: 0.5px; white-space: nowrap; }
.id-tag { background: rgba(255, 170, 0, 0.15); color: #ffaa00; border: 1px solid rgba(255, 170, 0, 0.3); }
.type-tag { background: rgba(85, 170, 255, 0.15); color: #55aaff; border: 1px solid rgba(85, 170, 255, 0.3); }

.editor-note-display { 
  background: rgba(255, 170, 0, 0.1); 
  border: 1px solid rgba(255, 170, 0, 0.3); 
  border-radius: 8px; 
  padding: 12px; 
  display: flex; 
  gap: 10px; 
  align-items: flex-start; 
  margin-top: 10px; 
}
.note-icon { font-size: 18px; line-height: 1; }
.note-text-box { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.note-title { font-size: 10px; font-weight: bold; color: #ffaa00; text-transform: uppercase; }
.note-text-box p { margin: 0; font-size: 12px; color: var(--text-primary); line-height: 1.5; font-style: italic; white-space: pre-wrap; word-break: break-word;}

.data-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.data-item { background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; transition: transform 0.1s, background 0.2s; }
.data-item:hover { background: rgba(255, 255, 255, 0.03); transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.1); }
.d-label { font-size: 10px; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;}
.d-val { font-size: 14px; font-family: monospace; color: var(--text-primary); word-break: break-word; font-weight: 500;}
.bool-yes { color: #44ff44; }
.bool-no { color: #ff5555; opacity: 0.7; }
.error-state { color: #ff5555; text-align: center; margin-top: 50px; font-size: 16px; font-weight: bold; }

@media (max-width: 600px) {
  .item-card { padding: 15px; }
  .card-header { flex-direction: column; gap: 15px; padding-bottom: 15px; margin-bottom: 15px; }
  .images-container { justify-content: center; }
  .title-area { align-items: center; text-align: center; }
  .title-area h2 { font-size: 22px; }
  .tags { justify-content: center; }
  .editor-note-display { width: 100%; box-sizing: border-box; }
}
</style>