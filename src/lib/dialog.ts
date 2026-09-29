export type DialogVariant = 'info' | 'success' | 'warning' | 'danger';

export interface DialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
}

interface DialogRequest extends DialogOptions {
  mode: 'alert' | 'confirm';
  resolve: (value: boolean) => void;
}

function requestDialog(mode: DialogRequest['mode'], options: DialogOptions): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(mode === 'alert');
  return new Promise((resolve) => {
    document.dispatchEvent(new CustomEvent<DialogRequest>('ui:dialog', {
      detail: {
        ...options,
        mode,
        resolve,
      },
    }));
  });
}

export async function modalAlert(options: DialogOptions): Promise<void> {
  await requestDialog('alert', options);
}

export function modalConfirm(options: DialogOptions): Promise<boolean> {
  return requestDialog('confirm', options);
}
