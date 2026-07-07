<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Wand2, Play, RefreshCw, Plus, Settings, ChevronDown, ChevronRight, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Label from '@/components/ui/Label.vue'
import ExpandableTextarea from '@/components/ui/ExpandableTextarea.vue'
import TransformationCard from '@/components/transformations/TransformationCard.vue'
import TransformationEditorDialog from '@/components/transformations/TransformationEditorDialog.vue'
import {
  useTransformations,
  useDefaultPrompt,
  useUpdateDefaultPrompt,
  useExecuteTransformation,
} from '@/composables/useTransformations'
import { useLanguageModels, useDefaultModels } from '@/composables/useModels'
import { renderMarkdown } from '@/lib/markdown'
import type { Transformation } from '@/types/transformation'

const { t } = useI18n()
const { data: transformations, isLoading, refetch } = useTransformations()

const tab = ref<'list' | 'playground'>('list')

// --- Editor dialog ---
const editorOpen = ref(false)
const editing = ref<Transformation | null>(null)
function openCreate() {
  editing.value = null
  editorOpen.value = true
}
function openEdit(tr: Transformation) {
  editing.value = tr
  editorOpen.value = true
}

// --- Default prompt ---
const promptOpen = ref(false)
const { data: defaultPrompt } = useDefaultPrompt()
const updatePrompt = useUpdateDefaultPrompt()
const promptText = ref('')
watch(defaultPrompt, (v) => { if (v) promptText.value = v.transformation_instructions || '' }, { immediate: true })
function saveDefaultPrompt() {
  updatePrompt.mutate({ transformation_instructions: promptText.value })
}

// --- Playground ---
const pgTransformation = ref('')
const pgModel = ref('')
const pgInput = ref('')
const pgOutput = ref('')
const execute = useExecuteTransformation()
const { data: languageModels } = useLanguageModels()
const { data: modelDefaults } = useDefaultModels()
watch(modelDefaults, (v) => { if (v?.default_transformation_model && !pgModel.value) pgModel.value = v.default_transformation_model }, { immediate: true })

function openPlayground(tr: Transformation) {
  pgTransformation.value = tr.id
  tab.value = 'playground'
}

async function runPlayground() {
  if (!pgTransformation.value || !pgModel.value || !pgInput.value.trim()) return
  const res = await execute.mutateAsync({
    transformation_id: pgTransformation.value,
    input_text: pgInput.value,
    model_id: pgModel.value,
  })
  pgOutput.value = res.output
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-6">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">{{ t('transformations.title') }}</h1>
      <Button variant="ghost" size="icon" class="size-8" @click="refetch()">
        <RefreshCw class="size-4" :class="isLoading ? 'animate-spin' : ''" />
      </Button>
      <Button class="ml-auto" @click="openCreate"><Plus class="size-4" />{{ t('transformations.createNew') }}</Button>
    </div>
    <p class="text-sm text-muted-foreground">{{ t('transformations.desc') }}</p>

    <!-- Tabs -->
    <div class="inline-flex rounded-md border p-0.5">
      <button class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm" :class="tab === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'" @click="tab = 'list'">
        <Wand2 class="size-4" />{{ t('transformations.title') }}
      </button>
      <button class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm" :class="tab === 'playground' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'" @click="tab = 'playground'">
        <Play class="size-4" />{{ t('transformations.playground') }}
      </button>
    </div>

    <!-- LIST -->
    <div v-if="tab === 'list'" class="space-y-4">
      <!-- Default prompt (collapsible) -->
      <Card class="p-0">
        <button class="flex w-full items-center justify-between p-4 text-left" @click="promptOpen = !promptOpen">
          <span class="flex items-center gap-2">
            <Settings class="size-5" />
            <span>
              <span class="block font-medium">{{ t('transformations.defaultPrompt') }}</span>
              <span class="block text-sm text-muted-foreground">{{ t('transformations.defaultPromptDesc') }}</span>
            </span>
          </span>
          <component :is="promptOpen ? ChevronDown : ChevronRight" class="size-5" />
        </button>
        <div v-if="promptOpen" class="space-y-3 border-t p-4">
          <ExpandableTextarea v-model="promptText" :rows="8" input-class="font-mono" :placeholder="t('transformations.defaultPromptPlaceholder')" :title="t('transformations.defaultPrompt')" />
          <div class="flex justify-end">
            <Button :disabled="updatePrompt.isPending.value" @click="saveDefaultPrompt">{{ t('common.save') }}</Button>
          </div>
        </div>
      </Card>

      <div v-if="isLoading" class="py-10 text-center text-sm text-muted-foreground">{{ t('common.loading') }}</div>
      <div v-else-if="!transformations?.length" class="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        {{ t('transformations.empty') }}
      </div>
      <div v-else class="space-y-3">
        <TransformationCard
          v-for="tr in transformations"
          :key="tr.id"
          :transformation="tr"
          @playground="openPlayground(tr)"
          @edit="openEdit(tr)"
        />
      </div>
    </div>

    <!-- PLAYGROUND -->
    <Card v-else class="space-y-4 p-5">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="space-y-1">
          <Label>{{ t('transformations.transformation') }}</Label>
          <select v-model="pgTransformation" class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="" disabled>{{ t('transformations.selectToStart') }}</option>
            <option v-for="tr in transformations" :key="tr.id" :value="tr.id">{{ tr.name }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <Label>{{ t('transformations.model') }}</Label>
          <select v-model="pgModel" class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="" disabled>{{ t('transformations.selectModel') }}</option>
            <option v-for="m in languageModels" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
      </div>

      <div class="space-y-1">
        <Label>{{ t('transformations.inputLabel') }}</Label>
        <ExpandableTextarea v-model="pgInput" :rows="8" input-class="font-mono" :placeholder="t('transformations.inputPlaceholder')" :title="t('transformations.inputLabel')" />
      </div>

      <div class="flex justify-center">
        <Button :disabled="!pgTransformation || !pgModel || !pgInput.trim() || execute.isPending.value" @click="runPlayground">
          <Loader2 v-if="execute.isPending.value" class="size-4 animate-spin" />
          <Play v-else class="size-4" />
          {{ execute.isPending.value ? t('transformations.running') : t('transformations.runTest') }}
        </Button>
      </div>

      <div v-if="pgOutput" class="space-y-1">
        <Label>{{ t('transformations.outputLabel') }}</Label>
        <div class="md-body max-h-[400px] overflow-y-auto rounded-md border bg-card p-4 text-sm" v-html="renderMarkdown(pgOutput)" />
      </div>
    </Card>

    <TransformationEditorDialog v-model:open="editorOpen" :transformation="editing" />
  </div>
</template>
