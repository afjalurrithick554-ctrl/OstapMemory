<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { WifiOff, RefreshCw, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import { fetchAuthStatus } from '@/api/auth'

// Проверяет доступность бэкенда на старте (пинг /auth/status — всегда отвечает,
// исключён из middleware). Пока проверяем — ничего не рендерим (нет мигания
// контента). При ошибке — экран «нет связи» с кнопкой и хоткеем R.
const { t } = useI18n()
const isChecking = ref(true)
const hasError = ref(false)
const checking = ref(false)

async function checkConnection() {
  if (checking.value) return
  checking.value = true
  isChecking.value = true
  hasError.value = false
  try {
    await fetchAuthStatus()
    hasError.value = false
  } catch {
    hasError.value = true
  } finally {
    isChecking.value = false
    checking.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (hasError.value && (e.key === 'r' || e.key === 'R')) {
    e.preventDefault()
    checkConnection()
  }
}

onMounted(() => {
  checkConnection()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="hasError" class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md p-6 text-center">
      <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <WifiOff class="size-6 text-red-600 dark:text-red-400" />
      </div>
      <h2 class="mb-1 text-lg font-semibold">{{ t('common.connectionError') }}</h2>
      <p class="mb-4 text-sm text-muted-foreground">{{ t('common.unableToConnect') }}</p>
      <Button class="w-full" :disabled="checking" @click="checkConnection">
        <RefreshCw class="size-4" />
        {{ t('common.retryConnection') }}
      </Button>
      <p class="mt-3 text-xs text-muted-foreground">{{ t('errors.pressRetry') }}</p>
    </Card>
  </div>
  <div v-else-if="isChecking" class="flex min-h-screen items-center justify-center bg-background">
    <Loader2 class="size-6 animate-spin text-muted-foreground" />
  </div>
  <slot v-else />
</template>
