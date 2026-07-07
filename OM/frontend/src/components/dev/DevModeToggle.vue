<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Bug } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import Tooltip from '@/components/ui/Tooltip.vue'
import { useDevStore } from '@/stores/dev'

// iconOnly — компактный режим для свёрнутого сайдбара.
defineProps<{ iconOnly?: boolean }>()

const { t } = useI18n()
const dev = useDevStore()
const { isDevMode } = storeToRefs(dev)
</script>

<template>
  <Tooltip :label="t('dev.toggle')" :disabled="!iconOnly">
    <button
      class="dev-toggle flex w-full items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors"
      :class="isDevMode
        ? 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90'
        : 'hover:bg-sidebar-accent'"
      :aria-label="t('dev.toggle')"
      @click="dev.toggle()"
    >
      <Bug class="size-4 shrink-0" />
      <span v-if="!iconOnly">{{ isDevMode ? t('dev.on') : t('dev.off') }}</span>
    </button>
  </Tooltip>
</template>
