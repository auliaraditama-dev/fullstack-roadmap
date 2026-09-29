import lessons from '../data/lessons.json';
import { catalog } from '../lib/catalog';
import type { APIRoute } from 'astro';

// Development index; postbuild replaces this with the full rendered-page index.
export const GET: APIRoute = () => Response.json(catalog.map((entry) => {
  const lesson = lessons.find((item) => item.id === entry.id);
  return { id: entry.id, title: entry.title, url: entry.url, part: entry.part,
    type: 'Materi', text: JSON.stringify(lesson ?? entry) };
}));
