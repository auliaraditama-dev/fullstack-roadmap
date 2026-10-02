<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';
import { isAvailable, installed } from '../lib/offline';
import { searchEntries, type SearchEntry } from '../lib/model';

const dialog = ref<HTMLDialogElement>();
const input = ref<HTMLInputElement>();
const query = ref('');
const entries = ref<SearchEntry[]>([]);
const loading = ref(false);
const error = ref('');
const available = ref<Record<string, boolean>>({});

const results = computed(() => searchEntries(entries.value, query.value));

async function loadIndex() {
  if (entries.value.length) return;
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch('/search-index.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Indeks pencarian gagal dimuat.');
    entries.value = await response.json() as SearchEntry[];
    const records = await installed();
    await Promise.all(entries.value.map(async (entry) => {
      available.value[entry.url] = await isAvailable(entry.url, records);
    }));
  } catch {
    error.value = 'Indeks kosong. Tambahkan konten ke template untuk mengaktifkan pencarian.';
  } finally {
    loading.value = false;
  }
}

async function open() {
  if (!dialog.value?.open) dialog.value?.showModal();
  await nextTick();
  input.value?.focus();
  await loadIndex();
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

function keydown(event: KeyboardEvent) {
  const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
  const slash = event.key === '/' && !isTypingTarget(event.target);
  if (!shortcut && !slash) return;
  event.preventDefault();
  void open();
}

onMounted(() => {
  document.addEventListener('keydown', keydown);
  document.addEventListener('open-search', open);
});

onUnmounted(() => {
  document.removeEventListener('keydown', keydown);
  document.removeEventListener('open-search', open);
});
</script>

<template>
  <button class="search-trigger" type="button" aria-label="Cari workspace" @click="open">
    <LucideIcon name="search" :size="17" />
    <span>Cari workspace…</span>
    <kbd>Ctrl K</kbd>
  </button>

  <dialog ref="dialog" class="search-dialog" aria-labelledby="search-title" @click="($event.target === dialog) && dialog?.close()">
    <div class="dialog-head">
      <h2 id="search-title">Cari di kurikulum</h2>
      <button class="icon-button" type="button" aria-label="Tutup pencarian" @click="dialog?.close()">
        <LucideIcon name="x" :size="18" />
      </button>
    </div>

    <label for="search-input" class="sr-only">Kata kunci pencarian</label>
    <input id="search-input" ref="input" v-model="query" type="search" placeholder="Cari halaman atau fitur…" autocomplete="off">

    <p v-if="loading" role="status">Memuat indeks pencarian…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <p v-else-if="!query.trim()" class="muted">Pencarian siap digunakan setelah konten ditambahkan. Tekan / untuk membuka pencarian.</p>
    <p v-else-if="!results.length" role="status">Belum ada konten yang cocok.</p>
    <p v-else role="status" class="muted">{{ results.length }} hasil</p>

    <ul class="search-results">
      <li v-for="result in results" :key="result.id">
        <a :href="result.url">
          <span>
            <strong>{{ result.title }}</strong>
            <small>{{ result.type }} · {{ result.part }}<span v-if="available[result.url]"> · Tersedia offline</span></small>
          </span>
          <LucideIcon name="arrow-right" :size="16" />
        </a>
      </li>
    </ul>
  </dialog>
</template>
