<template>
  <div class="app-header">
    <div class="app-header__left">
      <div class="app-logo">OM</div>
      <div>
        <div class="board-title" style="display: flex; align-items: center; gap: 8px;">
          <template v-if="fields.length === 0">
            <span class="clickable-title" @click="$emit('add-field')">+ Add space</span>
          </template>
          <template v-else>
            <div class="space-dropdown-container" v-click-outside="closeDropdown">
              <span class="clickable-title" @click="isDropdownOpen = !isDropdownOpen">
                {{ activeFieldName }}
                <svg class="dropdown-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </span>
              
              <div v-if="isDropdownOpen" class="space-dropdown">
                <div 
                  v-for="field in fields" 
                  :key="field.id" 
                  class="space-dropdown__item"
                  :class="{ 'is-active': field.id === activeFieldId }"
                  @click="selectField(field.id)"
                >
                  {{ field.name }}
                </div>
                <div class="space-dropdown__divider"></div>
                <div class="space-dropdown__item text-accent" @click="handleAddSpace">
                  + Add space
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="board-title__sub" v-if="fields.length > 0">Sheet</div>
      </div>
    </div>
    
    <div class="app-header__right">
      <div class="search-box">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" placeholder="Search cards, tags..." />
      </div>
      
      <div class="dev-toggle" style="display: flex; align-items: center; gap: 8px; margin-right: 16px;">
        <label for="dev-switch" style="font-size: 12px; opacity: 0.8;">Dev Mode</label>
        <input 
          type="checkbox" 
          id="dev-switch" 
          :checked="isDevMode" 
          @change="$emit('update:isDevMode', ($event.target as HTMLInputElement).checked)"
        />
      </div>

      <div class="icon-btn" @click="$emit('toggle-theme')">
        <!-- Sun icon for dark theme -->
        <svg class="theme-toggle__icon--sun" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        <!-- Moon icon for light theme -->
        <svg class="theme-toggle__icon--moon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
      </div>
      
      <div class="avatar-group">
        <img src="https://i.pravatar.cc/150?img=11" alt="User 1">
        <img src="https://i.pravatar.cc/150?img=12" alt="User 2">
        <img src="https://i.pravatar.cc/150?img=33" alt="User 3">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  fields: Array<any>
  activeFieldId: string | null
  isDevMode: boolean
}>()

const activeFieldName = computed(() => {
  const field = props.fields.find(f => f.id === props.activeFieldId)
  return field ? field.name : ''
})

const isDropdownOpen = ref(false)

const closeDropdown = () => {
  isDropdownOpen.value = false
}

const emit = defineEmits(['toggle-theme', 'add-field', 'update:isDevMode', 'select-field'])

const selectField = (id: string) => {
  emit('select-field', id)
  closeDropdown()
}

const handleAddSpace = () => {
  emit('add-field')
  closeDropdown()
}

// Простая директива v-click-outside прямо в компоненте
const vClickOutside = {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: any) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}
</script>

<style scoped>
.clickable-title {
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.clickable-title:hover {
  opacity: 1;
}
.dropdown-icon {
  margin-top: 2px;
}

.space-dropdown-container {
  position: relative;
}

.space-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  background: var(--bg-surface-2, #1f1f23);
  border: 1px solid var(--border-color, #2a2a30);
  border-radius: 8px;
  padding: 4px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  min-width: 160px;
}

.space-dropdown__item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.space-dropdown__item:hover {
  background: var(--bg-surface-3, #2a2a30);
  color: var(--text-primary);
}
.space-dropdown__item.is-active {
  color: var(--text-primary);
  background: var(--bg-surface-3, #2a2a30);
}
.space-dropdown__item.text-accent {
  color: var(--accent-purple, #9d5bfe);
}

.space-dropdown__divider {
  height: 1px;
  background: var(--border-color, #2a2a30);
  margin: 4px 0;
}

/* Скрываем дропдаун на десктопе, если хотите, чтобы он был только на мобилке (или оставляем везде для удобства) */
@media (min-width: 769px) {
  /* Мы можем оставить его везде, так как это удобно и на десктопе */
}
</style>
