<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useCreateCredential, useUpdateCredential } from '@/composables/useCredentials'
import {
  ALL_PROVIDERS, PROVIDER_MODALITIES, MODEL_TYPES, MODEL_TYPE_LABELS, NO_API_KEY_PROVIDERS, providerName,
} from '@/lib/providers'
import type { Credential, ModelType } from '@/api/credentials'

const props = defineProps<{ credential?: Credential | null }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const create = useCreateCredential()
const update = useUpdateCredential()

const provider = ref('openai')
const name = ref('')
const apiKey = ref('')
const baseUrl = ref('')
const modalities = ref<ModelType[]>([])
const showKey = ref(false)
const error = ref('')

const isEditing = computed(() => !!props.credential)
const requiresApiKey = computed(() => !NO_API_KEY_PROVIDERS.includes(provider.value))

watch(open, (v) => {
  if (!v) return
  const c = props.credential
  if (c) {
    provider.value = c.provider
    name.value = c.name
    baseUrl.value = c.base_url ?? ''
    modalities.value = (c.modalities as ModelType[]) ?? []
  } else {
    provider.value = 'openai'
    name.value = ''
    baseUrl.value = ''
    modalities.value = PROVIDER_MODALITIES['openai'] ?? ['language']
  }
  apiKey.value = ''
  showKey.value = false
  error.value = ''
})

// При смене провайдера (только на создании) подставляем дефолтные модальности.
watch(provider, (p) => {
  if (isEditing.value) return
  modalities.value = PROVIDER_MODALITIES[p] ?? ['language']
})

function toggleModality(m: ModelType) {
  modalities.value = modalities.value.includes(m)
    ? modalities.value.filter((x) => x !== m)
    : [...modalities.value, m]
}

async function submit() {
  if (!modalities.value.length) {
    error.value = t('apiKeys.modalitiesRequired')
    return
  }
  if (!isEditing.value && requiresApiKey.value && !apiKey.value.trim()) {
    error.value = t('apiKeys.apiKeyRequired')
    return
  }
  error.value = ''
  try {
    if (props.credential) {
      await update.mutateAsync({
        id: props.credential.id,
        body: {
          name: name.value || undefined,
          modalities: modalities.value,
          api_key: apiKey.value || undefined,
          base_url: baseUrl.value || undefined,
        },
      })
    } else {
      await create.mutateAsync({
        name: name.value || `${providerName(provider.value)} Config`,
        provider: provider.value,
        modalities: modalities.value,
        api_key: apiKey.value || undefined,
        base_url: baseUrl.value || undefined,
      })
    }
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="isEditing ? t('apiKeys.editConfig') : t('apiKeys.addConfig')"
    :description="t('apiKeys.configDesc')"
  >
    <div class="space-y-4">
      <div class="space-y-1">
        <Label>{{ t('apiKeys.provider') }}</Label>
        <select v-model="provider" :disabled="isEditing" class="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60">
          <option v-for="p in ALL_PROVIDERS" :key="p" :value="p">{{ providerName(p) }}</option>
        </select>
      </div>

      <div class="space-y-1">
        <Label>{{ t('apiKeys.configName') }}</Label>
        <Input v-model="name" :placeholder="`${providerName(provider)} Production`" />
      </div>

      <div class="space-y-1">
        <Label>{{ t('apiKeys.apiKey') }}<span v-if="requiresApiKey" class="text-destructive"> *</span></Label>
        <div class="relative">
          <Input v-model="apiKey" :type="showKey ? 'text' : 'password'"
            :placeholder="isEditing ? t('apiKeys.apiKeyKeep') : 'sk-...'" class="pr-9" />
          <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" @click="showKey = !showKey">
            <component :is="showKey ? EyeOff : Eye" class="size-4" />
          </button>
        </div>
      </div>

      <div class="space-y-1">
        <Label>{{ t('apiKeys.baseUrl') }}</Label>
        <Input v-model="baseUrl" placeholder="https://..." />
      </div>

      <div class="space-y-1">
        <Label>{{ t('apiKeys.modalities') }}</Label>
        <div class="flex flex-wrap gap-3">
          <label v-for="m in MODEL_TYPES" :key="m" class="flex items-center gap-1.5 text-sm">
            <input type="checkbox" :checked="modalities.includes(m)" @change="toggleModality(m)" />
            {{ MODEL_TYPE_LABELS[m] }}
          </label>
        </div>
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
        <Button :disabled="create.isPending.value || update.isPending.value" @click="submit">{{ t('common.save') }}</Button>
      </div>
    </div>
  </Dialog>
</template>
