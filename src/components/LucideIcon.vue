<script setup lang="ts">
import { iconPaths, type IconName } from '../lib/icons';

withDefaults(defineProps<{ name: IconName; size?: number; strokeWidth?: number }>(), {
  size: 18,
  strokeWidth: 2,
});
</script>

<template>
  <svg
    class="lucide-icon"
    :data-lucide="name"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="path in iconPaths[name]" :key="path" :d="path" />
  </svg>
</template>
