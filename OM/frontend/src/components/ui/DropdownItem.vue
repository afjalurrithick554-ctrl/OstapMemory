<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui'
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <DropdownMenuItem
    :class="cn(
      'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
      $props.class,
    )"
    @select="emit('select')"
  >
    <slot />
  </DropdownMenuItem>
</template>
