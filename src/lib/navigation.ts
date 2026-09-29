import type { IconName } from './icons';

export interface NavigationItem {
  href: string;
  label: string;
  icon: IconName;
}

export const headerNavigation: NavigationItem[] = [
  { href: '/roadmap/', label: 'Roadmap', icon: 'route' },
  { href: '/project/', label: 'Project', icon: 'folder-kanban' },
  { href: '/progress/', label: 'Progress', icon: 'chart' },
];

export const learningNavigation: NavigationItem[] = [
  { href: '/materi-2026/', label: 'Full Materi 2026', icon: 'library' },
  { href: '/roadmap-26-minggu/', label: 'Roadmap 26 minggu', icon: 'calendar' },
  { href: '/minggu/', label: 'Track Go 8 minggu', icon: 'route' },
  { href: '/project/', label: 'Project', icon: 'folder-kanban' },
  { href: '/latihan/', label: 'Latihan', icon: 'list-checks' },
  { href: '/quiz/', label: 'Quiz', icon: 'circle-help' },
  { href: '/cheatsheet/', label: 'Cheatsheet', icon: 'scroll-text' },
  { href: '/glossary/', label: 'Glossary', icon: 'book-open-text' },
  { href: '/bookmark/', label: 'Bookmark', icon: 'bookmark' },
  { href: '/notes/', label: 'Catatan pribadi', icon: 'notebook-pen' },
  { href: '/offline/', label: 'Materi offline', icon: 'hard-drive-download' },
];
