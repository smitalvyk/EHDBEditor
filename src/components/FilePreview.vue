<script setup>
import { computed, ref, watch } from 'vue';
import { ItemTypeNames } from '../data/enums'; 
import ItemPreviewCard from './ItemPreviewCard.vue';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const props = defineProps({
  file: { type: Object, required: true },
  content: { type: [String, Object], default: '' },
  type: { type: String, default: 'text' },
  showEditorNotes: { type: Boolean, default: true }
});

const emit = defineEmits(['open-editor', 'open-visual']);

// --- File type detection ---
const isJson = computed(() => props.file.name.toLowerCase().endsWith('.json'));
const isXml = computed(() => props.file.name.toLowerCase().endsWith('.xml'));
const isImage = computed(() => ['png', 'jpg', 'jpeg', 'gif'].includes(props.file.name.split('.').pop().toLowerCase()));
const isAudio = computed(() => ['ogg', 'ogv', 'wav', 'mp3'].includes(props.file.name.split('.').pop().toLowerCase()));

// --- Media data ---
const imageDimensions = ref({ w: 0, h: 0 });
const imageUrl = ref('');
const audioUrl = ref('');

// --- Toolbar state ---
const zoomLevel = ref(100);
const bgMode = ref('grid'); 
const customBgColor = ref('#202020');

// --- Tint state ---
const isTintEnabled = ref(false);
const tintColor = ref('#ffffff');

// Reset on file change
watch(() => props.file, async () => {
  zoomLevel.value = 100;
  bgMode.value = 'grid';
  isTintEnabled.value = false;
  tintColor.value = '#ffffff';
  
  // Cleanup previous URLs
  if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value);
  }
  imageUrl.value = '';

  if (audioUrl.value && audioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl.value);
  }
  audioUrl.value = '';
  
  // Handle Images
  if (isImage.value && props.file) {
    try {
      // 1. If Android (Capacitor)
      if (props.file.handle && props.file.handle.kind === 'native') {
        const result = await Filesystem.getUri({ path: props.file.handle.path, directory: Directory.Documents });
        imageUrl.value = Capacitor.convertFileSrc(result.uri);
      } 
      // 2. If mobile browser (Fallback RAM)
      else if (props.file.fileObj) {
        imageUrl.value = URL.createObjectURL(props.file.fileObj);
      } 
      // 3. If PC (Web API)
      else if (props.file.handle) {
        const fileData = await props.file.handle.getFile();
        imageUrl.value = URL.createObjectURL(fileData);
      }

      const img = new Image();
      img.onload = () => {
        imageDimensions.value = { w: img.width, h: img.height };
      };
      img.src = imageUrl.value;
    } catch (e) {
      console.error("Image load error:", e);
    }
  } 
  
  // Handle Audio
  if (isAudio.value && props.file) {
    try {
      // 1. If Android (Capacitor)
      if (props.file.handle && props.file.handle.kind === 'native') {
        const result = await Filesystem.getUri({ path: props.file.handle.path, directory: Directory.Documents });
        audioUrl.value = Capacitor.convertFileSrc(result.uri);
      } 
      // 2. If mobile browser (Fallback RAM)
      else if (props.file.fileObj) {
        audioUrl.value = URL.createObjectURL(props.file.fileObj);
      } 
      // 3. If PC (Web API)
      else if (props.file.handle) {
        const fileData = await props.file.handle.getFile();
        audioUrl.value = URL.createObjectURL(fileData);
      }
    } catch (e) {
      console.error("Audio load error:", e);
    }
  }
}, { immediate: true });

// --- Wrapper background styles ---
const imageWrapperStyle = computed(() => {
  const styles = {};
  if (bgMode.value === 'color') {
    styles.background = customBgColor.value;
    styles.backgroundImage = 'none';
  }
  return styles;
});

// --- Tint styles ---
const tintStyle = computed(() => {
  return {
    backgroundColor: tintColor.value,
    maskImage: `url('${imageUrl.value}')`,
    WebkitMaskImage: `url('${imageUrl.value}')`,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    mixBlendMode: 'multiply'
  };
});

// Formatting for plain text
const previewText = computed(() => {
  if (typeof props.content !== 'string') return JSON.stringify(props.content, null, 2);
  const lines = props.content.split('\n');
  return lines.slice(0, 15).join('\n') + (lines.length > 15 ? '\n...' : '');
});
</script>

<template>
  <div class="preview-container">
    
    <div class="preview-header">
      <div class="file-identity">
        <span class="file-icon">
          <template v-if="isImage">🖼️</template>
          <template v-else-if="isAudio">🎵</template>
          <template v-else-if="isXml">🌐</template>
          <template v-else-if="isJson">📄</template>
          <template v-else>❓</template>
        </span>
        <h2 class="file-name">{{ file.name }}</h2>
      </div>

      <div class="editor-buttons">
        
        <button v-if="isJson || isXml" @click="$emit('open-editor')" class="btn-action btn-code">
          <span class="icon">{}</span> {{ isXml ? 'RAW XML' : 'RAW JSON' }}
        </button>
        
        <button v-if="isJson" @click="$emit('open-visual')" class="btn-action btn-visual">
          <span class="icon">🎨</span> VISUAL EDIT
        </button>

        <button v-if="isXml" @click="$emit('open-visual')" class="btn-action btn-localize">
          <span class="icon">🌐</span> LOCALIZE
        </button>

      </div>
    </div>

    <div class="content-preview-box">
      
      <div v-if="isImage" class="image-viewer-container">
        
        <div class="image-toolbar">
          
          <div class="tool-group file-stats">
            <span class="stat-text">DIMENSIONS: <b>{{ imageDimensions.w }} x {{ imageDimensions.h }} px</b></span>
            <span class="stat-text" :style="{ color: zoomLevel !== 100 ? 'var(--accent-color)' : '' }">ZOOM: <b>{{ zoomLevel }}%</b></span>
          </div>

          <div class="tool-separator"></div>

          <div class="tool-group">
            <label>Bg:</label>
            <button class="btn-tool" :class="{ active: bgMode === 'grid' }" @click="bgMode = 'grid'" title="Checkerboard">🏁</button>
            <div class="color-picker-wrapper" :class="{ active: bgMode === 'color' }">
              <input type="color" v-model="customBgColor" @input="bgMode = 'color'">
            </div>
          </div>
          
          <div class="tool-separator"></div>

          <div class="tool-group">
            <label>Tint:</label>
            <label class="toggle-switch small-switch">
              <input type="checkbox" v-model="isTintEnabled">
              <span class="slider"></span>
            </label>
            
            <div class="color-picker-wrapper" :class="{ disabled: !isTintEnabled }">
              <input type="color" v-model="tintColor" :disabled="!isTintEnabled">
            </div>
          </div>

          <div class="tool-separator"></div>

          <div class="tool-group">
            <label>Zoom:</label>
            <input type="range" v-model.number="zoomLevel" min="10" max="500" step="10" class="zoom-slider">
            <button class="btn-tool btn-reset" @click="zoomLevel = 100" title="Reset Zoom">↺</button>
          </div>
        </div>

        <div class="image-wrapper" :style="imageWrapperStyle">
          <div class="image-stack" :style="{ transform: `scale(${zoomLevel / 100})` }">
            <img v-if="imageUrl" :src="imageUrl" alt="Preview" class="preview-img">
            <div v-if="isTintEnabled && imageUrl" class="tint-layer" :style="tintStyle"></div>
          </div>
        </div>
      </div>

      <div v-else-if="isJson" class="card-wrapper">
        <ItemPreviewCard 
          :content="typeof content === 'string' ? content : JSON.stringify(content)" 
          :fileName="file.name" 
          :showEditorNotes="showEditorNotes" 
        /> 
      </div>

      <div v-else-if="isAudio" class="audio-viewer-container">
        <div class="unsupported-message">
          <h3>Audio Preview</h3>
          <p>Listen to the audio track below.</p>
        </div>
        <audio v-if="audioUrl" controls :src="audioUrl" class="audio-player"></audio>
      </div>

      <div v-else-if="isXml" class="text-wrapper">
        <pre class="code-view">{{ previewText }}</pre>
      </div>

      <div v-else class="unsupported-viewer-container">
        <div class="unsupported-message">
          <h3>Format Not Supported</h3>
          <p>This file extension is not supported by the editor.</p>
        </div>
      </div>
      
    </div>

  </div>
</template>

<style scoped>
.preview-container {
  display: flex; flex-direction: column; height: 100%; padding: 20px; box-sizing: border-box;
  background: var(--content-bg); color: var(--text-primary); gap: 20px;
}

/* HEADER & INFO */
.preview-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  border-bottom: 2px solid var(--border-light); 
  padding-bottom: 15px; 
  gap: 15px;
  flex-wrap: wrap;
}

.file-identity { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  flex: 1 1 min-content; 
  min-width: 0; 
}

.file-icon { font-size: 24px; }

.file-name { 
  margin: 0; 
  font-size: 20px; 
  font-weight: 600; 
  color: var(--accent-color); 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-buttons { 
  display: flex; 
  gap: 10px; 
  flex-wrap: wrap; 
}

.btn-action { 
  display: flex; 
  align-items: center; 
  justify-content: center;
  gap: 6px; 
  padding: 8px 16px; 
  border: none; 
  border-radius: 6px; 
  font-weight: bold; 
  cursor: pointer; 
  transition: transform 0.1s; 
  font-size: 13px; 
  flex: 1 1 auto;
}

.btn-action:hover { transform: translateY(-1px); opacity: 0.9; }
.btn-code { background: #2d2d2d; color: #a0a0a0; border: 1px solid #444; }
.btn-visual { background: var(--accent-color); color: white; }
.btn-localize { background: #107c41; color: white; border: 1px solid #0c5e31; }
.btn-localize:hover { background: #128e4a; }

/* CONTENT BOX */
.content-preview-box {
  flex: 1;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  border: 1px solid #444;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* CARD WRAPPER FOR JSON */
.card-wrapper {
  flex: 1;
  overflow: auto; 
  background: transparent;
}

/* CENTERED VIEWERS (Audio & Unsupported) */
.audio-viewer-container, .unsupported-viewer-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background: #1e1e1e;
  text-align: center;
}
.unsupported-message h3 { margin: 0 0 10px 0; color: #ffaa00; }
.unsupported-message p { margin: 0 0 30px 0; color: var(--text-secondary); font-style: italic; }
.audio-player { width: 100%; max-width: 500px; outline: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }

/* TOOLBAR */
.image-viewer-container { display: flex; flex-direction: column; height: 100%; width: 100%; }
.image-toolbar {
  display: flex; align-items: center; gap: 15px;
  background: #2a2a2a; border-bottom: 1px solid #444;
  padding: 8px 15px; color: #ccc;
  font-size: 12px;
  z-index: 10;
  flex-wrap: wrap;
}
.tool-group { display: flex; align-items: center; gap: 8px; }
.tool-group label { font-weight: bold; opacity: 0.7; }
.tool-separator { width: 1px; height: 20px; background: #555; }

.file-stats { display: flex; gap: 15px; font-family: monospace; font-size: 12px; margin-right: 10px;}
.stat-text { color: var(--text-secondary); text-transform: uppercase; }
.stat-text b { color: var(--text-primary); font-size: 13px; margin-left: 4px; }

.btn-tool { background: #444; border: 1px solid transparent; color: #fff; border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 14px; }
.btn-tool:hover { background: #555; }
.btn-tool.active { background: var(--accent-color); border-color: var(--accent-color); }
.btn-reset { font-size: 16px; padding: 0 8px; line-height: 1; height: 24px; }

.color-picker-wrapper {
  width: 28px; height: 28px; border-radius: 4px; overflow: hidden; 
  border: 2px solid transparent; cursor: pointer; position: relative;
}
.color-picker-wrapper.active { border-color: var(--accent-color); }
.color-picker-wrapper.disabled { opacity: 0.3; pointer-events: none; }
.color-picker-wrapper input[type="color"] {
  width: 200%; height: 200%; margin: -50%; padding: 0; cursor: pointer; border: none;
}
.zoom-slider { width: 100px; cursor: pointer; }

/* IMAGE WRAPPER */
.image-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  overflow: auto;
  background-image: 
    linear-gradient(45deg, #222 25%, transparent 25%), 
    linear-gradient(-45deg, #222 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #222 75%), 
    linear-gradient(-45deg, transparent 75%, #222 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  background-color: transparent;
}

.image-stack {
  position: relative;
  line-height: 0;
  transform-origin: center;
  transition: transform 0.1s linear;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

.preview-img { display: block; max-width: none; }
.tint-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }

.text-wrapper { flex: 1; padding: 15px; overflow: auto; }
.code-view { margin: 0; font-family: 'Consolas', monospace; font-size: 12px; line-height: 1.5; color: #d4d4d4; white-space: pre-wrap; }
.text-wrapper::-webkit-scrollbar { width: 10px; background: #1e1e1e; }
.text-wrapper::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }

.small-switch { position: relative; display: inline-block; width: 28px; height: 16px; margin: 0; }
.small-switch input { opacity: 0; width: 0; height: 0; }
.small-switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 20px; }
.small-switch .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
.small-switch input:checked + .slider { background-color: var(--accent-color); }
.small-switch input:checked + .slider:before { transform: translateX(12px); }

/* MOBILE ADAPTATION */
@media (max-width: 600px) {
  .preview-container {
    padding: 10px;
  }
  .preview-header {
    flex-direction: column;
    align-items: stretch;
    padding-bottom: 10px;
    gap: 10px;
  }
  .file-identity {
    justify-content: center;
  }
  .editor-buttons {
    width: 100%;
  }
  .btn-action {
    padding: 12px; 
  }
}
</style>