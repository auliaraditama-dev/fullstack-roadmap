<script setup lang="ts">
import { onMounted, ref } from 'vue';

type Task = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const tasks = ref<Task[]>([]);
const title = ref('');
const loading = ref(true);
const creating = ref(false);
const error = ref('');
const editingId = ref<number | null>(null);
const editingTitle = ref('');
const busyIds = ref<number[]>([]);

function message(value: unknown, fallback: string): string {
  return value instanceof Error && value.message ? value.message : fallback;
}

function setBusy(id: number, busy: boolean): void {
  busyIds.value = busy
    ? [...new Set([...busyIds.value, id])]
    : busyIds.value.filter((value) => value !== id);
}

function isBusy(id: number): boolean {
  return busyIds.value.includes(id);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API}${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    tasks.value = await request<Task[]>('/api/tasks');
  } catch (value) {
    error.value = message(value, 'Gagal memuat task.');
  } finally {
    loading.value = false;
  }
}

async function create(): Promise<void> {
  const value = title.value.trim();
  if (!value || creating.value) return;

  creating.value = true;
  error.value = '';
  try {
    const task = await request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: value }),
    });
    tasks.value = [task, ...tasks.value];
    title.value = '';
  } catch (reason) {
    error.value = message(reason, 'Gagal menambah task.');
  } finally {
    creating.value = false;
  }
}

async function toggle(item: Task): Promise<void> {
  if (isBusy(item.id)) return;
  const previous = item.done;
  item.done = !item.done;
  setBusy(item.id, true);
  error.value = '';
  try {
    Object.assign(item, await request<Task>(`/api/tasks/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done: item.done }),
    }));
  } catch (reason) {
    item.done = previous;
    error.value = message(reason, 'Gagal mengubah status task.');
  } finally {
    setBusy(item.id, false);
  }
}

function beginEdit(item: Task): void {
  if (isBusy(item.id)) return;
  editingId.value = item.id;
  editingTitle.value = item.title;
  error.value = '';
}

function cancelEdit(): void {
  editingId.value = null;
  editingTitle.value = '';
}

async function saveEdit(item: Task): Promise<void> {
  const value = editingTitle.value.trim();
  if (!value || isBusy(item.id)) return;
  if (value === item.title) {
    cancelEdit();
    return;
  }

  setBusy(item.id, true);
  error.value = '';
  try {
    Object.assign(item, await request<Task>(`/api/tasks/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: value }),
    }));
    cancelEdit();
  } catch (reason) {
    error.value = message(reason, 'Gagal mengedit task.');
  } finally {
    setBusy(item.id, false);
  }
}

async function remove(item: Task): Promise<void> {
  if (isBusy(item.id)) return;
  setBusy(item.id, true);
  error.value = '';
  try {
    await request<void>(`/api/tasks/${item.id}`, { method: 'DELETE' });
    tasks.value = tasks.value.filter((task) => task.id !== item.id);
    if (editingId.value === item.id) cancelEdit();
  } catch (reason) {
    error.value = message(reason, 'Gagal menghapus task.');
  } finally {
    setBusy(item.id, false);
  }
}

onMounted(load);
</script>

<template>
  <main>
    <header>
      <p>FULL-STACK PRACTICE</p>
      <h1>Task Tracker</h1>
      <span>Vue → Go → PostgreSQL</span>
    </header>

    <form class="create-form" @submit.prevent="create">
      <label for="title">Task baru</label>
      <div>
        <input
          id="title"
          v-model="title"
          maxlength="200"
          autocomplete="off"
          placeholder="Contoh: Belajar slice Go"
        >
        <button :disabled="creating || !title.trim()">
          {{ creating ? 'Menyimpan…' : 'Tambah' }}
        </button>
      </div>
    </form>

    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="loading" role="status" class="loading">Memuat task…</p>

    <section v-else-if="!tasks.length" class="empty">
      <strong>Belum ada task.</strong>
      <span>Tambahkan satu target belajar untuk mulai.</span>
    </section>

    <ul v-else aria-label="Daftar task">
      <li v-for="item in tasks" :key="item.id" :aria-busy="isBusy(item.id)">
        <form v-if="editingId === item.id" class="edit-form" @submit.prevent="saveEdit(item)">
          <label :for="`edit-${item.id}`">Edit judul</label>
          <input
            :id="`edit-${item.id}`"
            v-model="editingTitle"
            maxlength="200"
            autocomplete="off"
          >
          <div class="task-actions">
            <button :disabled="isBusy(item.id) || !editingTitle.trim()">Simpan</button>
            <button type="button" class="secondary" :disabled="isBusy(item.id)" @click="cancelEdit">Batal</button>
          </div>
        </form>

        <template v-else>
          <label class="task-main">
            <input
              type="checkbox"
              :checked="item.done"
              :disabled="isBusy(item.id)"
              @change="toggle(item)"
            >
            <span :class="{ done: item.done }">{{ item.title }}</span>
          </label>
          <div class="task-actions">
            <button class="secondary" :disabled="isBusy(item.id)" @click="beginEdit(item)">Edit</button>
            <button class="danger" :disabled="isBusy(item.id)" @click="remove(item)">Hapus</button>
          </div>
        </template>
      </li>
    </ul>
  </main>
</template>
