import './ui-system';
import { readData, updateData } from '../lib/db';
import { iconPaths, type IconName } from '../lib/icons';

const SVG_NS = 'http://www.w3.org/2000/svg';
const theme = document.querySelector<HTMLSelectElement>('#theme');

function createIcon(name: IconName, size = 15): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('lucide-icon');
  svg.dataset.lucide = name;

  for (const pathData of iconPaths[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  }

  return svg;
}

function setTheme(mode: string): void {
  const normalized = ['system', 'light', 'dark'].includes(mode) ? mode : 'system';
  if (theme) {
    theme.value = normalized;
    theme.dispatchEvent(new Event('ui-select-sync'));
  }
  document.documentElement.dataset.theme = normalized === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : normalized;
}

function applyTheme(): void {
  try {
    setTheme(localStorage.getItem('fs-theme') ?? 'system');
  } catch {
    setTheme('system');
  }
}

applyTheme();
theme?.addEventListener('change', () => {
  const mode = theme.value;
  try {
    localStorage.setItem('fs-theme', mode);
  } catch {
    // Theme remains active for this page even when storage is disabled.
  }
  setTheme(mode);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!theme || theme.value === 'system') applyTheme();
});

function updateConnectionState(label = navigator.onLine ? 'Online' : 'Offline'): void {
  const container = document.querySelector<HTMLElement>('#connection');
  const text = container?.querySelector<HTMLElement>('[data-connection-label]');
  const onlineIcon = container?.querySelector<HTMLElement>('[data-online-icon]');
  const offlineIcon = container?.querySelector<HTMLElement>('[data-offline-icon]');
  const offline = !navigator.onLine || label !== 'Online';

  if (!container || !text) return;
  text.textContent = label;
  container.classList.toggle('is-offline', offline);
  if (onlineIcon) onlineIcon.hidden = offline;
  if (offlineIcon) offlineIcon.hidden = !offline;
}

updateConnectionState();
window.addEventListener('online', () => updateConnectionState());
window.addEventListener('offline', () => updateConnectionState());

const sidebar = document.querySelector<HTMLElement>('#sidebar');
const opener = document.querySelector<HTMLButtonElement>('#open-nav');
const backdrop = document.querySelector<HTMLElement>('#nav-backdrop');

function closeMenu(restoreFocus = true): void {
  sidebar?.classList.remove('open');
  opener?.setAttribute('aria-expanded', 'false');
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('nav-open');
  if (restoreFocus) opener?.focus();
}

matchMedia('(min-width: 981px)').addEventListener('change', (event) => {
  if (event.matches) closeMenu(false);
});

opener?.addEventListener('click', () => {
  if (sidebar?.classList.contains('open')) { closeMenu(); return; }
  sidebar?.classList.add('open');
  opener.setAttribute('aria-expanded', 'true');
  if (backdrop) backdrop.hidden = false;
  document.body.classList.add('nav-open');
  document.querySelector<HTMLButtonElement>('#close-nav')?.focus();
});
document.querySelector('#close-nav')?.addEventListener('click', () => closeMenu());
backdrop?.addEventListener('click', () => closeMenu());
document.querySelector<HTMLButtonElement>('#dock-search')?.addEventListener('click', () => {
  document.dispatchEvent(new Event('open-search'));
});
sidebar?.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
  link.addEventListener('click', () => closeMenu(false));
});

document.addEventListener('keydown', (event) => {
  if (!sidebar?.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
    return;
  }
  if (event.key !== 'Tab') return;

  const elements = Array.from(sidebar.querySelectorAll<HTMLElement>('a,button,summary'))
    .filter((element) => element.getClientRects().length > 0);
  const first = elements[0];
  const last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});

function toolbarButton(icon: IconName, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.append(createIcon(icon), document.createTextNode(label));
  return button;
}

document.querySelectorAll<HTMLElement>('.prose pre:not(.pdf-page-text):not(.source-page)').forEach((pre, index) => {
  pre.tabIndex = 0;
  pre.setAttribute('aria-label', `Blok kode ${index + 1}`);

  const bar = document.createElement('div');
  bar.className = 'code-toolbar';
  const language = document.createElement('span');
  language.textContent = pre.querySelector('code')?.className.replace('language-', '') || pre.dataset.language || 'Kode';

  const copy = toolbarButton('copy', 'Salin kode');
  copy.addEventListener('click', async () => {
    const textNode = copy.lastChild;
    try {
      await navigator.clipboard.writeText(pre.textContent ?? '');
      if (textNode) textNode.textContent = 'Tersalin';
    } catch {
      if (textNode) textNode.textContent = 'Pilih teks untuk menyalin';
    }
    setTimeout(() => {
      if (textNode) textNode.textContent = 'Salin kode';
    }, 2000);
  });

  const wrap = toolbarButton('wrap-text', 'Bungkus baris');
  wrap.setAttribute('aria-pressed', 'false');
  wrap.addEventListener('click', () => {
    const active = pre.classList.toggle('wrap');
    wrap.setAttribute('aria-pressed', String(active));
  });

  bar.append(language, copy, wrap);
  pre.before(bar);
});

interface ReadingPreference {
  size?: number;
  width?: 'normal' | 'comfortable';
}

function loadReadingPreference(): ReadingPreference {
  try {
    const parsed = JSON.parse(localStorage.getItem('fs-reading') ?? '{}') as ReadingPreference;
    const size = typeof parsed.size === 'number' && [0.9, 1, 1.15].includes(parsed.size) ? parsed.size : 1;
    const width = parsed.width === 'comfortable' ? 'comfortable' : 'normal';
    return { size, width };
  } catch {
    return { size: 1, width: 'normal' };
  }
}

function applyReadingPreference(): void {
  const preference = loadReadingPreference();
  document.documentElement.style.setProperty('--reading-scale', String(preference.size ?? 1));
  document.documentElement.dataset.width = preference.width ?? 'normal';
  const select = document.querySelector<HTMLSelectElement>('#reading-width');
  if (select) {
    select.value = preference.width ?? 'normal';
    select.dispatchEvent(new Event('ui-select-sync'));
  }
}

function saveReading(size?: number): void {
  const old = loadReadingPreference();
  const width = document.documentElement.dataset.width === 'comfortable' ? 'comfortable' : 'normal';
  try {
    localStorage.setItem('fs-reading', JSON.stringify({ size: size ?? old.size ?? 1, width } satisfies ReadingPreference));
  } catch {
    // Reading controls still work for the current page when storage is unavailable.
  }
}

applyReadingPreference();
document.querySelectorAll<HTMLButtonElement>('[data-size]').forEach((button) => {
  button.addEventListener('click', () => {
    const size = Number(button.dataset.size);
    if (![0.9, 1, 1.15].includes(size)) return;
    document.documentElement.style.setProperty('--reading-scale', String(size));
    saveReading(size);
  });
});
document.querySelector('#focus-mode')?.addEventListener('click', (event) => {
  const active = document.body.classList.toggle('focus-mode');
  (event.currentTarget as HTMLElement).setAttribute('aria-pressed', String(active));
});
document.querySelector('#reading-width')?.addEventListener('change', (event) => {
  const value = (event.target as HTMLSelectElement).value;
  document.documentElement.dataset.width = value === 'comfortable' ? 'comfortable' : 'normal';
  saveReading();
});

async function markProgress(): Promise<void> {
  try {
    const data = await readData();
    document.querySelectorAll<HTMLElement>('[data-lesson-id]').forEach((element) => {
      element.classList.toggle('completed', data.progress[element.dataset.lessonId!]?.status === 'completed');
    });
  } catch {
    // Read-only curriculum remains usable when storage is unavailable.
  }
}

void markProgress();
window.addEventListener('learning-change', () => void markProgress());

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    document.querySelectorAll('.toc a').forEach((link) => {
      link.classList.toggle('current', link.getAttribute('href') === `#${entry.target.id}`);
    });
  }
}, { rootMargin: '-15% 0px -65% 0px' });
document.querySelectorAll('.prose h2,.prose h3').forEach((heading) => observer.observe(heading));

document.querySelectorAll<HTMLInputElement>('[data-filter-list]').forEach((input) => {
  input.addEventListener('input', () => {
    const query = input.value.toLocaleLowerCase('id');
    document.querySelectorAll<HTMLElement>('[data-searchable]').forEach((element) => {
      element.hidden = !element.textContent?.toLocaleLowerCase('id').includes(query);
    });
  });
});

document.querySelectorAll<HTMLInputElement>('[data-exercise]').forEach((input) => {
  readData().then((data) => {
    input.checked = Boolean(data.exercises[input.dataset.exercise!]);
  }).catch(() => {});

  input.addEventListener('change', () => {
    void updateData((data) => {
      data.exercises[input.dataset.exercise!] = input.checked;
    }).catch(() => {
      input.checked = !input.checked;
      alert('Latihan belum tersimpan. Periksa izin penyimpanan browser.');
    });
  });
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' }).then((registration) => {
      const banner = document.querySelector<HTMLElement>('#update-banner');
      const showUpdate = (): void => {
        if (banner) banner.hidden = false;
      };

      if (registration.waiting) showUpdate();
      registration.addEventListener('updatefound', () => {
        const next = registration.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
        });
      });

      document.querySelector('#apply-update')?.addEventListener('click', () => {
        registration.waiting?.postMessage({ type: 'ACTIVATE' });
      });
      document.querySelector('#dismiss-update')?.addEventListener('click', () => {
        if (banner) banner.hidden = true;
      });

      let refreshing = false;
      const alreadyControlled = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (alreadyControlled && !refreshing) {
          refreshing = true;
          location.reload();
        }
      });
    }).catch(() => updateConnectionState('Offline nonaktif'));
  });
}
