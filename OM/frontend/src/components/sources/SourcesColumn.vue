<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import SourceCard from './SourceCard.vue'
import AddSourceDialog from './AddSourceDialog.vue'
import SourceDetailDialog from './SourceDetailDialog.vue'
import { useSources, useDeleteSource } from '@/composables/useSources'
import { useContextStore } from '@/stores/context'
import type { SourceContextLevel } from '@/types/context'

// spaceId задан (для проектов) → новый источник наследует этот проект.
const props = withDefaults(defineProps<{ notebookId: string; spaceId?: string }>(), { spaceId: '' })
const { t } = useI18n()

const id = toRef(props, 'notebookId')
const { data: sources, isLoading } = useSources(id)
const del = useDeleteSource(id)
const ctx = useContextStore()

const addOpen = ref(false)
const detailId = ref<string | null>(null)
const detailOpen = ref(false)

const ids = computed(() => (sources.value ?? []).map((s) => s.id))

function levelOf(sourceId: string): string {
  return ctx.sourceLevel(props.notebookId, sourceId)
}
function setLevel(sourceId: string, level: string) {
  ctx.setSourceLevel(props.notebookId, sourceId, level as SourceContextLevel)
}
function setAll(level: SourceContextLevel) {
  ctx.setAllSources(props.notebookId, ids.value, level)
}

function openDetail(sourceId: string) {
  detailId.value = sourceId
  detailOpen.value = true
}

async function remove(sourceId: string) {
  if (!confirm(t('sources.deleteConfirm'))) return
  await del.mutateAsync(sourceId)
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <Button size="sm" variant="outline" class="gap-1" @click="addOpen = true">
        <Plus class="size-4" />{{ t('sources.add') }}
      </Button>
      <div v-if="sources && sources.length" class="flex gap-1">
        <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="setAll('insights')">
          {{ t('context.allIn') }}
        </Button>
        <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="setAll('not in')">
          {{ t('context.allOut') }}
        </Button>
      </div>
    </div>

    <p v-if="isLoading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>
    <p v-else-if="!sources?.length" class="text-sm text-muted-foreground">{{ t('sources.empty') }}</p>

    <div v-else class="space-y-2">
      <SourceCard
        v-for="s in sources" :key="s.id" :source="s"
        :level="levelOf(s.id)"
        @update:level="setLevel(s.id, $event)"
        @open="openDetail(s.id)"
        @delete="remove(s.id)"
      />
    </div>

    <AddSourceDialog v-model:open="addOpen" :notebook-id="notebookId" :space-id="spaceId" />
    <SourceDetailDialog v-if="detailId" v-model:open="detailOpen" :source-id="detailId" />
  </div>
</template>
