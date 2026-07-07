<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { sendFeedback } from '@/api/feedback'

const props = defineProps<{ elementPath: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const comment = ref('')
const sending = ref(false)
const error = ref(false)
const textarea = ref<HTMLTextAreaElement | null>(null)

onMounted(() => textarea.value?.focus())

async function submit() {
  if (!comment.value.trim() || sending.value) return
  sending.value = true
  error.value = false
  try {
    await sendFeedback(props.elementPath, comment.value.trim())
    emit('close')
  } catch {
    error.value = true
  } finally {
    sending.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit()
}
</script>

<template>
  <!-- dev-modal-overlay: класс важен — DevModeOverlay игнорирует клики внутри него -->
  <div
    class="dev-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click="emit('close')"
  >
    <div
      class="flex w-[500px] max-w-[90vw] flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between border-b p-4">
        <h2 class="text-base font-semibold">{{ t('dev.feedbackTitle') }}</h2>
        <button class="text-muted-foreground hover:text-foreground" @click="emit('close')">
          <X class="size-5" />
        </button>
      </div>
      <div class="flex flex-col gap-4 p-5">
        <div class="flex flex-col gap-1.5 rounded-md border bg-muted/50 p-3">
          <span class="text-xs opacity-70">{{ t('dev.targetElement') }}</span>
          <code class="break-all font-mono text-[11px] text-primary">{{ elementPath }}</code>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm opacity-80">{{ t('dev.comment') }}</label>
          <textarea
            ref="textarea"
            v-model="comment"
            :placeholder="t('dev.commentPlaceholder')"
            rows="4"
            class="min-h-[100px] w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @keydown="onKeydown"
          />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ t('dev.sendError') }}</p>
      </div>
      <div class="flex justify-end gap-3 border-t p-4">
        <Button variant="outline" @click="emit('close')">{{ t('common.cancel') }}</Button>
        <Button :disabled="!comment.trim() || sending" @click="submit">
          {{ sending ? t('common.saving') : t('dev.send') }}
        </Button>
      </div>
    </div>
  </div>
</template>
