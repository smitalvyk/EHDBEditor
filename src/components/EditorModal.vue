<script setup>
import { ref, watch, computed, nextTick } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  file: Object,
  content: [String, Object],
  type: String
});

const emit = defineEmits(['close', 'save']);

const localContent = ref('');
const isValidJson = ref(true);
const jsonErrorMsg = ref('');
const errorPosition = ref(null);
const errorLine = ref(null);

const editorRef = ref(null);
const lineNumbersRef = ref(null);

// === FILE TYPE DETECTION ===
const isJsonFile = computed(() => {
  const fileName = props.file?.name || '';
  return fileName.toLowerCase().endsWith('.json');
});

// === LINE NUMBERS ===
const lineCount = computed(() => {
  if (!localContent.value) return 1;
  return localContent.value.split('\n').length;
});

// === SYNC SCROLL ===
const syncScroll = () => {
  if (editorRef.value && lineNumbersRef.value) {
    lineNumbersRef.value.scrollTop = editorRef.value.scrollTop;
  }
};

// === VALIDATION ===
const validateJson = (text) => {

  if (!isJsonFile.value) {
    isValidJson.value = true;
    jsonErrorMsg.value = '';
    errorPosition.value = null;
    errorLine.value = null;
    return;
  }

  if (!text || !text.trim()) {
    isValidJson.value = false;
    jsonErrorMsg.value = 'File cannot be empty';
    errorPosition.value = null;
    errorLine.value = null;
    return;
  }
  
  try {
    JSON.parse(text);
    isValidJson.value = true;
    jsonErrorMsg.value = '';
    errorPosition.value = null;
    errorLine.value = null;
  } catch (e) {
    isValidJson.value = false;
    jsonErrorMsg.value = e.message;

    // Try to extract character position (Standard V8 Engine format)
    const posMatch = e.message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      errorPosition.value = pos;
      
      const textUpToError = text.substring(0, pos);
      errorLine.value = textUpToError.split('\n').length;
    } else {
      // Try to extract line number (Firefox fallback)
      const lineMatch = e.message.match(/line (\d+)/);
      if (lineMatch) {
        errorLine.value = parseInt(lineMatch[1], 10);
        errorPosition.value = null;
      } else {
        errorPosition.value = null;
        errorLine.value = null;
      }
    }
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    localContent.value = typeof props.content === 'string' 
      ? props.content 
      : JSON.stringify(props.content, null, 2);
    
    validateJson(localContent.value);
    
    nextTick(() => {
      syncScroll();
    });
  }
});

const handleInput = (e) => {
  localContent.value = e.target.value;
  validateJson(localContent.value);
};

const handleSave = () => {
  if (isValidJson.value) {
    emit('save', localContent.value);
  }
};

// === ERROR JUMP LOGIC ===
const jumpToError = () => {
  if (!editorRef.value || isValidJson.value) return;
  
  editorRef.value.focus();
  
  let targetPos = errorPosition.value;
  
  // Calculate position manually if we only have the line number
  if (targetPos === null && errorLine.value !== null) {
     const lines = localContent.value.split('\n');
     let charsCount = 0;
     for (let i = 0; i < errorLine.value - 1; i++) {
        charsCount += lines[i].length + 1; // +1 for the newline character
     }
     targetPos = charsCount;
  }

  if (targetPos !== null) {
    // Select the exact problematic character
    editorRef.value.setSelectionRange(targetPos, targetPos + 1);
    
    // Scroll the editor to show the selected line (offset by 5 lines to keep it in center)
    const lineHeight = 21; // Must match CSS line-height
    editorRef.value.scrollTop = Math.max(0, (errorLine.value - 1) * lineHeight - (lineHeight * 5));
  }
};
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-window">
        
        <div class="modal-header">
          <div class="modal-title">Raw Editor: {{ file?.name }}</div>
          <div class="modal-actions">
            <button 
              @click="handleSave" 
              class="btn-save" 
              :disabled="!isValidJson" 
              :class="{ 'btn-disabled': !isValidJson }"
            >
              {{ isJsonFile ? 'Save JSON' : 'Save File' }}
            </button>
            <button @click="emit('close')" class="btn-close">Close</button>
          </div>
        </div>
        
        <div class="modal-body">
          <div class="editor-container" :class="{ 'has-error': !isValidJson }">
            
            <div class="line-numbers" ref="lineNumbersRef">
              <div 
                v-for="n in lineCount" 
                :key="n" 
                class="line-num" 
                :class="{ 'error-line': !isValidJson && errorLine === n }"
              >{{ n }}</div>
            </div>

            <textarea
              ref="editorRef"
              :value="localContent"
              @input="handleInput"
              @scroll="syncScroll"
              class="code-editor"
              spellcheck="false"
              wrap="off"
            ></textarea>

          </div>
        </div>

        <div 
          v-if="!isValidJson && isJsonFile" 
          class="modal-footer error-footer" 
          @click="jumpToError" 
          title="Click to jump to error location"
        >
          <span class="error-icon">⚠️</span>
          <span class="error-text">Invalid JSON: {{ jsonErrorMsg }}</span>
          <span class="jump-hint">▶ Click to jump to line {{ errorLine }}</span>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-window {
  width: 90vw;
  height: 90vh;
  background: var(--app-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.modal-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-light);
  background: var(--sidebar-bg);
}

.modal-title {
  font-weight: bold;
  font-size: 16px;
  color: var(--accent-color);
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* === CUSTOM EDITOR STYLES === */
.editor-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.editor-container.has-error {
  box-shadow: inset 0 0 0 2px #ff5555;
}

.line-numbers {
  padding: 20px 10px;
  background: #252526;
  color: #858585;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  line-height: 21px; /* strict line-height for sync */
  text-align: right;
  user-select: none;
  overflow-y: hidden;
  border-right: 1px solid #444;
  min-width: 45px;
  box-sizing: border-box;
}

.line-num {
  display: block;
}

.line-num.error-line {
  color: #ff5555;
  font-weight: bold;
  background: rgba(255, 85, 85, 0.2);
  border-radius: 2px;
}

.code-editor {
  flex: 1;
  background: transparent;
  color: #d4d4d4;
  border: none;
  padding: 20px 15px;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  line-height: 21px; /* MUST match line-numbers */
  resize: none;
  outline: none;
  box-sizing: border-box;
  white-space: pre;
  overflow: auto;
}

/* === ERROR FOOTER === */
.error-footer {
  background: #2a0000;
  border-top: 1px solid #ff5555;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.error-footer:hover {
  background: #3a0000;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  color: #ff8888;
  font-family: monospace;
  font-size: 13px;
  font-weight: bold;
}

.jump-hint {
  margin-left: auto;
  color: #ffaa00;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: bold;
  opacity: 0.8;
}

/* === BUTTONS === */
.btn-save {
  background: var(--accent-color);
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  filter: brightness(1.2);
}

.btn-save.btn-disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-close {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* === ANIMATIONS === */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-active .modal-window {
  transition: transform 0.2s ease;
}
.modal-enter-from .modal-window {
  transform: scale(0.95);
}
</style>