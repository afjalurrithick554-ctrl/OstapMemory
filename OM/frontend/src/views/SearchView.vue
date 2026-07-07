<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Search as SearchIcon, MessageCircleQuestion, AlertCircle, ChevronDown, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import { useSearch, useAsk } from '@/composables/useSearch'
import { useDefaultModels } from '@/composables/useModels'
import { renderMarkdown } from '@/lib/markdown'
import type { SearchType } from '@/types/search'

const { t } = useI18n()
const router = useRouter()

const tab = ref<'ask' | 'search'>('ask')

// --- Search ---
const searchQuery = ref('')
const searchType = ref<SearchType>('text')
const searchSources = ref(true)
const searchNotes = ref(true)
const searchMutation = useSearch()

const { data: defaults } = useDefaultModels()
const hasEmbedding = computed(() => !!defaults.value?.default_embedding_model)

function runSearch() {
  if (!searchQuery.value.trim()) return
  searchMutation.mutate({
    query: searchQuery.value,
    type: searchType.value,
    search_sources: searchSources.value,
    search_notes: searchNotes.value,
  })
}

const expanded = ref<Set<number>>(new Set())
function toggleMatches(i: number) {
  const s = new Set(expanded.value)
  s.has(i) ? s.delete(i) : s.add(i)
  expanded.value = s
}

// Открыть источник/заметку из результата (parent_id вида "source:id" / "note:id" / "source_insight:id")
function openResult(parentId?: string | null) {
  if (!parentId) return
  const [type] = parentId.split(':')
  // Прямой роут к источнику/заметке появится в Фазе 5+; пока ведём в поиск-контекст ячейки нет —
  // источники/инсайты открываются внутри ячейки. Здесь только подсветка типа.
  if (type === 'note') router.push('/notebooks')
}

// --- Ask ---
const askQuestion = ref('')
const ask = useAsk()
const chatModel = computed(() => defaults.value?.default_chat_model || '')

function runAsk() {
  if (!askQuestion.value.trim() || !chatModel.value) return
  ask.ask(askQuestion.value, {
    strategy_model: chatModel.value,
    answer_model: chatModel.value,
    final_answer_model: chatModel.value,
  })
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-6">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight">{{ t('search.title') }}</h1>

    <!-- Tabs -->
    <div class="mb-6 inline-flex rounded-md border p-0.5">
      <button
        class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm"
        :class="tab === 'ask' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
        @click="tab = 'ask'"
      >
        <MessageCircleQuestion class="size-4" />{{ t('search.ask') }}
      </button>
      <button
        class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm"
        :class="tab === 'search' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
        @click="tab = 'search'"
      >
        <SearchIcon class="size-4" />{{ t('search.search') }}
      </button>
    </div>

    <!-- ASK -->
    <Card v-if="tab === 'ask'" class="space-y-4 p-5">
      <div>
        <h2 class="text-lg font-medium">{{ t('search.askTitle') }}</h2>
        <p class="text-sm text-muted-foreground">{{ t('search.askDesc') }}</p>
      </div>

      <Textarea
        v-model="askQuestion"
        :placeholder="t('search.questionPlaceholder')"
        :rows="3"
        :disabled="ask.isStreaming.value"
        @keydown.ctrl.enter="runAsk"
        @keydown.meta.enter="runAsk"
      />

      <div v-if="!hasEmbedding" class="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-600 dark:bg-amber-950/20 dark:text-amber-500">
        <AlertCircle class="size-4 shrink-0" />{{ t('search.noEmbeddingModel') }}
      </div>

      <Button class="w-full" :disabled="ask.isStreaming.value || !askQuestion.trim() || !chatModel" @click="runAsk">
        <Loader2 v-if="ask.isStreaming.value" class="size-4 animate-spin" />
        {{ ask.isStreaming.value ? t('search.processing') : t('search.askBtn') }}
      </Button>

      <div v-if="ask.error.value" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{{ ask.error.value }}</div>

      <!-- Стратегия -->
      <div v-if="ask.strategy.value" class="rounded-md border bg-muted/40 p-3 text-sm">
        <p class="mb-1 font-medium">{{ t('search.strategy') }}</p>
        <p class="text-muted-foreground">{{ ask.strategy.value.reasoning }}</p>
        <ul class="mt-2 space-y-1">
          <li v-for="(s, i) in ask.strategy.value.searches" :key="i" class="text-xs text-muted-foreground">
            <Badge variant="outline" class="mr-1">{{ s.term }}</Badge>{{ s.instructions }}
          </li>
        </ul>
      </div>

      <!-- Промежуточные ответы -->
      <div v-if="ask.answers.value.length" class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('search.partialAnswers') }}</p>
        <div v-for="(a, i) in ask.answers.value" :key="i" class="md-body rounded-md border p-3 text-sm" v-html="renderMarkdown(a)" />
      </div>

      <!-- Финальный ответ -->
      <div v-if="ask.finalAnswer.value">
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ t('search.finalAnswer') }}</p>
        <div class="md-body rounded-md border bg-card p-4 text-sm" v-html="renderMarkdown(ask.finalAnswer.value)" />
      </div>
    </Card>

    <!-- SEARCH -->
    <Card v-else class="space-y-4 p-5">
      <div>
        <h2 class="text-lg font-medium">{{ t('search.search') }}</h2>
        <p class="text-sm text-muted-foreground">{{ t('search.searchDesc') }}</p>
      </div>

      <div class="flex gap-2">
        <Input
          v-model="searchQuery"
          :placeholder="t('search.searchPlaceholder')"
          class="flex-1"
          @keydown.enter="runSearch"
        />
        <Button :disabled="searchMutation.isPending.value || !searchQuery.trim()" @click="runSearch">
          <Loader2 v-if="searchMutation.isPending.value" class="size-4 animate-spin" />
          <SearchIcon v-else class="size-4" />
          {{ t('search.search') }}
        </Button>
      </div>

      <!-- Тип поиска -->
      <div class="space-y-2">
        <p class="text-sm font-medium">{{ t('search.searchType') }}</p>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" value="text" v-model="searchType" />{{ t('search.textSearch') }}
        </label>
        <label class="flex items-center gap-2 text-sm" :class="!hasEmbedding ? 'text-muted-foreground' : ''">
          <input type="radio" value="vector" v-model="searchType" :disabled="!hasEmbedding" />{{ t('search.vectorSearch') }}
        </label>
        <p v-if="!hasEmbedding" class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
          <AlertCircle class="size-3.5" />{{ t('search.vectorSearchWarning') }}
        </p>
      </div>

      <!-- Где искать -->
      <div class="space-y-2">
        <p class="text-sm font-medium">{{ t('search.searchIn') }}</p>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="searchSources" />{{ t('search.searchSources') }}</label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="searchNotes" />{{ t('search.searchNotes') }}</label>
      </div>

      <!-- Результаты -->
      <div v-if="searchMutation.data.value" class="space-y-3 border-t pt-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium">{{ t('search.resultsFound', { count: searchMutation.data.value.total_count }) }}</h3>
          <Badge variant="outline">{{ searchMutation.data.value.search_type === 'text' ? t('search.textSearch') : t('search.vectorSearch') }}</Badge>
        </div>

        <p v-if="!searchMutation.data.value.results.length" class="py-6 text-center text-sm text-muted-foreground">
          {{ t('search.noResults') }}
        </p>

        <div v-else class="space-y-2">
          <Card v-for="(r, i) in searchMutation.data.value.results" :key="i" class="p-3">
            <div class="flex items-center gap-2">
              <button class="font-medium text-primary hover:underline" @click="openResult(r.parent_id)">
                {{ r.title || t('search.untitled') }}
              </button>
              <Badge v-if="r.final_score != null" variant="secondary">{{ r.final_score.toFixed(2) }}</Badge>
            </div>
            <div v-if="r.matches && r.matches.length" class="mt-2">
              <button class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" @click="toggleMatches(i)">
                <ChevronDown class="size-3.5 transition-transform" :class="expanded.has(i) ? '' : '-rotate-90'" />
                {{ t('search.matches', { count: r.matches.length }) }}
              </button>
              <div v-if="expanded.has(i)" class="mt-1 space-y-1">
                <div v-for="(m, mi) in r.matches" :key="mi" class="border-l-2 border-muted py-1 pl-3 text-sm text-muted-foreground">{{ m }}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Card>
  </div>
</template>
