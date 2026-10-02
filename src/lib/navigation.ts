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
  { href: '/roadmap/', label: 'Roadmap', icon: 'route' },
  { href: '/project/', label: 'Project', icon: 'folder-kanban' },
  { href: '/progress/', label: 'Progress', icon: 'chart' },
  { href: '/bookmark/', label: 'Bookmark', icon: 'bookmark' },
  { href: '/notes/', label: 'Catatan pribadi', icon: 'notebook-pen' },
  { href: '/offline/', label: 'Offline', icon: 'hard-drive-download' },
];
