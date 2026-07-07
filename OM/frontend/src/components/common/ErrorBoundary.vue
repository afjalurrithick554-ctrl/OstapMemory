<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, RefreshCw } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'

// Перехватывает ошибки рендера/жизненного цикла дочерних компонентов
// (аналог React ErrorBoundary). Показывает запасной экран с возможностью
// сбросить ошибку или перезагрузить страницу.
const { t } = useI18n()
const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err) => {
  console.error('Ошибка поймана ErrorBoundary:', err)
  hasError.value = true
  errorMessage.value = err instanceof Error ? err.toString() : String(err)
  return false // не пробрасываем дальше
})

function reset() {
  hasError.value = false
  errorMessage.value = ''
}

function reload() {
  window.location.reload()
}
</script>

<template>
  <div v-if="hasError" class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md p-6 text-center">
      <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertTriangle class="size-6 text-red-600 dark:text-red-400" />
      </div>
      <h2 class="mb-1 text-lg font-semibold text-red-900 dark:text-red-100">{{ t('errors.title') }}</h2>
      <p class="mb-4 text-sm text-muted-foreground">{{ t('errors.unexpected') }}</p>
      <details v-if="errorMessage" class="mb-4 rounded border bg-muted p-3 text-left text-xs">
        <summary class="cursor-pointer font-medium">{{ t('errors.details') }}</summary>
        <pre class="mt-2 whitespace-pre-wrap break-all">{{ errorMessage }}</pre>
      </details>
      <div class="space-y-2">
        <Button variant="outline" class="w-full" @click="reset">
          <RefreshCw class="size-4" />
          {{ t('errors.tryAgain') }}
        </Button>
        <Button class="w-full" @click="reload">{{ t('errors.refresh') }}</Button>
      </div>
    </Card>
  </div>
  <slot v-else />
</template>
