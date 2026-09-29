<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';
import { readData, storageError, updateData } from '../lib/db';
import { advanceStatus, type LessonStatus } from '../lib/model';

const props = defineProps<{ id: string; title: string; url: string; checkpoints: string[] }>();
const state = ref<LessonStatus>('read');
const note = ref('');
const saved = ref('');
const error = ref('');
const bookmarked = ref(false);
const checks = ref<Record<string, boolean>>({});
const ready = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let queue = Promise.resolve();
let dirty = false;
let loadSequence = 0;
const bookmarkBusy = ref(false);

async function load(markVisited = false) {
  const sequence = ++loadSequence;
  try {
    const data = await readData();
    if (sequence !== loadSequence) return;
    state.value = data.progress[props.id]?.status ?? 'read';
    if (!dirty) note.value = data.notes.find((item) => item.lessonId === props.id)?.text ?? '';
    bookmarked.value = data.bookmarks.some((item) => item.id === props.id);
    checks.value = data.checkpoints;
    ready.value = true;
    error.value = '';

    if (markVisited) {
      await updateData((current) => {
        current.lastLesson = props.id;
        current.progress[props.id] = {
          status: advanceStatus(current.progress[props.id]?.status, 'read'),
          updatedAt: new Date().toISOString(),
        };
      });
    }
  } catch (cause) {
    error.value = storageError(cause);
  }
}

function refreshFromChange() {
  void load(false);
}

async function status(event: Event) {
  const input = event.target as HTMLSelectElement;
  const value = input.value as LessonStatus;
  input.disabled = true;
  try {
    await updateData((data) => {
      data.progress[props.id] = { status: value, updatedAt: new Date().toISOString() };
    });
    state.value = value;
    error.value = '';
  } catch (cause) {
    input.value = state.value;
    error.value = storageError(cause);
  } finally {
    input.disabled = false;
  }
}

async function bookmark() {
  if (bookmarkBusy.value) return;
  bookmarkBusy.value = true;
  try {
    const committed = await updateData((data) => {
      const index = data.bookmarks.findIndex((item) => item.id === props.id);
      if (index >= 0) data.bookmarks.splice(index, 1);
      else data.bookmarks.push({ id: props.id, lessonId: props.id, title: props.title, url: props.url, type: 'materi', updatedAt: new Date().toISOString() });
    });
    bookmarked.value = committed.bookmarks.some((item) => item.id === props.id);
    error.value = '';
  } catch (cause) {
    error.value = storageError(cause);
  }
  finally { bookmarkBusy.value = false; }
}

function save() {
  if (!dirty) return;
  if (timer) clearTimeout(timer);
  const text = note.value;
  dirty = true;
  saved.value = 'Menyimpan…';
  queue = queue.then(async () => {
    try {
      await updateData((data) => {
        data.notes = data.notes.filter((item) => item.lessonId !== props.id);
        if (text.trim()) data.notes.push({ lessonId: props.id, text, updatedAt: new Date().toISOString() });
      });
      if (note.value === text) {
        dirty = false;
        saved.value = 'Tersimpan di perangkat ini';
      }
      error.value = '';
    } catch (cause) {
      saved.value = 'Belum tersimpan';
      error.value = storageError(cause);
    }
  });
}

function schedule() {
  dirty = true;
  saved.value = 'Perubahan belum tersimpan';
  if (timer) clearTimeout(timer);
  timer = setTimeout(save, 350);
}

async function check(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.checked;
  input.disabled = true;
  try {
    await updateData((data) => {
      data.checkpoints[`${props.id}:${index}`] = value;
    });
    checks.value[`${props.id}:${index}`] = value;
    error.value = '';
  } catch (cause) {
    input.checked = checks.value[`${props.id}:${index}`] === true;
    error.value = storageError(cause);
  } finally {
    input.disabled = false;
  }
}

function beforeLeave(event: BeforeUnloadEvent) {
  if (!dirty) return;
  save();
  event.preventDefault();
}

onMounted(() => {
  window.addEventListener('learning-change', refreshFromChange);
  window.addEventListener('beforeunload', beforeLeave);
  void load(true);
});

onUnmounted(() => {
  if (timer) clearTimeout(timer);
  window.removeEventListener('learning-change', refreshFromChange);
  window.removeEventListener('beforeunload', beforeLeave);
});
</script>

<template>
  <section class="learning-tools" aria-labelledby="checkpoint">
    <h2 id="checkpoint">Saya siap lanjut jika…</h2>
    <p>Centang berdasarkan praktik yang sudah Anda lakukan. Membuka halaman tidak berarti menguasai materi.</p>

    <label v-for="(item, index) in checkpoints" :key="index" class="check-row">
      <input type="checkbox" :disabled="!ready" :checked="checks[id + ':' + index]" @change="check(index, $event)">
      <span>{{ item }}</span>
    </label>

    <div class="toolbar">
      <label>Status belajar
        <select :value="state" :disabled="!ready" @change="status($event)">
          <option value="read">Dibaca</option>
          <option value="practiced">Dipraktikkan</option>
          <option value="completed">Selesai</option>
        </select>
      </label>
      <button type="button" :disabled="!ready || bookmarkBusy" :aria-pressed="bookmarked" @click="bookmark">
        <LucideIcon :name="bookmarked ? 'check' : 'bookmark'" :size="16" />
        <span>{{ bookmarked ? 'Hapus bookmark' : 'Bookmark materi' }}</span>
      </button>
    </div>

    <h2 id="catatan">Catatan pribadi</h2>
    <label :for="'note-' + id">Apa yang Anda pahami? Apa yang masih perlu dicoba?</label>
    <textarea :id="'note-' + id" v-model="note" maxlength="100000" rows="6" :disabled="!ready" @input="schedule" @blur="save"></textarea>

    <div class="toolbar">
      <small role="status">{{ saved || 'Catatan tersimpan hanya di browser ini.' }}</small>
      <button type="button" :disabled="!ready" @click="save">
        <LucideIcon name="save" :size="16" />
        <span>Simpan catatan</span>
      </button>
    </div>

    <p v-if="error" role="alert" class="error">{{ error }}</p>
  </section>
</template>
