<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';
import type { DialogOptions, DialogVariant } from '../lib/dialog';

interface DialogRequest extends DialogOptions {
  mode: 'alert' | 'confirm';
  resolve: (value: boolean) => void;
}

const dialog = ref<HTMLDialogElement>();
const request = ref<DialogRequest>();
const lastFocus = ref<HTMLElement | null>(null);

const icons: Record<DialogVariant, 'info' | 'circle-check' | 'circle-help' | 'shield-check'> = {
  info: 'info',
  success: 'circle-check',
  warning: 'circle-help',
  danger: 'shield-check',
};

function finish(value: boolean) {
  const active = request.value;
  request.value = undefined;
  if (dialog.value?.open) dialog.value.close();
  active?.resolve(value);
  queueMicrotask(() => lastFocus.value?.focus());
}

function onRequest(event: Event) {
  const custom = event as CustomEvent<DialogRequest>;
  if (!custom.detail) return;
  if (request.value) request.value.resolve(false);
  lastFocus.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  request.value = custom.detail;
  void nextTick(() => {
    if (!dialog.value?.open) dialog.value?.showModal();
    dialog.value?.querySelector<HTMLElement>('[data-dialog-primary]')?.focus();
  });
}

function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) finish(false);
}

onMounted(() => document.addEventListener('ui:dialog', onRequest));
onBeforeUnmount(() => document.removeEventListener('ui:dialog', onRequest));
</script>

<template>
  <dialog ref="dialog" class="app-dialog" @cancel.prevent="finish(false)" @click="onBackdrop">
    <article v-if="request" class="app-dialog__panel" :data-variant="request.variant ?? 'info'" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
      <div class="app-dialog__icon" aria-hidden="true">
        <LucideIcon :name="icons[request.variant ?? 'info']" :size="22" />
      </div>
      <div class="app-dialog__content">
        <p class="app-dialog__eyebrow">SYSTEM MESSAGE</p>
        <h2 id="app-dialog-title">{{ request.title }}</h2>
        <p id="app-dialog-message">{{ request.message }}</p>
        <div class="app-dialog__actions">
          <button v-if="request.mode === 'confirm'" type="button" class="button button-quiet" @click="finish(false)">
            {{ request.cancelLabel ?? 'Batal' }}
          </button>
          <button type="button" class="button primary" data-dialog-primary @click="finish(true)">
            {{ request.confirmLabel ?? (request.mode === 'confirm' ? 'Lanjutkan' : 'Tutup') }}
          </button>
        </div>
      </div>
    </article>
  </dialog>
</template>
