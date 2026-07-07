<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus, Pencil, Trash2, Sparkles, CheckCircle2, KeyRound } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import CredentialFormDialog from '@/components/settings/CredentialFormDialog.vue'
import DiscoverModelsDialog from '@/components/settings/DiscoverModelsDialog.vue'
import { useCredentials, useDeleteCredential, useTestCredential } from '@/composables/useCredentials'
import { useAllModels, useDeleteModel, useTestModel } from '@/composables/useModels'
import { providerName, MODEL_TYPE_LABELS } from '@/lib/providers'
import type { Credential, ModelType } from '@/api/credentials'
import type { AiModel } from '@/api/models'
import DefaultModelsCard from '@/components/settings/DefaultModelsCard.vue'

const { t } = useI18n()
const router = useRouter()

const { data: credentials, isLoading } = useCredentials()
const delCred = useDeleteCredential()
const testCred = useTestCredential()

const { data: models } = useAllModels()
const delModel = useDeleteModel()
const testModelMut = useTestModel()

// Сообщения теста (по id).
const testMsg = ref<Record<string, string>>({})

async function runTestCredential(c: Credential) {
  testMsg.value = { ...testMsg.value, [c.id]: t('apiKeys.testing') }
  try {
    const r = await testCred.mutateAsync(c.id)
    testMsg.value = { ...testMsg.value, [c.id]: r.message || (r.success ? t('apiKeys.testOk') : t('apiKeys.testFail')) }
  } catch (e) {
    testMsg.value = { ...testMsg.value, [c.id]: e instanceof Error ? e.message : String(e) }
  }
}

async function runTestModel(m: AiModel) {
  testMsg.value = { ...testMsg.value, [m.id]: t('apiKeys.testing') }
  try {
    const r = await testModelMut.mutateAsync(m.id)
    testMsg.value = { ...testMsg.value, [m.id]: r.message || (r.success ? t('apiKeys.testOk') : t('apiKeys.testFail')) }
  } catch (e) {
    testMsg.value = { ...testMsg.value, [m.id]: e instanceof Error ? e.message : String(e) }
  }
}

// Модели, сгруппированные по типу.
const modelsByType = computed(() => {
  const out: Record<string, AiModel[]> = {}
  for (const m of models.value ?? []) (out[m.type] ??= []).push(m)
  return out
})

// --- dialogs ---
const formOpen = ref(false)
const editing = ref<Credential | null>(null)
function addCredential() { editing.value = null; formOpen.value = true }
function editCredential(c: Credential) { editing.value = c; formOpen.value = true }

const discoverOpen = ref(false)
const discoverCred = ref<Credential | null>(null)
function openDiscover(c: Credential) { discoverCred.value = c; discoverOpen.value = true }

function removeCredential(c: Credential) {
  if (confirm(t('apiKeys.deleteCredentialConfirm', { name: c.name }))) delCred.mutate(c.id)
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 p-6">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" class="size-8" @click="router.push('/settings')"><ArrowLeft class="size-4" /></Button>
      <h1 class="text-2xl font-semibold tracking-tight">{{ t('pages.apiKeys') }}</h1>
      <Button class="ml-auto" @click="addCredential"><Plus class="size-4" />{{ t('apiKeys.addConfig') }}</Button>
    </div>
    <p class="text-sm text-muted-foreground">{{ t('apiKeys.pageDesc') }}</p>

    <!-- Credentials -->
    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('apiKeys.credentials') }}</h2>
      <div v-if="isLoading" class="py-8 text-center text-sm text-muted-foreground">{{ t('common.loading') }}</div>
      <div v-else-if="!credentials?.length" class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        {{ t('apiKeys.noCredentials') }}
      </div>
      <div v-else class="space-y-3">
        <Card v-for="c in credentials" :key="c.id" class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold">{{ providerName(c.provider) }}</span>
                <span class="text-sm text-muted-foreground">{{ c.name }}</span>
                <Badge v-if="c.has_api_key" variant="secondary" class="gap-1"><KeyRound class="size-3" />{{ t('apiKeys.keySet') }}</Badge>
              </div>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <Badge v-for="m in c.modalities" :key="m" variant="outline">{{ MODEL_TYPE_LABELS[m as ModelType] ?? m }}</Badge>
                <Badge variant="outline">{{ t('apiKeys.modelsCount', { n: c.model_count }) }}</Badge>
              </div>
              <p v-if="c.decryption_error" class="mt-1 text-xs text-destructive">{{ c.decryption_error }}</p>
              <p v-if="testMsg[c.id]" class="mt-1 text-xs text-muted-foreground">{{ testMsg[c.id] }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-1">
              <Button variant="outline" size="sm" :disabled="testCred.isPending.value" @click="runTestCredential(c)">{{ t('apiKeys.test') }}</Button>
              <Button variant="outline" size="sm" @click="openDiscover(c)"><Sparkles class="size-4" />{{ t('apiKeys.discover') }}</Button>
              <Button variant="ghost" size="icon" class="size-8" @click="editCredential(c)"><Pencil class="size-4" /></Button>
              <Button variant="ghost" size="icon" class="size-8 text-destructive" @click="removeCredential(c)"><Trash2 class="size-4" /></Button>
            </div>
          </div>
        </Card>
      </div>
    </section>

    <!-- Registered models -->
    <section class="space-y-3">
      <h2 class="text-lg font-medium">{{ t('apiKeys.registeredModels') }}</h2>
      <div v-if="!models?.length" class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        {{ t('apiKeys.noModels') }}
      </div>
      <div v-else class="space-y-4">
        <div v-for="(list, type) in modelsByType" :key="type">
          <p class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ MODEL_TYPE_LABELS[type as ModelType] ?? type }}</p>
          <div class="space-y-2">
            <Card v-for="m in list" :key="m.id" class="flex items-center justify-between gap-3 p-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ m.name }}</p>
                <p class="text-xs text-muted-foreground">{{ providerName(m.provider) }}</p>
                <p v-if="testMsg[m.id]" class="text-xs text-muted-foreground">{{ testMsg[m.id] }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <Button variant="outline" size="sm" :disabled="testModelMut.isPending.value" @click="runTestModel(m)">
                  <CheckCircle2 class="size-4" />{{ t('apiKeys.test') }}
                </Button>
                <Button variant="ghost" size="icon" class="size-8 text-destructive" @click="delModel.mutate(m.id)"><Trash2 class="size-4" /></Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>

    <!-- Default models -->
    <DefaultModelsCard />

    <CredentialFormDialog v-model:open="formOpen" :credential="editing" />
    <DiscoverModelsDialog v-model:open="discoverOpen" :credential="discoverCred" />
  </div>
</template>
