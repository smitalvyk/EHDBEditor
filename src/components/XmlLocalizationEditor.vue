<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  content: String,
  fileName: String
});

const emit = defineEmits(['close', 'save']);

const searchQuery = ref('');
const parsedItems = ref([]);
let xmlDoc = null; 

const isAddingKey = ref(false);
const newKeyName = ref('');

// 🚀 XML Parsing Function
const parseXml = () => {
  if (!props.content) return;

  try {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(props.content, "application/xml");
    
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      console.error("XML Parsing Error:", parseError.textContent);
      alert("Error parsing XML! The file has syntax errors. Please fix them in 'Raw Edit' first.");
      emit('close');
      return;
    }

    const items = [];
    const root = xmlDoc.documentElement;
    if (!root) return;

    const elements = root.querySelectorAll('*');
    
    elements.forEach(child => {
      if (child.children.length === 0 && (child.hasAttribute('name') || child.hasAttribute('id') || child.hasAttribute('key'))) {
        const attrType = child.hasAttribute('name') ? 'name' : (child.hasAttribute('id') ? 'id' : 'key');
        const keyName = child.getAttribute(attrType);
        
        items.push({
          id: Math.random().toString(36).substr(2, 9),
          key: keyName,
          originalKey: keyName, 
          keyAttr: attrType,    
          originalText: child.textContent,
          currentText: child.textContent,
          nodeRef: child,
          isEditingKey: false   
        });
      }
    });

    parsedItems.value = items;
  } catch (error) {
    console.error("Failed to parse XML:", error);
  }
};

onMounted(() => {
  if (props.isOpen) parseXml();
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    searchQuery.value = '';
    isAddingKey.value = false;
    newKeyName.value = '';
    parseXml();
  }
});

// 🚀 Add New Key
const addNewKey = () => {
  const key = newKeyName.value.trim();
  if (!key) return;

  if (parsedItems.value.some(item => item.key === key)) {
    alert(`Key "${key}" already exists!`);
    return;
  }

  const root = xmlDoc.documentElement;
  const newNode = xmlDoc.createElement('string');
  newNode.setAttribute('name', key);
  newNode.textContent = '';

  root.appendChild(xmlDoc.createTextNode('\n    '));
  root.appendChild(newNode);
  root.appendChild(xmlDoc.createTextNode('\n'));

  parsedItems.value.unshift({
    id: Math.random().toString(36).substr(2, 9),
    key: key,
    originalKey: key,
    keyAttr: 'name',
    originalText: '',
    currentText: '',
    nodeRef: newNode,
    isEditingKey: false
  });

  newKeyName.value = '';
  isAddingKey.value = false;
  searchQuery.value = '';
};

// 🚀 Delete Key
const deleteKey = (item) => {
  if (confirm(`Are you sure you want to delete the key "${item.key}"?`)) {
    if (item.nodeRef && item.nodeRef.parentNode) {
      item.nodeRef.parentNode.removeChild(item.nodeRef);
    }
    parsedItems.value = parsedItems.value.filter(i => i.id !== item.id);
  }
};

const saveKeyEdit = (item) => {
  item.key = item.key.trim();
  if (!item.key) {
    alert("Key cannot be empty!");
    item.key = item.originalKey;
  } else if (parsedItems.value.some(i => i.id !== item.id && i.key === item.key)) {
    alert(`Key "${item.key}" already exists!`);
    item.key = item.originalKey;
  }
  item.isEditingKey = false;
};

// 🚀 Insert Unity Rich Text
const insertTag = (item, openTag, closeTag, event) => {
  const textarea = event.target.closest('.col-text').querySelector('textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = item.currentText;

  const before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end);

  item.currentText = before + openTag + selected + closeTag + after;
  
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
  }, 0);
};

// 🚀 Insert Sprite Tag
const insertSprite = (item, event) => {
  const textarea = event.target.closest('.col-text').querySelector('textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const tag = `<sprite name="icon">`;
  
  item.currentText = item.currentText.substring(0, start) + tag + item.currentText.substring(textarea.selectionEnd);
  
  // Smartly select the word "icon" so the user can immediately type their own
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + 14, start + 18);
  }, 0);
};

const insertColorTag = (item, type, event) => {
  const color = event.target.value; 
  if (!color) return;
  insertTag(item, `<${type}=${color}>`, `</${type}>`, event);
};

// 🚀 Rich Text to HTML Renderer
const formatRichText = (text) => {
  if (!text) return '<span style="opacity: 0.3; font-style: italic;">Empty translation...</span>';
  
  let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\r\n|\n/g, '<br>').replace(/\\n/g, '<br>');
  
  // Basic Formatting
  html = html.replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<b>$1</b>');
  html = html.replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, '<i>$1</i>');
  html = html.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>');
  html = html.replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/gi, '<s>$1</s>');
  html = html.replace(/&lt;sub&gt;(.*?)&lt;\/sub&gt;/gi, '<sub>$1</sub>');
  html = html.replace(/&lt;sup&gt;(.*?)&lt;\/sup&gt;/gi, '<sup>$1</sup>');
  
  // Colors and Highlighting
  html = html.replace(/&lt;color=(.*?)&gt;(.*?)&lt;\/color&gt;/gi, '<span style="color: $1;">$2</span>');
  html = html.replace(/&lt;mark=(.*?)&gt;(.*?)&lt;\/mark&gt;/gi, '<mark style="background-color: $1; color: inherit; padding: 0 2px; border-radius: 2px;">$2</mark>');
  
  // Sizes
  html = html.replace(/&lt;size=(.*?)&gt;(.*?)&lt;\/size&gt;/gi, (match, sizeAttr, content) => {
    const sizeStr = (sizeAttr.includes('%') || sizeAttr.includes('px')) ? sizeAttr : sizeAttr + 'px';
    return `<span style="font-size: ${sizeStr}">${content}</span>`;
  });

  // Alignment
  html = html.replace(/&lt;align=(.*?)&gt;(.*?)&lt;\/align&gt;/gi, '<div style="text-align: $1; display: block; width: 100%;">$2</div>');

  // 🚀 Sprites
  html = html.replace(/&lt;sprite(.*?)&gt;/gi, (match, attrs) => {
    let nameMatch = attrs.match(/name=["']?([^"'\s]+)["']?/) || attrs.match(/=["']?([^"'\s]+)["']?/);
    let spriteName = nameMatch ? nameMatch[1] : 'img';
    
    let colorMatch = attrs.match(/color=#([0-9a-fA-F]{6,8})/i);
    let colorStyle = colorMatch ? `color: #${colorMatch[1]};` : 'color: #60cdff;';

    return `<span style="display:inline-flex; align-items:center; background:rgba(255,255,255,0.1); border-radius:4px; padding:0 6px; font-size:0.85em; margin: 0 2px; border: 1px solid rgba(255,255,255,0.2); ${colorStyle}" title="${match.replace(/&lt;/g, '<').replace(/&gt;/g, '>')}">🖼️ ${spriteName}</span>`;
  });

  return html;
};

const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase();
  if (!query) return parsedItems.value;
  return parsedItems.value.filter(item => 
    item.key.toLowerCase().includes(query) || 
    item.currentText.toLowerCase().includes(query)
  );
});

// 🚀 Save Changes
const handleSave = () => {
  if (!xmlDoc) return;

  parsedItems.value.forEach(item => {
    if (item.currentText !== item.originalText) {
      item.nodeRef.textContent = item.currentText;
    }
    if (item.key !== item.originalKey) {
      item.nodeRef.setAttribute(item.keyAttr, item.key);
    }
  });

  const serializer = new XMLSerializer();
  let newXmlString = serializer.serializeToString(xmlDoc);
  
  const originalHeaderMatch = props.content.match(/^<\?xml.*?\?>/i);
  if (originalHeaderMatch && !newXmlString.startsWith('<?xml')) {
    newXmlString = originalHeaderMatch[0] + '\n' + newXmlString;
  }

  emit('save', newXmlString);
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="xml-editor-modal">
      
      <div class="modal-header">
        <div class="header-info">
          <h3>🌐 Localization Editor</h3>
          <span class="file-name">{{ fileName }}</span>
          <span class="badge">{{ parsedItems.length }} keys</span>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" @click="emit('close')">Cancel</button>
          <button class="btn-primary" @click="handleSave">💾 Save Changes</button>
        </div>
      </div>

      <div class="modal-toolbar">
        <div class="toolbar-top">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="🔍 Search by key or translation text..." 
            class="search-input"
          >
          <button @click="isAddingKey = !isAddingKey" class="btn-secondary add-btn">
            {{ isAddingKey ? '✖ Cancel' : '➕ Add New Key' }}
          </button>
        </div>

        <div v-if="isAddingKey" class="add-key-panel">
          <input 
            type="text" 
            v-model="newKeyName" 
            placeholder="Enter key name (e.g. MyNewWeaponName)" 
            class="new-key-input"
            @keyup.enter="addNewKey"
            autofocus
          >
          <button @click="addNewKey" class="btn-primary">Add to List</button>
        </div>
      </div>

      <div class="table-container">
        <table class="loc-table">
          <thead>
            <tr>
              <th class="col-key">Key & Preview</th>
              <th class="col-text">Raw Text (Unity TextMeshPro Rich Text)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              
              <td class="col-key">
                <div v-if="!item.isEditingKey" class="key-display">
                  <div class="key-box" :title="item.key">{{ item.key }}</div>
                  <div class="key-actions">
                    <button @click="item.isEditingKey = true" title="Edit Key" class="icon-btn-small">✏️</button>
                    <button @click="deleteKey(item)" title="Delete Key" class="icon-btn-small danger">🗑️</button>
                  </div>
                </div>
                <div v-else class="key-edit">
                  <input v-model="item.key" @keyup.enter="saveKeyEdit(item)" class="key-edit-input" autofocus />
                  <button @click="saveKeyEdit(item)" title="Save Key" class="icon-btn-small success">💾</button>
                </div>

                <div class="formatted-preview" v-html="formatRichText(item.currentText)"></div>
              </td>

              <td class="col-text">
                
                <div class="rich-text-toolbar">
                  <button @click="insertTag(item, '<b>', '</b>', $event)" title="Bold"><b>B</b></button>
                  <button @click="insertTag(item, '<i>', '</i>', $event)" title="Italic"><i>I</i></button>
                  <button @click="insertTag(item, '<u>', '</u>', $event)" title="Underline"><u>U</u></button>
                  <button @click="insertTag(item, '<s>', '</s>', $event)" title="Strikethrough"><s>S</s></button>
                  
                  <span class="toolbar-divider"></span>

                  <button @click="insertTag(item, '<sup>', '</sup>', $event)" title="Superscript">X<sup>2</sup></button>
                  <button @click="insertTag(item, '<sub>', '</sub>', $event)" title="Subscript">X<sub>2</sub></button>
                  
                  <span class="toolbar-divider"></span>

                  <button @click="insertSprite(item, $event)" title="Insert Image (Sprite)" class="btn-sprite">🖼️ <b>Sprite</b></button>

                  <span class="toolbar-divider"></span>

                  <div class="color-picker-group" title="Text Color (<color=#HEX>)">
                    <span class="picker-icon" style="color: #60cdff;">A</span>
                    <input type="color" @change="insertColorTag(item, 'color', $event)" value="#60cdff" />
                  </div>
                  
                  <div class="color-picker-group" title="Highlight Color (<mark=#HEX>)">
                    <span class="picker-icon">🖍️</span>
                    <input type="color" @change="insertColorTag(item, 'mark', $event)" value="#ffaa00" />
                  </div>

                  <span class="toolbar-divider"></span>
                  
                  <button @click="insertTag(item, '<size=150%>', '</size>', $event)" title="Increase Size"><b>T↕</b></button>
                  <button @click="insertTag(item, '<align=center>', '</align>', $event)" title="Center Align"><b>≡</b></button>
                  <button @click="insertTag(item, '\\n', '', $event)" title="Insert Line Break (\\n)"><b>↵ \n</b></button>
                  
                </div>

                <textarea 
                  v-model="item.currentText" 
                  class="text-edit-area"
                  rows="3"
                ></textarea>
              </td>
            </tr>
            <tr v-if="filteredItems.length === 0">
              <td colspan="2" class="empty-state">No translations found.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.xml-editor-modal { background: var(--content-bg, #272727); border: 1px solid var(--border-light, #444); border-radius: 8px; width: 1000px; max-width: 95vw; height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }

.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: var(--sidebar-bg, #202020); border-bottom: 1px solid var(--border-light, #444); }
.header-info { display: flex; align-items: center; gap: 15px; }
.header-info h3 { margin: 0; font-size: 16px; color: var(--text-primary, #fff); }
.file-name { color: var(--accent-color, #60cdff); font-family: monospace; font-size: 13px; font-weight: bold; background: rgba(96, 205, 255, 0.1); padding: 4px 8px; border-radius: 4px;}
.badge { background: rgba(255,255,255,0.1); font-size: 11px; padding: 3px 6px; border-radius: 12px; color: var(--text-primary); }

.header-actions { display: flex; gap: 10px; }
.btn-primary { background: var(--accent-color, #0078d4); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: 0.2s;}
.btn-primary:hover { filter: brightness(1.2); }
.btn-secondary { background: transparent; border: 1px solid var(--border-light, #555); color: var(--text-primary, #ccc); padding: 6px 12px; border-radius: 4px; cursor: pointer; transition: 0.2s;}
.btn-secondary:hover { background: rgba(255,255,255,0.1); }

/* TOOLBAR */
.modal-toolbar { padding: 15px 20px; background: rgba(0,0,0,0.05); border-bottom: 1px solid var(--border-light, #444); display: flex; flex-direction: column; gap: 10px; }
.toolbar-top { display: flex; gap: 15px; align-items: center; }
.search-input { flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-light, #555); background: var(--content-bg, #1e1e1e); color: var(--text-primary, #fff); font-size: 14px; }
.search-input:focus { outline: none; border-color: var(--accent-color, #60cdff); }

.add-key-panel { display: flex; gap: 10px; background: rgba(96, 205, 255, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(96, 205, 255, 0.3); animation: slideDown 0.2s ease-out; }
.new-key-input { flex: 1; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-light); background: var(--content-bg); color: var(--text-primary); font-family: monospace; font-size: 13px; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

/* TABLE */
.table-container { flex: 1; overflow-y: auto; padding: 0; }
.loc-table { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
.loc-table th { position: sticky; top: 0; background: var(--sidebar-bg, #202020); color: var(--text-secondary, #aaa); padding: 10px 20px; font-size: 12px; text-transform: uppercase; z-index: 10; border-bottom: 1px solid var(--border-light, #444); }
.loc-table td { padding: 15px 20px; border-bottom: 1px solid var(--border-light, #333); vertical-align: top; }
.loc-table tr:hover { background: rgba(255,255,255,0.02); }

/* 🚀 KEY COLUMN STYLES & PREVIEW */
.col-key { width: 45%; }
.key-display { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.key-box { font-family: monospace; font-size: 13px; color: #ffaa00; word-break: break-all; background: rgba(255, 170, 0, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255, 170, 0, 0.2); flex: 1; }

.key-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.loc-table tr:hover .key-actions { opacity: 1; }

.key-edit { display: flex; gap: 5px; width: 100%; margin-bottom: 10px; }
.key-edit-input { flex: 1; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--accent-color); background: var(--content-bg); color: var(--text-primary); font-family: monospace; font-size: 13px; }

/* FORMATTED TEXT BLOCK */
.formatted-preview {
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-left: 3px solid var(--accent-color, #60cdff);
  border-radius: 0 4px 4px 0;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;
}

.icon-btn-small { background: rgba(255,255,255,0.1); border: none; padding: 4px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: 0.2s; }
.icon-btn-small:hover { background: rgba(255,255,255,0.2); }
.icon-btn-small.danger:hover { background: rgba(255, 68, 68, 0.8); }
.icon-btn-small.success { background: rgba(68, 255, 68, 0.2); }
.icon-btn-small.success:hover { background: rgba(68, 255, 68, 0.4); }

/* 🚀 TEXT COLUMN & RICH TEXT TOOLBAR */
.col-text { width: 55%; }

.rich-text-toolbar { display: flex; gap: 4px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
.rich-text-toolbar button { 
  background: var(--sidebar-bg, #2a2a2a); border: 1px solid var(--border-light, #444); 
  color: var(--text-primary, #ccc); padding: 4px 8px; border-radius: 4px; 
  cursor: pointer; font-size: 12px; transition: 0.1s;
  display: flex; align-items: center; justify-content: center; gap: 4px;
}
.rich-text-toolbar button:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: #666; }

.btn-sprite { background: rgba(96, 205, 255, 0.1) !important; border-color: rgba(96, 205, 255, 0.4) !important; color: #60cdff !important; }
.btn-sprite:hover { background: rgba(96, 205, 255, 0.2) !important; }

.toolbar-divider { width: 1px; height: 16px; background: var(--border-light, #444); margin: 0 4px; }

/* Custom Color Picker */
.color-picker-group {
  position: relative; width: 26px; height: 26px; border-radius: 4px;
  background: var(--sidebar-bg, #2a2a2a); border: 1px solid var(--border-light, #444);
  overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.color-picker-group:hover { border-color: #666; }
.picker-icon { font-weight: bold; font-size: 12px; pointer-events: none; z-index: 2; }
.color-picker-group input[type="color"] {
  position: absolute; top: -10px; left: -10px; width: 50px; height: 50px;
  opacity: 0; cursor: pointer; z-index: 3;
}

.util-dropdown {
  background: var(--sidebar-bg, #2a2a2a); border: 1px solid var(--border-light, #444); 
  color: var(--text-primary, #ccc); padding: 4px 6px; border-radius: 4px; 
  cursor: pointer; font-size: 12px; outline: none;
}

.text-edit-area { 
  width: 100%; width: -moz-available; width: -webkit-fill-available; 
  padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-light, #444); 
  border-radius: 4px; color: #a0a0a0; font-family: 'Consolas', monospace; 
  font-size: 13px; resize: vertical; transition: border-color 0.2s; box-sizing: border-box;
}
.text-edit-area:focus { outline: none; border-color: var(--accent-color, #60cdff); background: var(--content-bg, #1e1e1e); color: #fff;}

.empty-state { text-align: center; padding: 40px !important; color: var(--text-secondary, #aaa); }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background-color: var(--accent-color, #60cdff); border-radius: 6px; opacity: 0.8; }
</style>