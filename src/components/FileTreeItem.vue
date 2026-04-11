<script setup>
defineProps({
  item: Object,
  depth: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['select']);

// Иконки (SVG strings)
const FolderIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`;
const FileIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;

const toggle = (item) => {
  if (item.kind === 'directory') {
    item.isOpen = !item.isOpen;
  } else {
    emit('select', item);
  }
};
</script>

<template>
  <div class="tree-node">
    <div 
      class="node-label" 
      :style="{ paddingLeft: depth * 16 + 10 + 'px' }"
      @click.stop="toggle(item)"
    >
      <span class="icon" v-html="item.kind === 'directory' ? FolderIcon : FileIcon"></span>
      <span class="name">{{ item.name }}</span>
    </div>

    <div v-if="item.kind === 'directory' && item.isOpen" class="node-children">
      <FileTreeItem 
        v-for="child in item.children" 
        :key="child.name" 
        :item="child" 
        :depth="depth + 1"
        @select="(f) => emit('select', f)"
      />
    </div>
  </div>
</template>

<style scoped>
.node-label {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  user-select: none;
  transition: background 0.1s;
  color: var(--text-primary);
}

.node-label:hover {
  background-color: var(--item-hover);
}

.icon {
  margin-right: 8px;
  display: flex;
  color: var(--accent-color);
}
</style>