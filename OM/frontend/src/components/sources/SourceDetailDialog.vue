<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ExternalLink, Sparkles } from 'lucide-vue-next'
import Dialog from '@/components/ui/Dialog.vue'
import Badge from '@/components/ui/Badge.vue'
import SourceChat from './SourceChat.vue'
import { useSource, useSourceInsights } from '@/composables/useSources'

const props = defineProps<{ sourceId: string }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const id = toRef(props, 'sourceId')
const { data: source, isLoading } = useSource(id)
const { data: insights } = useSourceInsights(id)

const url = computed(() => source.value?.asset?.url ?? null)
const tab = ref<'content' | 'chat'>('content')
</script>

<template>
  <Dialog v-model:open="open" :title="source?.title || t('sources.untitled')">
    <div class="mb-3 flex gap-2 border-b">
      <button
        type="button" class="border-b-2 px-2 pb-1.5 text-sm"
        :class="tab === 'content' ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'"
        @click="tab = 'content'"
      >{{ t('sources.tabContent') }}</button>
      <button
        type="button" class="border-b-2 px-2 pb-1.5 text-sm"
        :class="tab === 'chat' ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'"
        @click="tab = 'chat'"
      >{{ t('detail.chat') }}</button>
    </div>

    <SourceChat v-if="tab === 'chat'" :source-id="sourceId" />

    <div v-else-if="isLoading" class="py-8 text-center text-sm text-muted-foreground">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="source" class="max-h-[70vh] space-y-4 overflow-y-auto">
      <a v-if="url" :href="url" target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ExternalLink class="size-3.5" />{{ url }}
      </a>

      <div v-if="insights && insights.length" class="space-y-2">
        <p class="flex items-center gap-1 text-sm font-medium">
          <Sparkles class="size-4" />{{ t('sources.insights') }}
        </p>
        <div v-for="ins in insights" :key="ins.id" class="rounded-md border bg-muted/40 p-3">
          <Badge variant="outline" class="mb-1">{{ ins.insight_type }}</Badge>
          <p class="whitespace-pre-wrap text-sm text-muted-foreground">{{ ins.content }}</p>
        </div>
      </div>

      <div v-if="source.full_text" class="space-y-1">
        <p class="text-sm font-medium">{{ t('sources.fullText') }}</p>
        <p class="whitespace-pre-wrap text-sm text-muted-foreground">{{ source.full_text }}</p>
      </div>
      <p v-else-if="!insights?.length" class="text-sm text-muted-foreground">
        {{ t('sources.noContent') }}
      </p>
    </div>
  </Dialog>
</template>
