<script setup lang="ts">
import { useI18n } from 'vue-i18n'
defineProps<{ titleKey: string }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <h1 class="text-3xl font-semibold tracking-tight">{{ t(titleKey) }}</h1>
    <p class="max-w-md text-sm text-muted-foreground">{{ t('pages.placeholderHint') }}</p>
  </div>
</template>
