<template>
  <span :class="['tag', `tag--${color}`]">
    {{ text }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  color?: string // 'teal', 'purple', 'pink', etc.
}>()
</script>
