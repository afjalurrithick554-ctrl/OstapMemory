<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{ title: string; class?: string }>()
const collapsed = ref(false)
</script>

<template>
  <div class="flex min-w-0 flex-col rounded-lg border" :class="cn(collapsed ? 'flex-none' : 'flex-1', props.class)">
    <button
      type="button"
      class="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium hover:bg-accent"
      @click="collapsed = !collapsed"
    >
      <ChevronDown v-if="!collapsed" class="size-4" />
      <ChevronRight v-else class="size-4" />
      {{ title }}
    </button>
    <div v-if="!collapsed" class="flex-1 p-3">
      <slot />
    </div>
  </div>
</template>
