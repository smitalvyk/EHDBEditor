<script setup>
import BehaviorNodeEditor from './BehaviorNodeEditor.vue';

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['update:modelValue']);


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
    
    <div class="bt-scroll-area">
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
    
  </div>
</template>

<style scoped>
.bt-editor-wrapper {
  width: 100%;
  box-sizing: border-box;
}


.bt-scroll-area {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 12px;

  scrollbar-width: thin;
  scrollbar-color: var(--accent-color) rgba(255, 255, 255, 0.05);
}
.bt-scroll-area::-webkit-scrollbar {
  height: 6px;
}
.bt-scroll-area::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.bt-scroll-area::-webkit-scrollbar-thumb {
  background-color: var(--accent-color);
  border-radius: 4px;
}


.bt-scroll-area :deep(.node-block) {
  min-width: max-content; 
}

.root-label {
  font-size: 12px; font-weight: bold; color: var(--accent-color); margin-bottom: 5px;
}
.empty-root { padding: 20px; text-align: center; }
.btn-action { background: rgba(255,255,255,0.1); border: 1px dashed var(--accent-color); color: var(--accent-color); padding: 8px 16px; border-radius: 4px; cursor: pointer;}
.btn-action:hover { background: var(--accent-color); color: white; }
</style>