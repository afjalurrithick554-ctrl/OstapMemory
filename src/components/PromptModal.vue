<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="prompt-modal">
      <div class="prompt-modal__header">
        <div class="prompt-modal__title">{{ message }}</div>
        <div class="modal-close-btn" @click="$emit('close')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
      </div>
      <div class="prompt-modal__body">
        <select
          v-if="options && options.length > 0"
          v-model="value"
          class="prompt-input"
          ref="selectRef"
        >
          <option value="">Не выбрано</option>
          <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <input v-else
          type="text" 
          v-model="value" 
          @keyup.enter="submit"
          @keyup.esc="$emit('close')"
          ref="inputRef"
          class="prompt-input"
        >
      </div>
      <div class="prompt-modal__footer">
        <button class="btn btn--secondary" @click="$emit('close')">Cancel</button>
        <button class="btn btn--primary" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps<{
  message: string
  initialValue: string
  options?: Array<{ label: string, value: string }>
}>()

const emit = defineEmits(['close', 'submit'])

const value = ref(props.initialValue)
const inputRef = ref<HTMLInputElement | null>(null)
const selectRef = ref<HTMLSelectElement | null>(null)

onMounted(() => {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
    if (selectRef.value) {
      selectRef.value.focus()
    }
  })
})

const submit = () => {
  emit('submit', value.value)
}
</script>

<style scoped>
.modal-backdrop {
  display: flex;
}
.prompt-modal {
  width: 100%;
  max-width: 400px;
  background: var(--modal-bg);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--modal-shadow);
  display: flex;
  flex-direction: column;
}
.prompt-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--hairline);
}
.prompt-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--modal-title-color);
}
.prompt-modal__body {
  padding: 20px;
}
.prompt-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--accent-purple);
  background: var(--bg-surface-3);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
}
.prompt-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--hairline);
  background: var(--modal-sidebar-bg);
}
.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn--secondary {
  background: var(--surface);
  color: var(--text-secondary);
  border: 1px solid var(--hairline-strong);
}
.btn--secondary:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}
.btn--primary {
  background: linear-gradient(135deg, var(--accent-purple-light), var(--accent-purple));
  color: #fff;
  box-shadow: 0 4px 14px -3px rgba(124,62,240,0.5);
}
.btn--primary:hover {
  opacity: 0.9;
}
</style>
