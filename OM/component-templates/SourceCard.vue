<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  FileText, Link2, Type, Trash2, Loader2, AlertCircle,
  CircleSlash, Sparkles, MoreVertical,
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import ContextToggle from '@/components/context/ContextToggle.vue'
import { isSourcePending } from '@/types/source'
import type { SourceListItem } from '@/types/source'
import type { SourceContextLevel as Level } from '@/types/context'

const props = defineProps<{ source: SourceListItem }>()
const emit = defineEmits<{ open: []; delete: [] }>()
const level = defineModel<string>('level', { required: true })
const { t } = useI18n()

// Тип источника по asset: url → ссылка, file_path → файл, иначе → текст.
const kind = computed<'link' | 'upload' | 'text'>(() => {
  if (props.source.asset?.url) return 'link'
  if (props.source.asset?.file_path) return 'upload'
  return 'text'
})
const kindIcon = computed(() => ({ link: Link2, upload: FileText, text: Type })[kind.value])

const pending = computed(() => isSourcePending(props.source.status))
const failed = computed(() => props.source.status === 'failed')

const levelOptions = computed<{ value: Level; label: string; icon: typeof CircleSlash }[]>(() => [
  { value: 'not in', label: t('context.notIn'), icon: CircleSlash },
  { value: 'insights', label: t('context.insightsOnly'), icon: Sparkles },
  { value: 'full content', label: t('context.fullContent'), icon: FileText },
])
</script>

<template>
  <div class="rounded-lg border bg-card p-3 text-card-foreground">
    <div class="flex items-start gap-2">
      <component :is="kindIcon" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <button type="button" class="min-w-0 flex-1 text-left" @click="emit('open')">
        <p class="truncate text-sm font-medium hover:underline">
          {{ source.title || t('sources.untitled') }}
        </p>
      </button>
      <DropdownMenu>
        <template #trigger>
          <Button variant="ghost" size="icon" class="size-7 shrink-0"><MoreVertical class="size-4" /></Button>
        </template>
        <DropdownItem class="text-destructive" @select="emit('delete')">
          <Trash2 class="size-4" />{{ t('common.delete') }}
        </DropdownItem>
      </DropdownMenu>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-1.5">
      <Badge v-if="pending" variant="secondary" class="gap-1">
        <Loader2 class="size-3 animate-spin" />{{ t('sources.processing') }}
      </Badge>
      <Badge v-else-if="failed" variant="outline" class="gap-1 border-destructive text-destructive">
        <AlertCircle class="size-3" />{{ t('sources.failed') }}
      </Badge>
      <Badge v-if="source.insights_count > 0" variant="outline" class="gap-1">
        <Sparkles class="size-3" />{{ source.insights_count }}
      </Badge>
      <Badge v-if="source.embedded" variant="outline">{{ t('sources.embedded') }}</Badge>
    </div>

    <div class="mt-2 flex items-center justify-end">
      <ContextToggle v-model="level" :options="levelOptions" />
    </div>
  </div>
</template>
