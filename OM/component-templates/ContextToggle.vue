<script setup lang="ts">
// Компактный сегментный переключатель «уровень в контексте ИИ».
// Универсален: источник (3 уровня) и заметка (2 уровня) передают свой набор опций.
import type { Component } from 'vue'
import Tooltip from '@/components/ui/Tooltip.vue'

interface Option {
  value: string
  label: string
  icon: Component
}

defineProps<{ options: Option[] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5">
    <Tooltip v-for="opt in options" :key="opt.value" :label="opt.label" side="top">
      <button
        type="button"
        class="flex size-6 items-center justify-center rounded transition-colors"
        :class="model === opt.value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
        :aria-label="opt.label"
        :aria-pressed="model === opt.value"
        @click="model = opt.value"
      >
        <component :is="opt.icon" class="size-3.5" />
      </button>
    </Tooltip>
  </div>
</template>
