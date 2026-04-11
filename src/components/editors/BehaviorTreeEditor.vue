<script setup>
import BehaviorNodeEditor from './BehaviorNodeEditor.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['update:modelValue']);

// If RootNode doesn't exist yet, create a default structure
const ensureRoot = () => {
  if (!props.modelValue || !props.modelValue.Type) {
    emit('update:modelValue', { Type: 'Selector', Nodes: [] });
  }
};
ensureRoot();

const updateRoot = (newVal) => {
  emit('update:modelValue', newVal);
};

const deleteRoot = () => {
  // Clear (can be set to null or reset if desired)
  emit('update:modelValue', { Type: 'Selector', Nodes: [] });
};
</script>

<template>
  <div class="bt-editor-wrapper">
    <div class="root-label">Root Node</div>
    <BehaviorNodeEditor 
      v-if="modelValue && modelValue.Type"
      :modelValue="modelValue"
      @update:modelValue="updateRoot"
      @delete="deleteRoot"
    />
    <div v-else class="empty-root">
      <button @click="ensureRoot">Create Root Node</button>
    </div>
  </div>
</template>

<style scoped>
.bt-editor-wrapper {
  width: 100%;
}
.root-label {
  font-size: 12px; font-weight: bold; color: var(--accent-color); margin-bottom: 5px;
}
.empty-root { padding: 20px; text-align: center; }
</style>