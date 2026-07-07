<script setup lang="ts">
import { ref, computed, watch, toRef, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Send, Trash2, Pencil, MessageSquare, Loader2, Check, X } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import DropdownItem from '@/components/ui/DropdownItem.vue'
import ModelSelector from './ModelSelector.vue'
import { renderMarkdown } from '@/lib/markdown'
import {
  useSessions, useSession, useCreateSession, useUpdateSession, useDeleteSession, sendChatMessage,
} from '@/composables/useChat'
import { useSources } from '@/composables/useSources'
import { useNotes } from '@/composables/useNotes'
import { useContextStore } from '@/stores/context'
import type { ChatMessage } from '@/types/chat'

const props = defineProps<{ notebookId: string }>()
const { t } = useI18n()

const id = toRef(props, 'notebookId')
const { data: sessions } = useSessions(id)
const createSession = useCreateSession(id)
const updateSession = useUpdateSession(id)
const deleteSession = useDeleteSession(id)
const ctx = useContextStore()
const { data: sources } = useSources(id)
const { data: notes } = useNotes(id)

const currentId = ref<string | null>(null)
const { data: session } = useSession(currentId)

// Авто-выбор первой сессии.
watch(sessions, (list) => {
  if (!currentId.value && list && list.length) currentId.value = list[0].id
}, { immediate: true })

// Локальная лента: грузится из сессии, дополняется при стриминге.
const messages = ref<ChatMessage[]>([])
watch(session, (s) => { if (s) messages.value = [...s.messages] })

const input = ref('')
const streaming = ref(false)
const modelOverride = ref<string | null>(null)
watch(session, (s) => { modelOverride.value = s?.model_override ?? null })

const scrollEl = ref<HTMLElement | null>(null)
async function scrollDown() {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

async function newSession() {
  const s = await createSession.mutateAsync({ notebook_id: props.notebookId, title: t('chat.newSession') })
  currentId.value = s.id
  messages.value = []
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return
  if (!currentId.value) await newSession()
  const sid = currentId.value!

  input.value = ''
  streaming.value = true
  messages.value.push({ id: `u-${Date.now()}`, type: 'human', content: text })
  const ai: ChatMessage = { id: `a-${Date.now()}`, type: 'ai', content: '' }
  messages.value.push(ai)
  await scrollDown()

  const config = ctx.buildConfig(
    props.notebookId,
    (sources.value ?? []).map((s) => s.id),
    (notes.value ?? []).map((n) => n.id),
  )

  try {
    await sendChatMessage({
      notebookId: props.notebookId,
      sessionId: sid,
      message: text,
      contextConfig: config,
      modelOverride: modelOverride.value,
      onEvent: (e) => {
        if (e.type === 'ai_message') ai.content = e.content
        else if (e.type === 'error') ai.content = `⚠️ ${e.message}`
        scrollDown()
      },
    })
  } catch (err: unknown) {
    ai.content = `⚠️ ${(err as Error).message || t('chat.sendError')}`
  } finally {
    streaming.value = false
    scrollDown()
  }
}

// Переименование сессии inline.
const renamingId = ref<string | null>(null)
const renameText = ref('')
function startRename(sid: string, title: string) {
  renamingId.value = sid
  renameText.value = title
}
async function commitRename() {
  if (renamingId.value && renameText.value.trim()) {
    await updateSession.mutateAsync({ id: renamingId.value, body: { title: renameText.value.trim() } })
  }
  renamingId.value = null
}
async function removeSession(sid: string) {
  if (!confirm(t('chat.deleteConfirm'))) return
  await deleteSession.mutateAsync(sid)
  if (currentId.value === sid) {
    currentId.value = null
    messages.value = []
  }
}

const currentTitle = computed(
  () => sessions.value?.find((s) => s.id === currentId.value)?.title ?? t('chat.noSession'),
)
</script>

<template>
  <div class="flex h-[28rem] flex-col">
    <!-- Шапка: выбор сессии + создание. flex-wrap + min-w-0 — чтобы на узкой
         колонке селектор модели переносился, а не вылезал за границу блока. -->
    <div class="flex min-w-0 flex-wrap items-center gap-2 border-b pb-2">
      <DropdownMenu>
        <template #trigger>
          <Button variant="outline" size="sm" class="h-8 max-w-[10rem] min-w-0 gap-1">
            <MessageSquare class="size-4 shrink-0" />
            <span class="truncate">{{ currentTitle }}</span>
          </Button>
        </template>
        <template v-if="sessions && sessions.length">
          <div v-for="s in sessions" :key="s.id" class="flex items-center">
            <template v-if="renamingId === s.id">
              <input
                v-model="renameText" class="m-1 w-full rounded border bg-background px-1.5 py-1 text-sm"
                @keyup.enter="commitRename" @keyup.esc="renamingId = null"
              />
              <button class="p-1 text-green-500" @click="commitRename"><Check class="size-4" /></button>
              <button class="p-1 text-muted-foreground" @click="renamingId = null"><X class="size-4" /></button>
            </template>
            <template v-else>
              <DropdownItem class="flex-1" @select="currentId = s.id">
                <span class="truncate">{{ s.title }}</span>
              </DropdownItem>
              <button class="p-1 text-muted-foreground hover:text-foreground" @click.stop="startRename(s.id, s.title)">
                <Pencil class="size-3.5" />
              </button>
              <button class="p-1 text-muted-foreground hover:text-destructive" @click.stop="removeSession(s.id)">
                <Trash2 class="size-3.5" />
              </button>
            </template>
          </div>
        </template>
        <p v-else class="px-2 py-1.5 text-sm text-muted-foreground">{{ t('chat.noSessions') }}</p>
      </DropdownMenu>
      <Button variant="ghost" size="icon" class="size-8" :title="t('chat.newSession')" @click="newSession">
        <Plus class="size-4" />
      </Button>
      <ModelSelector v-model="modelOverride" class="ml-auto" />
    </div>

    <!-- Лента сообщений -->
    <div ref="scrollEl" class="flex-1 space-y-3 overflow-y-auto py-3">
      <p v-if="!messages.length" class="py-8 text-center text-sm text-muted-foreground">
        {{ t('chat.empty') }}
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

    <!-- Ввод -->
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
