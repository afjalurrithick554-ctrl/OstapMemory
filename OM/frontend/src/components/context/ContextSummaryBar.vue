<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { Calculator, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { useSources } from '@/composables/useSources'
import { useNotes } from '@/composables/useNotes'
import { useContextStore } from '@/stores/context'
import { getNotebookContext } from '@/api/context'
import { isInContext } from '@/types/context'

// Сводка контекста ИИ: сколько источников/заметок включено и оценка токенов (по запросу).
const props = defineProps<{ notebookId: string }>()
const { t } = useI18n()

const id = toRef(props, 'notebookId')
const { data: sources } = useSources(id)
const { data: notes } = useNotes(id)
const ctx = useContextStore()

const includedSources = computed(
  () => (sources.value ?? []).filter((s) => isInContext(ctx.sourceLevel(props.notebookId, s.id))).length,
)
const includedNotes = computed(
  () => (notes.value ?? []).filter((n) => isInContext(ctx.noteLevel(props.notebookId, n.id))).length,
)

// Оценка токенов — ручная (кнопка), чтобы не дёргать API на каждое переключение.
const { data: tokens, isFetching, refetch } = useQuery({
  queryKey: computed(() => ['context-tokens', props.notebookId]),
  queryFn: async () => {
    const cfg = ctx.buildConfig(
      props.notebookId,
      (sources.value ?? []).map((s) => s.id),
      (notes.value ?? []).map((n) => n.id),
    )
    const res = await getNotebookContext(props.notebookId, cfg)
    return res.total_tokens ?? 0
  },
  enabled: false,
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
    <span class="font-medium">{{ t('context.title') }}</span>
    <span class="text-muted-foreground">{{ t('context.sourcesIncluded', { n: includedSources }) }}</span>
    <span class="text-muted-foreground">{{ t('context.notesIncluded', { n: includedNotes }) }}</span>
    <span v-if="tokens != null" class="text-muted-foreground">~{{ tokens }} {{ t('context.tokens') }}</span>
    <Button size="sm" variant="ghost" class="ml-auto h-7 gap-1 px-2 text-xs" :disabled="isFetching" @click="refetch()">
      <component :is="isFetching ? Loader2 : Calculator" class="size-3.5" :class="isFetching && 'animate-spin'" />
      {{ t('context.estimate') }}
    </Button>
  </div>
</template>
