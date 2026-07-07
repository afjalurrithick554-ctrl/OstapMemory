<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight, Trash2, Wand2, Pencil } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import type { Transformation } from '@/types/transformation'
import { useDeleteTransformation } from '@/composables/useTransformations'

const props = defineProps<{ transformation: Transformation }>()
const emit = defineEmits<{ playground: []; edit: [] }>()
const { t } = useI18n()
const del = useDeleteTransformation()
const expanded = ref(false)

function remove() {
  if (confirm(t('transformations.deleteConfirm'))) del.mutate(props.transformation.id)
}
</script>

<template>
  <Card class="p-4">
    <div class="flex items-start justify-between gap-4">
      <button class="flex flex-1 items-start gap-2 text-left" @click="expanded = !expanded">
        <component :is="expanded ? ChevronDown : ChevronRight" class="mt-0.5 size-5 shrink-0" />
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ transformation.name }}</span>
            <Badge v-if="transformation.apply_default" variant="secondary">{{ t('transformations.default') }}</Badge>
          </div>
          <p v-if="!expanded && transformation.description" class="truncate text-sm text-muted-foreground">
            {{ transformation.description }}
          </p>
        </div>
      </button>

      <div class="flex shrink-0 items-center gap-1">
        <Button variant="outline" size="sm" @click="emit('playground')">
          <Wand2 class="size-4" />{{ t('transformations.playground') }}
        </Button>
        <Button variant="outline" size="sm" @click="emit('edit')">
          <Pencil class="size-4" />{{ t('common.edit') }}
        </Button>
        <Button variant="ghost" size="icon" class="size-8 text-destructive" @click="remove">
          <Trash2 class="size-4" />
        </Button>
      </div>
    </div>

    <div v-if="expanded" class="mt-4 space-y-3 pl-7">
      <div>
        <p class="text-xs text-muted-foreground">{{ t('common.title') }}</p>
        <p class="text-sm font-medium">{{ transformation.title || t('search.untitled') }}</p>
      </div>
      <div v-if="transformation.description">
        <p class="text-xs text-muted-foreground">{{ t('common.description') }}</p>
        <p class="text-sm leading-6">{{ transformation.description }}</p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">{{ t('transformations.systemPrompt') }}</p>
        <pre class="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm">{{ transformation.prompt }}</pre>
      </div>
    </div>
  </Card>
</template>
