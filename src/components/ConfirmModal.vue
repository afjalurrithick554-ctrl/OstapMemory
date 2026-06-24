<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="confirm-modal">
      <div class="confirm-modal__header">
        <div class="confirm-modal__title">Confirm Action</div>
        <div class="modal-close-btn" @click="$emit('close')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
      </div>
      <div class="confirm-modal__body">
        <p>{{ message }}</p>
      </div>
      <div class="confirm-modal__footer">
        <button class="btn btn--secondary" @click="$emit('close')">Cancel</button>
        <button class="btn btn--danger" @click="$emit('submit')">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string
}>()

defineEmits(['close', 'submit'])
</script>

<style scoped>
.modal-backdrop {
  display: flex;
}
.confirm-modal {
  width: 100%;
  max-width: 400px;
  background: var(--modal-bg);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--modal-shadow);
  display: flex;
  flex-direction: column;
}
.confirm-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--hairline);
}
.confirm-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--modal-title-color);
}
.confirm-modal__body {
  padding: 24px 20px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}
.confirm-modal__body p {
  margin: 0;
}
.confirm-modal__footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--hairline);
  background: var(--modal-sidebar-bg);
}
.btn {
  padding: 8px 24px;
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
.btn--danger {
  background: #e0398d;
  color: #fff;
  box-shadow: 0 4px 14px -3px rgba(224, 57, 141, 0.4);
}
.btn--danger:hover {
  opacity: 0.9;
}
</style>
