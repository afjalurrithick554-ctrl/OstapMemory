<script setup lang="ts">
import { cn } from '@/lib/utils'
defineProps<{ class?: string; placeholder?: string; rows?: number; disabled?: boolean }>()
const model = defineModel<string>()
</script>

<template>
  <textarea
    v-model="model"
    :placeholder="placeholder"
    :rows="rows ?? 3"
    :disabled="disabled"
    :class="cn(
      'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      $props.class,
    )"
  />
</template>
