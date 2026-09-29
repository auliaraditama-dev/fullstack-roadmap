<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';
import { storageError } from '../lib/db';
import { modalConfirm } from '../lib/dialog';
import {
  clearOffline,
  downloadModule,
  installed,
  manifest,
  removeModule,
  uniqueFiles,
  type OfflineManifest,
} from '../lib/offline';

const data = ref<OfflineManifest>();
const records = ref<Record<string, string>>({});
const busy = ref(false);
const done = ref(0);
const total = ref(0);
const message = ref('');
const error = ref('');
const used = ref<number>();
const quota = ref<number>();
const selected = ref('all');
let controller: AbortController | undefined;

const selectedModules = computed(() => data.value?.modules.filter((module) => selected.value === 'all' || module.id === selected.value) ?? []);
const uniqueSize = computed(() => uniqueFiles([
  ...(data.value?.shell ?? []),
  ...selectedModules.value.flatMap((module) => module.files),
]).reduce((sum, file) => sum + file.bytes, 0));

const size = computed(() => selectedModules.value.reduce((sum, module) =>
  sum + uniqueFiles([...(data.value?.shell ?? []), ...module.files])
    .reduce((subtotal, file) => subtotal + file.bytes, 0), 0));

function format(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function refresh() {
  records.value = await installed();
  if (!navigator.storage?.estimate) return;
  const estimate = await navigator.storage.estimate();
  used.value = estimate.usage;
  quota.value = estimate.quota;
}

onMounted(async () => {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    error.value = 'Browser ini tidak mendukung unduhan offline. Materi tetap dapat dibaca online.';
    return;
  }
  try {
    data.value = await manifest();
    await refresh();
  } catch (cause) {
    error.value = storageError(cause);
  }
});

async function download() {
  if (!data.value || busy.value) return;
  busy.value = true;
  error.value = '';
  message.value = 'Menyiapkan unduhan…';
  controller = new AbortController();
  done.value = 0;
  total.value = selectedModules.value.reduce((sum, module) => sum + uniqueFiles([...data.value!.shell, ...module.files]).length, 0);
  let offset = 0;

  try {
    for (const module of selectedModules.value) {
      message.value = `Mengunduh ${module.title}`;
      await downloadModule(module, data.value.version, data.value.shell, (current) => {
        done.value = offset + current;
      }, controller.signal);
      offset = done.value;
    }
    message.value = 'Unduhan lengkap. Materi siap dibaca offline.';
  } catch (cause) {
    error.value = cause instanceof DOMException && cause.name === 'AbortError'
      ? 'Unduhan dibatalkan. Versi yang sudah lengkap tetap tersedia.'
      : storageError(cause);
  } finally {
    busy.value = false;
    controller = undefined;
    try { await refresh(); } catch (cause) { error.value = storageError(cause); }
  }
}

async function remove(id: string) {
  try {
    await removeModule(id);
    await refresh();
    message.value = 'Materi offline dihapus. Catatan dan progress tetap tersimpan.';
    error.value = '';
  } catch (cause) {
    error.value = storageError(cause);
  }
}

async function clear() {
  if (!await modalConfirm({
    title: 'Hapus materi offline?',
    message: 'Semua salinan materi offline akan dihapus. Catatan dan progress belajar tetap tersimpan.',
    confirmLabel: 'Hapus materi',
    cancelLabel: 'Batal',
    variant: 'danger',
  })) return;
  try {
    await clearOffline();
    await refresh();
    message.value = 'Semua materi offline dihapus. Data belajar tetap tersimpan.';
    error.value = '';
  } catch (cause) {
    error.value = storageError(cause);
  }
}

async function persist() {
  try {
  message.value = navigator.storage?.persist && await navigator.storage.persist()
    ? 'Browser mengizinkan penyimpanan persisten.'
    : 'Browser belum memberikan penyimpanan persisten. Export data secara berkala.';
  } catch (cause) { error.value = storageError(cause); }
}
</script>

<template>
  <section>
    <p>Unduh saat online, lalu buka kembali materi tanpa koneksi. Catatan, quiz, dan progress tetap bekerja di perangkat ini.</p>

    <div v-if="data" class="offline-download">
      <label for="module">Materi yang akan disimpan</label>
      <select id="module" v-model="selected" :disabled="busy">
        <option value="all">Seluruh materi</option>
        <option v-for="module in data.modules" :key="module.id" :value="module.id">{{ module.title }}</option>
      </select>
      <p>Estimasi transfer: <strong>{{ format(size) }}</strong>. Berkas unik: {{ format(uniqueSize) }}. Transfer mencakup aset bersama pada setiap modul. Media dan PDF sumber termasuk paket referensi.</p>
      <div class="toolbar">
        <button class="primary" type="button" :disabled="busy" @click="download">
          <LucideIcon name="download" :size="16" />
          <span>Download materi</span>
        </button>
        <button v-if="busy" type="button" @click="controller?.abort()">
          <LucideIcon name="x" :size="16" />
          <span>Batalkan</span>
        </button>
      </div>
      <progress v-if="busy" :value="done" :max="total" aria-label="Progress unduhan"></progress>
      <p v-if="busy">{{ done }} / {{ total }} file</p>
    </div>

    <p role="status">{{ message }}</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>

    <h2>Materi di perangkat</h2>
    <ul class="row-list">
      <li v-for="module in data?.modules" :key="module.id">
        <span>
          {{ module.title }}
          <small>{{ records[module.id] ? (records[module.id]?.includes('-' + data?.version + '-') ? 'Tersimpan · versi terbaru' : 'Tersimpan · versi lama, unduh ulang untuk memperbarui') : 'Belum diunduh' }}</small>
        </span>
        <button v-if="records[module.id]" type="button" :disabled="busy" @click="remove(module.id)">
          <LucideIcon name="trash" :size="16" />
          <span>Hapus</span>
        </button>
      </li>
    </ul>

    <h2>Penyimpanan</h2>
    <p v-if="used !== undefined">Penggunaan origin ini: {{ format(used) }}<span v-if="quota"> dari estimasi kuota {{ format(quota) }}</span>.</p>
    <p v-else>Browser tidak menyediakan estimasi penyimpanan.</p>
    <p>Kuota dibagi oleh materi, indeks pencarian, catatan, dan progress. Browser dapat menghapus penyimpanan saat ruang perangkat menipis.</p>

    <div class="toolbar">
      <button type="button" @click="persist">
        <LucideIcon name="shield-check" :size="16" />
        <span>Minta penyimpanan persisten</span>
      </button>
      <button type="button" :disabled="busy" @click="clear">
        <LucideIcon name="trash" :size="16" />
        <span>Hapus materi offline</span>
      </button>
      <a class="button" href="/progress/#backup">
        <LucideIcon name="file-json" :size="16" />
        <span>Export data belajar</span>
      </a>
    </div>
  </section>
</template>
