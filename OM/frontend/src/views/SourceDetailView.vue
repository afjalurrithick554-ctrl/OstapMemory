<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import SourceChat from '@/components/sources/SourceChat.vue'
import { useSource, useSourceInsights } from '@/composables/useSources'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const sourceId = computed(() => route.params.id as string)
const { data: source, isLoading } = useSource(sourceId)
const { data: insights } = useSourceInsights(sourceId)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Назад -->
    <div class="shrink-0 px-6 pb-4 pt-6">
      <Button variant="ghost" size="sm" @click="router.push('/sources')">
        <ArrowLeft class="mr-2 size-4" />
        {{ t('common.back') }}
      </Button>
    </div>

    <!-- Основной контент -->
    <div class="grid flex-1 gap-6 overflow-hidden px-6 pb-6 lg:grid-cols-[2fr_1fr]">
      <!-- Левая колонка: детали источника -->
      <div class="overflow-y-auto pr-2">
        <div v-if="isLoading" class="py-16 text-center text-sm text-muted-foreground">
          {{ t('common.loading') }}
        </div>
        <div v-else-if="source" class="space-y-6">
          <div>
            <h1 class="text-2xl font-bold">{{ source.title || t('sources.untitled') }}</h1>
            <a
              v-if="source.asset?.url"
              :href="source.asset.url"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink class="size-3.5" />
              {{ source.asset.url }}
            </a>
          </div>

          <!-- Инсайты -->
          <div v-if="insights && insights.length" class="space-y-3">
            <p class="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles class="size-4" />
              {{ t('sources.insights') }}
            </p>
            <div v-for="ins in insights" :key="ins.id" class="rounded-md border bg-muted/40 p-3">
              <Badge variant="outline" class="mb-1.5 text-xs">{{ ins.insight_type }}</Badge>
              <p class="whitespace-pre-wrap text-sm text-muted-foreground">{{ ins.content }}</p>
            </div>
          </div>

          <!-- Полный текст -->
          <div v-if="source.full_text" class="space-y-2">
            <p class="text-sm font-semibold">{{ t('sources.fullText') }}</p>
            <p class="whitespace-pre-wrap text-sm text-muted-foreground">{{ source.full_text }}</p>
          </div>

          <p v-if="!insights?.length && !source.full_text" class="text-sm text-muted-foreground">
            {{ t('sources.noContent') }}
          </p>
        </div>
      </div>

      <!-- Правая колонка: чат -->
      <div class="flex flex-col overflow-hidden rounded-lg border">
        <div class="border-b px-4 py-3">
          <p class="text-sm font-medium">{{ t('detail.chat') }}</p>
        </div>
        <div class="flex-1 overflow-hidden p-3">
          <SourceChat v-if="sourceId" :source-id="sourceId" class="h-full" />
        </div>
      </div>
    </div>
  </div>
</template>
