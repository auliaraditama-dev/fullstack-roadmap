<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';
import { modalConfirm } from '../lib/dialog';
import levels from '../data/levels.json';
import {
  readData,
  readPreviousBackup,
  replaceData,
  saveFile,
  storageError,
  updateData,
} from '../lib/db';
import {
  checklistCompletion,
  completion,
  emptyData,
  parseBackup,
  type Backup,
  type LessonSummary,
} from '../lib/model';

interface PartSummary {
  id: string;
  title: string;
}

interface WeekSummary {
  number: number;
  lessons: number[];
  checklist: string[];
}

const props = defineProps<{
  mode: 'home' | 'progress' | 'notes' | 'bookmark';
  lessons: LessonSummary[];
  parts: PartSummary[];
  weeks?: WeekSummary[];
}>();

const data = ref<Backup>(emptyData());
const ready = ref(false);
const error = ref('');
const query = ref('');
const filter = ref('all');
const pending = ref<Backup>();
const message = ref('');
const previous = ref<Backup>();
const importing = ref(false);

const percent = computed(() => completion(data.value, props.lessons.map((lesson) => lesson.id)));
const last = computed(() => props.lessons.find((lesson) => lesson.id === data.value.lastLesson));
const next = computed(() => props.lessons.find((lesson) => data.value.progress[lesson.id]?.status !== 'completed'));
const notes = computed(() => data.value.notes.filter((note) => note.text.toLocaleLowerCase('id').includes(query.value.toLocaleLowerCase('id'))));
const bookmarks = computed(() => data.value.bookmarks.filter((bookmark) => (
  (filter.value === 'all' || bookmark.type === filter.value)
  && bookmark.title.toLocaleLowerCase('id').includes(query.value.toLocaleLowerCase('id'))
)));

const lesson = (id: string) => props.lessons.find((item) => item.id === id);

async function load() {
  try {
    data.value = await readData();
    previous.value = await readPreviousBackup();
    ready.value = true;
    error.value = '';
  } catch (cause) {
    error.value = storageError(cause);
  }
}

onMounted(() => {
  void load();
  window.addEventListener('learning-change', load);
});

onUnmounted(() => window.removeEventListener('learning-change', load));

async function exportAll() {
  try {
    saveFile('fullstack-backup.json', JSON.stringify(await readData(), null, 2));
  } catch (cause) {
    error.value = storageError(cause);
  }
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('File melebihi 10 MB.');
    pending.value = parseBackup(await file.text());
    error.value = '';
  } catch {
    error.value = 'File backup tidak valid atau versi schema belum didukung. Data lokal belum diubah.';
    pending.value = undefined;
  } finally {
    input.value = '';
  }
}

async function confirmImport() {
  if (!pending.value || importing.value) return;
  const replacement = pending.value;
  importing.value = true;
  try {
    saveFile('fullstack-before-import.json', JSON.stringify(await readData(), null, 2));
    await replaceData(replacement, true);
    pending.value = undefined;
    message.value = 'Backup diimpor. Unduhan cadangan dimulai; salinan sebelum import juga tersimpan di perangkat ini.';
    await load();
  } catch (cause) {
    error.value = storageError(cause);
  }
  finally { importing.value = false; }
}

async function clear() {
  if (!await modalConfirm({
    title: 'Hapus seluruh data belajar?',
    message: 'Progress, quiz, bookmark, catatan, dan milestone lokal akan dihapus. Export cadangan terlebih dahulu jika masih diperlukan.',
    confirmLabel: 'Hapus semua data',
    cancelLabel: 'Batal',
    variant: 'danger',
  })) return;
  try {
    await replaceData(emptyData());
    await load();
    message.value = 'Data belajar dihapus.';
  } catch (cause) {
    error.value = storageError(cause);
  }
}

async function removeBookmark(id: string) {
  try {
    await updateData((current) => {
      current.bookmarks = current.bookmarks.filter((bookmark) => bookmark.id !== id);
    });
    error.value = '';
  } catch (cause) {
    error.value = storageError(cause);
  }
}

function milestonePercent(groups: { number: number; checklist: string[] }[], prefix: string) {
  return checklistCompletion(data.value.milestones, groups.flatMap((group) => group.checklist.map((_, index) => `${prefix}${group.number}:${index}`)));
}
</script>

<template>
  <p v-if="error" role="alert" class="error">{{ error }}</p>

  <template v-if="mode === 'home'">
    <div class="resume-panel">
      <div>
        <span class="eyebrow">RUANG BELAJAR ANDA</span>
        <h2>{{ last ? 'Teruskan langkah terakhir.' : 'Mulai dari fondasi.' }}</h2>
        <p>{{ last?.title ?? 'Mulai dari model input-process-output, pseudocode, lalu Go fundamental.' }}</p>
        <a class="button primary" :href="last?.url ?? lessons[0]?.url">
          <LucideIcon name="play" :size="16" />
          <span>{{ last ? 'Lanjutkan belajar' : 'Mulai dari awal' }}</span>
        </a>
      </div>
      <div class="progress-figure">
        <strong>{{ percent }}<span>%</span></strong>
        <span>Kurikulum selesai</span>
        <progress :value="percent" max="100" aria-label="Kurikulum selesai"></progress>
        <small>{{ lessons.filter((item) => data.progress[item.id]?.status === 'completed').length }} dari {{ lessons.length }} bab</small>
      </div>
    </div>
    <div class="next-line">
      <span class="muted">Selanjutnya</span>
      <a class="inline-icon-link" :href="next?.url ?? '/progress/'">
        <span>{{ next?.title ?? 'Tinjau kembali checkpoint Anda' }}</span>
        <LucideIcon name="arrow-right" :size="15" />
      </a>
    </div>
  </template>

  <template v-else-if="mode === 'progress'">
    <div class="progress-heading">
      <strong>{{ percent }}%</strong>
      <p>Kurikulum selesai. Status “Selesai” ditentukan oleh Anda setelah praktik dan checkpoint.</p>
    </div>

    <h2>Per bagian</h2>
    <ul class="row-list">
      <li v-for="part in parts" :key="part.id">
        <a :href="'/belajar/' + part.id + '/'">{{ part.title }}</a>
        <span>{{ completion(data, lessons.filter((item) => item.part === part.id).map((item) => item.id)) }}%</span>
      </li>
    </ul>

    <h2>Roadmap mingguan</h2>
    <div class="week-progress">
      <a v-for="week in weeks" :key="week.number" :href="'/minggu/' + week.number + '/'">
        Minggu {{ week.number }}
        <strong>{{ milestonePercent([week], 'week-') }}%</strong>
      </a>
    </div>

    <h2>Project aktif</h2>
    <p><a href="/project/task-tracker/">Task Tracker</a> · {{ milestonePercent(levels, 'task-level-') }}% checklist milestone selesai.</p>

    <h2>Checkpoint terakhir</h2>
    <p>{{ Object.values(data.checkpoints).filter(Boolean).length }} bukti pemahaman telah dicentang.</p>
    <a v-if="last" :href="last.url">Materi terakhir: {{ last.title }}</a>

    <h2 id="backup">Backup data belajar</h2>
    <p>Backup JSON mencakup catatan, progress, latihan, checkpoint, quiz, bookmark, dan milestone. Simpan di lokasi pribadi.</p>
    <div class="toolbar">
      <button type="button" :disabled="!ready" @click="exportAll">
        <LucideIcon name="download" :size="16" />
        <span>Export data JSON</span>
      </button>
      <label class="button">
        <LucideIcon name="upload" :size="16" />
        <span>Import backup</span>
        <input class="sr-only" type="file" :disabled="importing" accept=".json,application/json" @change="importFile">
      </label>
    </div>

    <section v-if="pending" class="feedback">
      <h3>Periksa sebelum mengganti data</h3>
      <p>{{ Object.keys(pending.progress).length }} status bab, {{ pending.notes.length }} catatan, {{ pending.bookmarks.length }} bookmark. Backup dibuat {{ new Date(pending.exportedAt).toLocaleString('id-ID') }}.</p>
      <p>Data lokal akan diganti. Data sebelumnya diexport sebagai cadangan.</p>
      <div class="toolbar">
        <button type="button" :disabled="importing" @click="confirmImport">
          <LucideIcon name="refresh-cw" :size="16" />
          <span>Export cadangan &amp; ganti data</span>
        </button>
        <button type="button" :disabled="importing" @click="pending = undefined">
          <LucideIcon name="x" :size="16" />
          <span>Batal</span>
        </button>
      </div>
    </section>

    <p role="status">{{ message }}</p>
    <button v-if="previous" type="button" @click="saveFile('fullstack-before-import.json', JSON.stringify(previous, null, 2))">
      <LucideIcon name="archive" :size="16" />
      <span>Unduh ulang cadangan sebelum import</span>
    </button>

    <h2>Hapus data lokal</h2>
    <p>Penghapusan tidak dapat dibatalkan tanpa backup.</p>
    <button type="button" :disabled="!ready || importing" @click="clear">
      <LucideIcon name="trash" :size="16" />
      <span>Hapus seluruh data belajar</span>
    </button>
  </template>

  <template v-else-if="mode === 'notes'">
    <label for="note-search">Cari catatan</label>
    <input id="note-search" v-model="query" type="search" placeholder="Kata dalam catatan Anda">
    <p v-if="ready && !notes.length">Belum ada catatan yang cocok. Tulis catatan di bagian akhir halaman materi.</p>
    <article v-for="note in notes" :key="note.lessonId" class="note-entry">
      <h2><a :href="lesson(note.lessonId)?.url ?? '/belajar/'">{{ lesson(note.lessonId)?.title ?? note.lessonId }}</a></h2>
      <small>{{ new Date(note.updatedAt).toLocaleString('id-ID') }}</small>
      <p class="note-text">{{ note.text }}</p>
    </article>
    <div class="toolbar">
      <button type="button" @click="exportAll">
        <LucideIcon name="download" :size="16" />
        <span>Export catatan &amp; data belajar</span>
      </button>
      <a class="button" href="/progress/#backup">
        <LucideIcon name="upload" :size="16" />
        <span>Import catatan dari backup</span>
      </a>
    </div>
  </template>

  <template v-else>
    <div class="toolbar filter-toolbar">
      <label>Cari bookmark<input v-model="query" type="search"></label>
      <label>Jenis<select v-model="filter"><option value="all">Semua</option><option v-for="type in ['materi', 'code', 'latihan', 'project', 'referensi']" :key="type" :value="type">{{ type }}</option></select></label>
    </div>
    <p v-if="ready && !bookmarks.length">Belum ada bookmark yang cocok. Simpan materi, contoh kode, atau latihan saat belajar.</p>
    <ul class="row-list">
      <li v-for="bookmark in bookmarks" :key="bookmark.id">
        <a :href="bookmark.url">{{ bookmark.title }}<small>{{ bookmark.type }}</small></a>
        <button type="button" @click="removeBookmark(bookmark.id)">
          <LucideIcon name="trash" :size="16" />
          <span>Hapus</span>
        </button>
      </li>
    </ul>
  </template>
</template>
