import { z } from 'zod';

export const statusSchema = z.enum(['read', 'practiced', 'completed']);
export type LessonStatus = z.infer<typeof statusSchema>;

const key = z.string()
  .min(1)
  .max(180)
  .refine((value) => !['__proto__', 'prototype', 'constructor'].includes(value));
const iso = z.iso.datetime();
const localUrl = z.string()
  .min(1)
  .max(500)
  .refine((value) => (
    value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && !value.includes('..')
    && !/%2e|%2f|%5c/i.test(value)
    && !/\s/.test(value)
    && !Array.from(value).some((character) => character.charCodeAt(0) < 32)
  ), 'URL harus berupa path lokal yang aman.');

export const progressSchema = z.object({
  status: statusSchema,
  updatedAt: iso,
}).strict();

export const bookmarkSchema = z.object({
  id: key,
  lessonId: key,
  title: z.string().max(300),
  url: localUrl,
  type: z.enum(['materi', 'code', 'latihan', 'project', 'referensi']),
  updatedAt: iso,
}).strict();

export const noteSchema = z.object({
  lessonId: key,
  text: z.string().max(100000),
  updatedAt: iso,
}).strict();

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: iso,
  progress: z.record(key, progressSchema),
  checkpoints: z.record(key, z.boolean()),
  exercises: z.record(key, z.boolean()),
  milestones: z.record(key, z.boolean()),
  quizzes: z.record(key, z.object({
    answers: z.array(z.number().int().min(0).max(9)).max(100),
    score: z.number().min(0).max(100),
    updatedAt: iso,
  }).strict()),
  bookmarks: z.array(bookmarkSchema).max(10000),
  notes: z.array(noteSchema).max(10000),
  lastLesson: key.nullable(),
}).strict().superRefine((data, context) => {
  if (new Set(data.notes.map((note) => note.lessonId)).size !== data.notes.length) {
    context.addIssue({ code: 'custom', message: 'Catatan duplikat' });
  }
  if (new Set(data.bookmarks.map((bookmark) => bookmark.id)).size !== data.bookmarks.length) {
    context.addIssue({ code: 'custom', message: 'Bookmark duplikat' });
  }
});

export type Backup = z.infer<typeof backupSchema>;
export type Bookmark = z.infer<typeof bookmarkSchema>;

export function emptyData(): Backup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: {},
    checkpoints: {},
    exercises: {},
    milestones: {},
    quizzes: {},
    bookmarks: [],
    notes: [],
    lastLesson: null,
  };
}

export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).length > 10 * 1024 * 1024) throw new Error('File melebihi 10 MB.');
  return backupSchema.parse(JSON.parse(text));
}

export function completion(data: Backup, ids: readonly string[]): number {
  return ids.length
    ? Math.round(ids.filter((id) => data.progress[id]?.status === 'completed').length / ids.length * 100)
    : 0;
}

export function checklistCompletion(values: Record<string, boolean>, ids: readonly string[]): number {
  const known = [...new Set(ids)];
  return known.length ? Math.round(known.filter((id) => values[id] === true).length / known.length * 100) : 0;
}

export function validQuizAnswers(answers: readonly number[], optionCounts: readonly number[]): boolean {
  return answers.length === optionCounts.length
    && answers.every((answer, index) => Number.isInteger(answer) && answer >= 0 && answer < optionCounts[index]!);
}

export function advanceStatus(current: LessonStatus | undefined, next: LessonStatus): LessonStatus {
  const rank = { read: 0, practiced: 1, completed: 2 };
  return current && rank[current] > rank[next] ? current : next;
}

export function migrateData(value: unknown): Backup {
  if (value === undefined) return emptyData();
  return backupSchema.parse(value);
}

export interface LessonSummary {
  id: string;
  title: string;
  url: string;
  part: string;
  chapter: number;
}

export interface SearchEntry {
  id: string;
  title: string;
  url: string;
  part: string;
  type: string;
  text: string;
}

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('id')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function searchEntries(entries: SearchEntry[], query: string): SearchEntry[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (!words.length) return [];

  return entries
    .map((entry) => {
      const title = normalizeSearch(entry.title);
      const text = normalizeSearch(entry.text);
      return {
        entry,
        score: words.reduce((score, word) => score + (title.includes(word) ? 10 : 0) + (text.includes(word) ? 1 : 0), 0),
        matches: words.every((word) => `${title} ${text}`.includes(word)),
      };
    })
    .filter((item) => item.matches)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((item) => item.entry);
}
