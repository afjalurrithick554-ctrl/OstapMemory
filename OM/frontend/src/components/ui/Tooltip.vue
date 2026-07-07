<script setup lang="ts">
import {
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipProvider,
} from 'reka-ui'

defineProps<{ label: string; side?: 'top' | 'right' | 'bottom' | 'left'; disabled?: boolean }>()
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal v-if="!disabled">
        <TooltipContent
          :side="side ?? 'right'"
          :side-offset="8"
          class="z-50 rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground border shadow-md"
        >
          {{ label }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
