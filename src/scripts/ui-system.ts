import { iconPaths, type IconName } from '../lib/icons';

const SVG_NS = 'http://www.w3.org/2000/svg';
const enhancedSelects = new WeakMap<HTMLSelectElement, SelectController>();
let openController: SelectController | null = null;

function icon(name: IconName, size = 16): SVGSVGElement {
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

function optionText(option: HTMLOptionElement): string {
  return option.label || option.textContent?.trim() || option.value;
}

class SelectController {
  readonly select: HTMLSelectElement;
  readonly root: HTMLDivElement;
  readonly trigger: HTMLButtonElement;
  readonly value: HTMLSpanElement;
  readonly menu: HTMLDivElement;
  readonly list: HTMLDivElement;
  private searchInput: HTMLInputElement | null = null;
  private observer: MutationObserver;
  private options: HTMLButtonElement[] = [];

  constructor(select: HTMLSelectElement) {
    this.select = select;
    this.root = document.createElement('div');
    this.root.className = 'ui-select';
    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = 'ui-select__trigger';
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.value = document.createElement('span');
    this.value.className = 'ui-select__value';
    const chevron = icon('chevron-down', 16);
    chevron.classList.add('ui-select__chevron');
    this.trigger.append(this.value, chevron);

    this.menu = document.createElement('div');
    this.menu.className = 'ui-select__menu';
    this.menu.hidden = true;
    this.list = document.createElement('div');
    this.list.className = 'ui-select__list';
    this.list.setAttribute('role', 'listbox');
    this.menu.append(this.list);

    const id = select.id || `ui-select-${Math.random().toString(36).slice(2, 9)}`;
    if (!select.id) select.id = id;
    this.trigger.id = `${id}-trigger`;
    this.list.id = `${id}-listbox`;
    this.trigger.setAttribute('aria-controls', this.list.id);
    this.list.setAttribute('aria-labelledby', this.trigger.id);

    const labelledBy = select.getAttribute('aria-labelledby');
    const ariaLabel = select.getAttribute('aria-label');
    if (labelledBy) this.trigger.setAttribute('aria-labelledby', labelledBy);
    else if (ariaLabel) this.trigger.setAttribute('aria-label', ariaLabel);
    else {
      const label = select.closest('label') || document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(select.id)}"]`);
      const labelText = label?.childNodes ? Array.from(label.childNodes).filter((node) => node !== select).map((node) => node.textContent ?? '').join(' ').trim() : '';
      if (labelText) this.trigger.setAttribute('aria-label', labelText);
    }

    select.before(this.root);
    this.root.append(select, this.trigger, this.menu);
    select.classList.add('ui-select__native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    this.trigger.addEventListener('click', () => this.toggle());
    this.trigger.addEventListener('keydown', (event) => this.onTriggerKeydown(event));
    this.menu.addEventListener('keydown', (event) => this.onMenuKeydown(event));
    this.select.addEventListener('change', () => this.sync());
    this.select.addEventListener('input', () => this.sync());
    this.select.addEventListener('ui-select-sync', () => this.sync());

    this.observer = new MutationObserver(() => {
      this.build();
      this.sync();
    });
    this.observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'label', 'selected'] });

    this.build();
    this.sync();
  }

  build(): void {
    this.menu.replaceChildren();
    this.searchInput = null;
    const selectable = Array.from(this.select.options);

    if (selectable.length > 8) {
      const search = document.createElement('label');
      search.className = 'ui-select__search';
      search.append(icon('search', 15));
      const input = document.createElement('input');
      input.type = 'search';
      input.placeholder = 'Cari pilihan…';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Cari pilihan');
      input.addEventListener('input', () => this.filter(input.value));
      input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.focusFirstVisible();
        }
      });
      search.append(input);
      this.menu.append(search);
      this.searchInput = input;
    }

    this.list.replaceChildren();
    this.options = selectable.map((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ui-select__option';
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);
      button.dataset.search = optionText(option).toLocaleLowerCase('id');
      button.disabled = option.disabled;
      const text = document.createElement('span');
      text.textContent = optionText(option);
      const check = icon('check', 16);
      check.classList.add('ui-select__check');
      button.append(text, check);
      button.addEventListener('click', () => this.choose(index));
      this.list.append(button);
      return button;
    });
    this.menu.append(this.list);
  }

  sync(): void {
    const selected = this.select.selectedOptions[0] ?? this.select.options[0];
    this.value.textContent = selected ? optionText(selected) : 'Pilih…';
    this.trigger.disabled = this.select.disabled;
    const selectedIndex = this.select.selectedIndex;
    this.options.forEach((button, index) => {
      const active = index === selectedIndex;
      button.setAttribute('aria-selected', String(active));
      button.classList.toggle('is-selected', active);
      button.tabIndex = active ? 0 : -1;
    });
  }

  open(preferSearch = false): void {
    if (this.select.disabled || this.menu.hidden === false) return;
    openController?.close(false);
    openController = this;
    this.sync();
    this.menu.hidden = false;
    this.root.classList.add('is-open');
    this.trigger.setAttribute('aria-expanded', 'true');
    this.position();
    requestAnimationFrame(() => {
      if (preferSearch && this.searchInput) this.searchInput.focus();
      else this.focusSelected();
    });
  }

  close(restoreFocus = true): void {
    if (this.menu.hidden) return;
    this.menu.hidden = true;
    this.root.classList.remove('is-open', 'drop-up');
    this.trigger.setAttribute('aria-expanded', 'false');
    if (this.searchInput) {
      this.searchInput.value = '';
      this.filter('');
    }
    if (openController === this) openController = null;
    if (restoreFocus) this.trigger.focus();
  }

  toggle(): void {
    if (this.menu.hidden) this.open(false);
    else this.close();
  }

  choose(index: number): void {
    const option = this.select.options[index];
    if (!option || option.disabled) return;
    this.select.value = option.value;
    this.select.dispatchEvent(new Event('input', { bubbles: true }));
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this.sync();
    this.close();
  }

  position(): void {
    const triggerRect = this.trigger.getBoundingClientRect();
    const availableBelow = window.innerHeight - triggerRect.bottom - 16;
    const availableAbove = triggerRect.top - 16;
    const shouldDropUp = availableBelow < 260 && availableAbove > availableBelow;
    this.root.classList.toggle('drop-up', shouldDropUp);
    const available = Math.max(160, Math.min(360, shouldDropUp ? availableAbove : availableBelow));
    this.menu.style.setProperty('--ui-select-max-height', `${available}px`);
  }

  filter(query: string): void {
    const normalized = query.trim().toLocaleLowerCase('id');
    this.options.forEach((button) => {
      button.hidden = Boolean(normalized) && !button.dataset.search?.includes(normalized);
    });
  }

  focusSelected(): void {
    const selected = this.options[this.select.selectedIndex];
    if (selected && !selected.hidden && !selected.disabled) selected.focus();
    else this.focusFirstVisible();
  }

  focusFirstVisible(): void {
    this.options.find((button) => !button.hidden && !button.disabled)?.focus();
  }

  private visibleOptions(): HTMLButtonElement[] {
    return this.options.filter((button) => !button.hidden && !button.disabled);
  }

  private moveFocus(delta: number): void {
    const visible = this.visibleOptions();
    if (!visible.length) return;
    const current = document.activeElement as HTMLButtonElement | null;
    const index = visible.indexOf(current as HTMLButtonElement);
    const next = index < 0 ? 0 : (index + delta + visible.length) % visible.length;
    visible[next]?.focus();
  }

  private onTriggerKeydown(event: KeyboardEvent): void {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      this.open(event.key.length === 1 && event.key !== ' ');
      if (event.key === 'ArrowUp' || event.key === 'End') {
        requestAnimationFrame(() => this.visibleOptions().at(-1)?.focus());
      } else if (event.key === 'Home') {
        requestAnimationFrame(() => this.visibleOptions()[0]?.focus());
      }
    }
  }

  private onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      this.close(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveFocus(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveFocus(-1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      this.visibleOptions()[0]?.focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.visibleOptions().at(-1)?.focus();
    }
  }
}

function enhanceSelect(select: HTMLSelectElement): void {
  if (enhancedSelects.has(select) || select.multiple || select.size > 1 || select.closest('[data-native-select]')) return;
  const controller = new SelectController(select);
  enhancedSelects.set(select, controller);
}

function enhance(root: ParentNode = document): void {
  root.querySelectorAll<HTMLSelectElement>('select').forEach(enhanceSelect);
}

enhance();

const documentObserver = new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node instanceof HTMLSelectElement) enhanceSelect(node);
      enhance(node);
    }
  }
});
documentObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener('pointerdown', (event) => {
  if (!openController) return;
  if (event.target instanceof Node && openController.root.contains(event.target)) return;
  openController.close(false);
});

window.addEventListener('resize', () => openController?.position(), { passive: true });
window.addEventListener('scroll', () => openController?.position(), { passive: true, capture: true });
window.addEventListener('learning-change', () => {
  document.querySelectorAll<HTMLSelectElement>('select').forEach((select) => enhancedSelects.get(select)?.sync());
});
