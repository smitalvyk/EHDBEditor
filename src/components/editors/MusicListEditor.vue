<script setup>
import { ref, onMounted, watch } from 'vue';
import { useFileSystem } from '../../composables/useFileSystem';

const props = defineProps({
  modelValue: { type: [Array, String], default: () => [] }
});

const emit = defineEmits(['update:modelValue']);
const { filesTree } = useFileSystem();

const localList = ref([]);
const availableAudio = ref([]);

// --- AUDIO FILES SEARCH ---
const collectAudioFiles = (nodes, list = []) => {
  for (const node of nodes) {
    if (node.kind === 'file') {
      const name = node.name.toLowerCase();
      if (name.endsWith('.ogg') || name.endsWith('.wav')) {
        // We can remove the extension for a cleaner display if needed, 
        // but usually the name is written with or without the extension in JSON, depending on the game.
        // Here we save the full file name.
        list.push(node.name);
      }
    } else if (node.kind === 'directory' && node.children) {
      collectAudioFiles(node.children, list);
    }
  }
  return list;
};

const refreshAudioList = () => {
  const audio = [];
  if (filesTree.value) {
    collectAudioFiles(filesTree.value, audio);
  }
  // Sort alphabetically
  availableAudio.value = audio.sort();
};

// --- PARSING ---
watch(() => props.modelValue, (newVal) => {
  if (Array.isArray(newVal)) {
    localList.value = [...newVal];
  } else if (typeof newVal === 'string') {
    try {
      localList.value = JSON.parse(newVal);
    } catch (e) {
      localList.value = [];
    }
  } else {
    localList.value = [];
  }
}, { immediate: true, deep: true });

onMounted(() => {
  refreshAudioList();
});

// --- LOGIC ---
const emitUpdate = () => {
  emit('update:modelValue', localList.value);
};

const addTrack = () => {
  // Add an object with empty Audio
  localList.value.push({ Audio: "" });
  emitUpdate();
};

const removeTrack = (index) => {
  localList.value.splice(index, 1);
  emitUpdate();
};

const moveTrack = (index, direction) => {
  if (direction === -1 && index > 0) {
    const temp = localList.value[index];
    localList.value[index] = localList.value[index - 1];
    localList.value[index - 1] = temp;
  } else if (direction === 1 && index < localList.value.length - 1) {
    const temp = localList.value[index];
    localList.value[index] = localList.value[index + 1];
    localList.value[index + 1] = temp;
  }
  emitUpdate();
};

const updateTrackAudio = (index, value) => {
  // Remove the extension from the value if the game requires the name without .ogg
  // If the game requires it with .ogg, remove the .replace(...)
  const cleanName = value.replace(/\.(ogg|wav)$/i, ""); 
  
  // In your JSON structure this is an object {"Audio": "name"}
  localList.value[index].Audio = cleanName;
  emitUpdate();
};

</script>

<template>
  <div class="music-editor">
    
    <div v-if="localList.length === 0" class="empty-list">Track list is empty</div>

    <div class="track-list">
      <div v-for="(track, idx) in localList" :key="idx" class="track-row">
        
        <div class="track-index">{{ idx + 1 }}.</div>

        <div class="track-select-wrapper">
          <select 
            :value="track.Audio ? (availableAudio.find(a => a.startsWith(track.Audio)) || track.Audio) : ''"
            @change="e => updateTrackAudio(idx, e.target.value)" 
            class="win-input"
          >
            <option value="" disabled>Select file...</option>
            <option v-if="track.Audio && !availableAudio.some(a => a.startsWith(track.Audio))" :value="track.Audio">
              {{ track.Audio }} (Not found)
            </option>
            <option v-for="file in availableAudio" :key="file" :value="file">
              🎵 {{ file }}
            </option>
          </select>
        </div>

        <div class="actions">
          <button @click="moveTrack(idx, -1)" :disabled="idx === 0" class="btn-mini" title="Move Up">▲</button>
          <button @click="moveTrack(idx, 1)" :disabled="idx === localList.length - 1" class="btn-mini" title="Move Down">▼</button>
          <button @click="removeTrack(idx)" class="btn-mini btn-delete" title="Delete">×</button>
        </div>

      </div>
    </div>

    <button @click="addTrack" class="btn-add">+ Add Track</button>

  </div>
</template>

<style scoped>
.music-editor {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

.empty-list { font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px; font-style: italic; }

.track-list { display: flex; flex-direction: column; gap: 6px; width: 100%; }

.track-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
}
.track-row:hover {
  border-color: var(--border-light);
  background: rgba(255, 255, 255, 0.05);
}

.track-index {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-secondary);
  width: 20px;
}

.track-select-wrapper {
  flex: 1;
}

.win-input {
  width: 100%;
  background: rgba(0,0,0,0.3); border: 1px solid transparent; color: var(--text-primary);
  padding: 6px 8px; border-radius: 4px; font-size: 13px; font-family: inherit;
}
.win-input:focus { border-color: var(--accent-color); outline: none; }

.actions {
  display: flex;
  gap: 4px;
}

.btn-mini {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-primary);
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 10px;
}
.btn-mini:hover:not(:disabled) { background: var(--accent-color); color: white; border-color: var(--accent-color); }
.btn-mini:disabled { opacity: 0.3; cursor: default; }

.btn-delete {
  color: #ff5555;
  background: rgba(255, 50, 50, 0.1);
}
.btn-delete:hover { background: #ff5555; border-color: #ff5555; }

.btn-add {
  background: transparent; border: 1px dashed var(--accent-color); color: var(--accent-color);
  padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s; text-align: center; width: 100%;
}
.btn-add:hover { background: rgba(var(--accent-color), 0.1); }
</style>