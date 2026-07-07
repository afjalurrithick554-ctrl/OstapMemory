<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import { useDiscoverModels, useRegisterModels } from '@/composables/useCredentials'
import { MODEL_TYPES, MODEL_TYPE_LABELS, providerName } from '@/lib/providers'
import type { Credential, DiscoveredModel, ModelType } from '@/api/credentials'

const props = defineProps<{ credential: Credential | null }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const discover = useDiscoverModels()
const register = useRegisterModels()

const discovered = ref<DiscoveredModel[]>([])
const selected = ref<Set<string>>(new Set())
const modelType = ref<ModelType>('language')
const search = ref('')
const error = ref('')
const done = ref('')

watch(open, async (v) => {
  discovered.value = []
  selected.value = new Set()
  search.value = ''
  error.value = ''
  done.value = ''
  if (!v || !props.credential) return
  modelType.value = (props.credential.modalities[0] as ModelType) || 'language'
  try {
    const res = await discover.mutateAsync(props.credential.id)
    discovered.value = res.discovered
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? discovered.value.filter((m) => m.name.toLowerCase().includes(q)) : discovered.value
})

// Кастомная модель: точного совпадения по поиску нет — позволяем добавить как есть.
const customName = computed(() => {
  const q = search.value.trim()
  if (!q) return ''
  return discovered.value.some((m) => m.name.toLowerCase() === q.toLowerCase()) ? '' : q
})

function toggle(name: string) {
  const s = new Set(selected.value)
  s.has(name) ? s.delete(name) : s.add(name)
  selected.value = s
}

async function doRegister() {
  if (!props.credential) return
  const names = new Set(selected.value)
  if (customName.value) names.add(customName.value)
  if (!names.size) {
    error.value = t('apiKeys.selectModels')
    return
  }
  error.value = ''
  const models = [...names].map((name) => ({
    name,
    provider: props.credential!.provider,
    model_type: modelType.value,
  }))
  try {
    const res = await register.mutateAsync({ id: props.credential.id, models })
    done.value = t('apiKeys.registered', { created: res.created, existing: res.existing })
    selected.value = new Set()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="t('apiKeys.discoverTitle')"
    :description="credential ? providerName(credential.provider) : ''"
  >
    <div class="space-y-4">
      <div class="space-y-1">
        <Label>{{ t('apiKeys.registerAs') }}</Label>
        <select v-model="modelType" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option v-for="ty in MODEL_TYPES" :key="ty" :value="ty">{{ MODEL_TYPE_LABELS[ty] }}</option>
        </select>
      </div>

      <Input v-model="search" :placeholder="t('apiKeys.searchModels')" />

      <div v-if="discover.isPending.value" class="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 class="size-4 animate-spin" />{{ t('apiKeys.discovering') }}
      </div>

      <div v-else class="max-h-[40vh] space-y-1 overflow-y-auto">
        <label v-if="customName" class="flex items-center gap-2 rounded border border-dashed p-2 text-sm">
          <input type="checkbox" checked disabled />
          {{ t('apiKeys.customModel', { name: customName }) }}
        </label>
        <label v-for="m in filtered" :key="m.name" class="flex items-center gap-2 rounded p-2 text-sm hover:bg-muted/50">
          <input type="checkbox" :checked="selected.has(m.name)" @change="toggle(m.name)" />
          <span class="truncate">{{ m.name }}</span>
        </label>
        <p v-if="!filtered.length && !customName" class="py-4 text-center text-sm text-muted-foreground">
          {{ t('apiKeys.noModelsDiscovered') }}
        </p>
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <p v-if="done" class="text-sm text-emerald-600 dark:text-emerald-400">{{ done }}</p>

      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="open = false">{{ t('common.close') }}</Button>
        <Button :disabled="register.isPending.value" @click="doRegister">
          {{ register.isPending.value ? t('common.saving') : t('apiKeys.registerSelected') }}
        </Button>
      </div>
    </div>
  </Dialog>
</template>
