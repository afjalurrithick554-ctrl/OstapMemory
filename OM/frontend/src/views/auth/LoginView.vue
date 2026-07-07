<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BrainCircuit, AlertCircle } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const password = ref('')
const checking = ref(true)
const connectionFailed = ref(false)

const errorText = computed(() => {
  if (auth.error === 'invalid') return t('auth.invalidPassword')
  if (auth.error === 'connect') return t('auth.connectErrorHint')
  return null
})

onMounted(async () => {
  try {
    const required = await auth.checkAuthRequired()
    if (!required) {
      router.replace({ name: 'notebooks' })
      return
    }
    if (auth.isAuthenticated) {
      router.replace({ name: 'notebooks' })
      return
    }
  } catch {
    connectionFailed.value = true
  } finally {
    checking.value = false
  }
})

async function onSubmit() {
  const ok = await auth.login(password.value)
  if (ok) router.replace({ name: 'notebooks' })
}

function reload() {
  window.location.reload()
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
    <div v-if="checking" class="text-sm text-muted-foreground">{{ t('common.loading') }}</div>

    <Card v-else-if="connectionFailed" class="w-full max-w-md p-6 text-center">
      <h1 class="mb-2 text-xl font-semibold">{{ t('common.connectionError') }}</h1>
      <p class="mb-4 text-sm text-muted-foreground">{{ t('common.unableToConnect') }}</p>
      <div class="mb-4 flex items-start gap-2 text-left text-sm text-destructive">
        <AlertCircle class="mt-0.5 size-4 shrink-0" />
        <span>{{ t('auth.connectErrorHint') }}</span>
      </div>
      <Button class="w-full" @click="reload">
        {{ t('common.retryConnection') }}
      </Button>
    </Card>

    <Card v-else class="w-full max-w-md p-6">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <BrainCircuit class="size-10 text-primary" />
        <h1 class="text-2xl font-semibold tracking-tight">{{ t('auth.loginTitle') }}</h1>
        <p class="text-sm text-muted-foreground">{{ t('auth.loginDesc') }}</p>
      </div>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <Input
          v-model="password"
          type="password"
          :placeholder="t('auth.passwordPlaceholder')"
          :disabled="auth.isLoading"
        />
        <div v-if="errorText" class="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle class="mt-0.5 size-4 shrink-0" />
          <span>{{ errorText }}</span>
        </div>
        <Button type="submit" class="w-full" :disabled="auth.isLoading || !password">
          {{ auth.isLoading ? t('auth.signingIn') : t('auth.signIn') }}
        </Button>
      </form>
    </Card>
  </div>
</template>
