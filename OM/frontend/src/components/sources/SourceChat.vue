<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Send, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { renderMarkdown } from '@/lib/markdown'
import { streamSSE } from '@/lib/sse'
import {
  listSourceSessions, getSourceSession, createSourceSession, sourceChatStreamPath,
} from '@/api/sourceChat'
import type { ChatMessage, ChatStreamEvent } from '@/types/chat'

// Лёгкий чат с одним источником: одна сессия на источник.
const props = defineProps<{ sourceId: string }>()
const { t } = useI18n()

const sessionId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const input = ref('')
const streaming = ref(false)
const loading = ref(true)
const scrollEl = ref<HTMLElement | null>(null)

async function scrollDown() {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

onMounted(async () => {
  try {
    const list = await listSourceSessions(props.sourceId)
    if (list.length) {
      sessionId.value = list[0].id
      const s = await getSourceSession(props.sourceId, list[0].id)
      messages.value = [...s.messages]
    }
  } finally {
    loading.value = false
  }
})

async function ensureSession(): Promise<string> {
  if (sessionId.value) return sessionId.value
  const s = await createSourceSession(props.sourceId, t('chat.newSession'))
  sessionId.value = s.id
  return s.id
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return
  const sid = await ensureSession()

  input.value = ''
  streaming.value = true
  messages.value.push({ id: `u-${Date.now()}`, type: 'human', content: text })
  const ai: ChatMessage = { id: `a-${Date.now()}`, type: 'ai', content: '' }
  messages.value.push(ai)
  await scrollDown()

  try {
    await streamSSE<ChatStreamEvent>(
      sourceChatStreamPath(props.sourceId, sid),
      { message: text },
      (e) => {
        if (e.type === 'ai_message') ai.content = e.content
        else if (e.type === 'error') ai.content = `⚠️ ${e.message}`
        scrollDown()
      },
    )
  } catch (err: unknown) {
    ai.content = `⚠️ ${(err as Error).message || t('chat.sendError')}`
  } finally {
    streaming.value = false
    scrollDown()
  }
}
</script>

<template>
  <div class="flex h-[24rem] flex-col">
    <div ref="scrollEl" class="flex-1 space-y-3 overflow-y-auto py-1">
      <p v-if="loading" class="py-8 text-center text-sm text-muted-foreground">{{ t('common.loading') }}</p>
      <p v-else-if="!messages.length" class="py-8 text-center text-sm text-muted-foreground">
        {{ t('chat.sourceEmpty') }}
      </p>
      <div v-for="m in messages" :key="m.id" class="flex" :class="m.type === 'human' ? 'justify-end' : 'justify-start'">
        <div
          class="max-w-[85%] rounded-lg px-3 py-2 text-sm"
          :class="m.type === 'human' ? 'bg-primary text-primary-foreground' : 'border bg-muted/40'"
        >
          <span v-if="m.type === 'human'" class="whitespace-pre-wrap">{{ m.content }}</span>
          <span v-else-if="!m.content && streaming" class="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 class="size-3.5 animate-spin" />{{ t('chat.thinking') }}
          </span>
          <div v-else class="md-body" v-html="renderMarkdown(m.content)" />
        </div>
      </div>
    </div>

    <form class="flex items-end gap-2 border-t pt-2" @submit.prevent="send">
      <textarea
        v-model="input" rows="2" :placeholder="t('chat.inputPlaceholder')"
        class="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm
        ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @keydown.enter.exact.prevent="send"
      />
      <Button type="submit" size="icon" :disabled="streaming || !input.trim()">
        <Loader2 v-if="streaming" class="size-4 animate-spin" />
        <Send v-else class="size-4" />
      </Button>
    </form>
  </div>
</template>
