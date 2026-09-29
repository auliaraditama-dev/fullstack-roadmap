<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';
import { readData, storageError, updateData } from '../lib/db';
import type { Bookmark } from '../lib/model';

const props = defineProps<{ id: string; lessonId: string; title: string; url: string; type: Bookmark['type'] }>();
const active = ref(false);
const error = ref('');
const busy = ref(false);
const ready = ref(false);

async function load() {
  try {
    active.value = (await readData()).bookmarks.some((bookmark) => bookmark.id === props.id);
    ready.value = true;
  } catch (cause) {
    error.value = storageError(cause);
  }
}
onMounted(() => { void load(); window.addEventListener('learning-change', load); });
onUnmounted(() => window.removeEventListener('learning-change', load));

async function toggle() {
  if (busy.value || !ready.value) return;
  busy.value = true;
  try {
    const committed = await updateData((data) => {
      const index = data.bookmarks.findIndex((bookmark) => bookmark.id === props.id);
      if (index >= 0) data.bookmarks.splice(index, 1);
      else data.bookmarks.push({ ...props, updatedAt: new Date().toISOString() });
    });
    active.value = committed.bookmarks.some((bookmark) => bookmark.id === props.id);
    error.value = '';
  } catch (cause) {
    error.value = storageError(cause);
  }
  finally { busy.value = false; }
}
</script>

<template>
  <span class="inline-control">
    <button type="button" :disabled="busy || !ready" :aria-pressed="active" @click="toggle">
      <LucideIcon :name="active ? 'check' : 'bookmark'" :size="16" />
      <span>{{ active ? 'Tersimpan' : 'Simpan ' + type }}</span>
    </button>
    <small v-if="error" role="alert" class="error-inline">{{ error }}</small>
  </span>
</template>
