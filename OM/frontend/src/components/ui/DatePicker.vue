<script setup lang="ts">
// Простой DatePicker на нативном input[type=date] (значение — строка YYYY-MM-DD).
import { cn } from '@/lib/utils'
defineProps<{ class?: string; disabled?: boolean }>()
const model = defineModel<string | null>()
</script>

<template>
  <input
    type="date"
    :value="model ?? ''"
    :disabled="disabled"
    :class="cn(
      'flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      '[color-scheme:light] dark:[color-scheme:dark]',
      $props.class,
    )"
    @change="model = ($event.target as HTMLInputElement).value || null"
  />
</template>
