<script setup>
import BehaviorNodeEditor from './BehaviorNodeEditor.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['update:modelValue']);

// Проверяем, пустой ли объект ВООБЩЕ (а не просто отсутствие Type)
const ensureRoot = () => {
  if (!props.modelValue || Object.keys(props.modelValue).length === 0) {
    emit('update:modelValue', { Type: 0 }); // 0 = Success
  }
};
ensureRoot();

const updateRoot = (newVal) => {
  emit('update:modelValue', newVal);
};

const deleteRoot = () => {
  emit('update:modelValue', {});
};
</script>

<template>
  <div class="bt-editor-wrapper">
    <div class="root-label">Root Node</div>
    <BehaviorNodeEditor 
      v-if="modelValue && Object.keys(modelValue).length > 0"
      :modelValue="modelValue"
      @update:modelValue="updateRoot"
      @delete="deleteRoot"
    />
    <div v-else class="empty-root">
      <button @click="ensureRoot" class="btn-action">Create Root Node</button>
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
.btn-action { background: rgba(255,255,255,0.1); border: 1px dashed var(--accent-color); color: var(--accent-color); padding: 8px 16px; border-radius: 4px; cursor: pointer;}
.btn-action:hover { background: var(--accent-color); color: white; }
</style>