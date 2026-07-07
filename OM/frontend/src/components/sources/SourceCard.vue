<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import {
  FileText, Link2, Type, Trash2, Loader2, AlertCircle,
  CircleSlash, Sparkles, MoreVertical, Folder, FolderMinus,
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import ContextToggle from '@/components/context/ContextToggle.vue'
import { isSourcePending } from '@/types/source'
import type { SourceListItem } from '@/types/source'
import type { SourceContextLevel as Level } from '@/types/context'
import { updateSource } from '@/api/sources'
import { sourceKeys } from '@/composables/useSources'
import { useSpacesStore } from '@/stores/spaces'

const props = defineProps<{ source: SourceListItem }>()
const emit = defineEmits<{ open: []; delete: [] }>()
const level = defineModel<string>('level', { required: true })
const { t } = useI18n()
const spaces = useSpacesStore()
const qc = useQueryClient()
onMounted(() => spaces.load())

// Метка «дефолтный/проект»: к какому проекту привязан источник (space_id).
const projectSpace = computed(() =>
  props.source.space_id ? spaces.projects.find((s) => s.id === props.source.space_id) ?? null : null,
)
const moveTargets = computed(() => spaces.projects.filter((s) => s.id !== props.source.space_id))
async function assign(spaceId: string | null) {
  await updateSource(props.source.id, { space_id: spaceId ?? '' })
  await qc.invalidateQueries({ queryKey: sourceKeys.all })
}

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
        <!-- Назначить проект доступно из меню только для глобального (без стикера) источника. -->
        <template v-if="!source.space_id">
          <DropdownItem v-for="p in moveTargets" :key="p.id" @select="assign(p.id)">
            <Folder class="size-4" />{{ t('sources.assignTo', { name: p.name }) }}
          </DropdownItem>
        </template>
        <DropdownItem class="text-destructive" @select="emit('delete')">
          <Trash2 class="size-4" />{{ t('common.delete') }}
        </DropdownItem>
      </DropdownMenu>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-1.5">
      <!-- Стикер родителя: имя пространства-проекта, клик — сменить/убрать. Глобальный → стикера нет. -->
      <DropdownMenu v-if="projectSpace">
        <template #trigger>
          <Badge variant="secondary" class="max-w-[10rem] cursor-pointer gap-1 hover:opacity-80">
            <Folder class="size-3 shrink-0" /><span class="truncate">{{ projectSpace.name }}</span>
          </Badge>
        </template>
        <DropdownItem v-for="p in moveTargets" :key="p.id" @select="assign(p.id)">
          <Folder class="size-4" />{{ t('sources.assignTo', { name: p.name }) }}
        </DropdownItem>
        <DropdownItem @select="assign(null)">
          <FolderMinus class="size-4" />{{ t('sources.makeDefault') }}
        </DropdownItem>
      </DropdownMenu>
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
