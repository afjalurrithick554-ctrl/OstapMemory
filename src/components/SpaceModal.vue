<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal__header">
        <h2>Create new space</h2>
        <button class="icon-btn" @click="$emit('close')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal__body">
        <div class="form-group">
          <label>Space Name</label>
          <input 
            type="text" 
            v-model="name" 
            placeholder="e.g. Frontend Architecture" 
            ref="nameInput"
            @keyup.enter="submit"
          />
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--outline" @click="$emit('close')">Cancel</button>
        <button class="btn btn--primary" :disabled="!isValid" @click="submit">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['close', 'submit'])

const name = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const isValid = computed(() => name.value.trim().length > 0)

onMounted(() => {
  if (nameInput.value) {
    nameInput.value.focus()
  }
})

const submit = () => {
  if (isValid.value) {
    emit('submit', name.value.trim())
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--modal-backdrop-bg, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal {
  background: var(--modal-bg, var(--bg-mid));
  color: var(--text-primary);
  border: 1px solid var(--hairline-strong);
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--hairline);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal__header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--modal-title-color);
}

.modal__body {
  padding: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  opacity: 0.8;
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--hairline-strong);
  background: var(--surface);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-purple);
  box-shadow: 0 0 0 3px rgba(124, 62, 240, 0.18);
}

.modal__footer {
  padding: 16px 20px;
  border-top: 1px solid var(--hairline);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--outline {
  background: transparent;
  border: 1px solid var(--hairline-strong);
  color: var(--text-primary);
}

.btn--outline:hover {
  background: var(--surface-hover);
}

.btn--primary {
  background: linear-gradient(135deg, var(--accent-purple-light), var(--accent-purple));
  border: none;
  color: #fff;
  box-shadow: 0 4px 14px -3px rgba(124,62,240,0.5);
}

.btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}
</style>
