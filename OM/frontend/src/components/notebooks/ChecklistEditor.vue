<script setup lang="ts">
// Редактор именованных чек-листов. Гарантирует наличие дефолтного чек-листа
// (первый, isDefault) — его нельзя удалить, но можно переименовать.
// Эмитит 'commit', когда изменение нужно сохранить (blur/переключение/добавление/удаление).
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Plus, X, Trash2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import type { Checklist } from '@/types/notebook'
import { normalizeChecklists, genId } from '@/lib/notebook'

const props = withDefaults(
  defineProps<{ defaultTitle: string; checkable?: boolean }>(),
  { checkable: true },
)
const model = defineModel<Checklist[]>({ default: () => [] })
const emit = defineEmits<{ commit: [] }>()
const { t } = useI18n()

const lists = ref<Checklist[]>(normalizeChecklists(model.value, props.defaultTitle))

// Флаг защищает от эха: при нашей же записи в model не пере-нормализуем (иначе теряется фокус ввода).
let internal = false
watch(model, (v) => {
  if (internal) {
    internal = false
    return
  }
  lists.value = normalizeChecklists(v, props.defaultTitle)
})

// При смене типа (ячейка↔задача) дефолтный заголовок следует за типом,
// пока пользователь его не переименовал вручную.
watch(
  () => props.defaultTitle,
  (nt, ot) => {
    const def = lists.value.find((l) => l.isDefault)
    if (def && (!def.title || def.title === ot)) {
      def.title = nt
      sync()
    }
  },
)

function sync(commit = false) {
  internal = true
  model.value = lists.value
  if (commit) emit('commit')
}

function addChecklist() {
  lists.value.push({ id: genId(), title: '', isDefault: false, items: [{ title: '', isCompleted: false }] })
  sync(true)
}
function removeChecklist(li: number) {
  if (lists.value[li]?.isDefault) return
  lists.value.splice(li, 1)
  sync(true)
}
function addItem(li: number) {
  lists.value[li].items.push({ title: '', isCompleted: false })
  sync()
}
function removeItem(li: number, ii: number) {
  lists.value[li].items.splice(ii, 1)
  sync(true)
}
function toggleItem(li: number, ii: number) {
  const it = lists.value[li].items[ii]
  it.isCompleted = !it.isCompleted
  sync(true)
}
</script>

<template>
  <div class="space-y-4">
    <div v-for="(list, li) in lists" :key="list.id" class="space-y-2 rounded-md border p-3">
      <!-- Название чек-листа (редактируемое; дефолтный нельзя удалить) -->
      <div class="flex items-center gap-2">
        <Input
          v-model="list.title"
          :placeholder="t('notebooks.checklistNamePlaceholder')"
          class="flex-1 font-medium"
          @blur="sync(true)"
          @keyup.enter="sync(true)"
        />
        <Button
          v-if="!list.isDefault"
          type="button"
          variant="ghost"
          size="icon"
          :title="t('notebooks.removeChecklist')"
          @click="removeChecklist(li)"
        >
          <Trash2 class="size-4" />
        </Button>
      </div>

      <!-- Пункты -->
      <div v-for="(item, ii) in list.items" :key="ii" class="flex items-center gap-2">
        <button
          v-if="checkable"
          type="button"
          class="flex size-5 shrink-0 items-center justify-center rounded border"
          :class="item.isCompleted ? 'bg-primary text-primary-foreground' : ''"
          @click="toggleItem(li, ii)"
        >
          <Check v-if="item.isCompleted" class="size-3.5" />
        </button>
        <Input
          v-model="item.title"
          :placeholder="t('notebooks.checklistPlaceholder')"
          class="flex-1"
          :class="checkable && item.isCompleted ? 'line-through opacity-60' : ''"
          @blur="sync(true)"
        />
        <Button
          v-if="list.items.length > 1"
          type="button"
          variant="ghost"
          size="icon"
          @click="removeItem(li, ii)"
        >
          <X class="size-4" />
        </Button>
      </div>

      <Button type="button" variant="outline" size="sm" class="w-full" @click="addItem(li)">
        <Plus class="size-4" />{{ t('notebooks.addChecklistItem') }}
      </Button>
    </div>

    <!-- Новый чек-лист -->
    <Button type="button" variant="outline" size="sm" @click="addChecklist">
      <Plus class="size-4" />{{ t('notebooks.addChecklist') }}
    </Button>
  </div>
</template>
