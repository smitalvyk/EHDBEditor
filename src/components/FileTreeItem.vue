<script setup>
import { ref } from 'vue';

const props = defineProps({
  item: { type: Object, required: true }
});

const emit = defineEmits(['select', 'delete-request']);

const toggleFolder = () => {
  if (props.item.kind === 'directory') {
    props.item.isOpen = !props.item.isOpen;
  }
};

const handleClick = () => {
  if (props.item.kind === 'directory') {
    toggleFolder();
  } else {
    emit('select', props.item);
  }
};

// Long press logic
let pressTimer = null;

const startPress = (e) => {
  // Only trigger on left mouse button or touch
  if (e.button !== undefined && e.button !== 0) return;
  
  pressTimer = setTimeout(() => {
    emit('delete-request', props.item);
  }, 2000); // 2000ms = 2 seconds. Change to 5000 for 5 seconds.
};

const cancelPress = () => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
};
</script>

<template>
  <div class="tree-item">
    <div 
      class="tree-node" 
      :class="{ 'is-folder': item.kind === 'directory' }"
      @click="handleClick"
      @pointerdown="startPress"
      @pointerup="cancelPress"
      @pointerleave="cancelPress"
      @contextmenu.prevent
    >
      <span class="icon">
        <template v-if="item.kind === 'directory'">
          {{ item.isOpen ? '📂' : '📁' }}
        </template>
        <template v-else>
          📄
        </template>
      </span>
      <span class="label">{{ item.name }}</span>
    </div>

    <div v-if="item.kind === 'directory' && item.isOpen" class="tree-children">
      <FileTreeItem 
        v-for="child in item.children" 
        :key="child.name" 
        :item="child" 
        @select="$emit('select', $event)"
        @delete-request="$emit('delete-request', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-item { user-select: none; -webkit-user-select: none; }
.tree-node { display: flex; align-items: center; gap: 6px; padding: 4px 8px; cursor: pointer; border-radius: 4px; transition: background 0.1s; }
.tree-node:hover { background: rgba(255,255,255,0.05); }
.tree-node.is-folder { font-weight: bold; color: var(--accent-color); }
.icon { font-size: 14px; opacity: 0.8; }
.label { font-size: 12px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tree-children { padding-left: 12px; border-left: 1px solid rgba(255,255,255,0.05); margin-left: 10px; margin-top: 2px; }
</style>