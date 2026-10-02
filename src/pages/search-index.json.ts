import type { APIRoute } from 'astro';
import lessons from '../data/lessons.json';
import sourceLibrary from '../data/source-library.json';

const sources = new Map(sourceLibrary.map((source) => [source.id, source]));

export const GET: APIRoute = () => {
  const index = lessons.map((lesson) => {
    const sourceText = lesson.sourceRefs.flatMap((ref) => {
      const source = sources.get(ref.sourceId);
      if (!source) return [];
      return source.units
        .filter((unit) => unit.unit >= ref.start && unit.unit <= ref.end)
        .map((unit) => `${unit.heading} ${unit.text} ${unit.notes}`);
    }).join('\n');

    return {
      id: lesson.id,
      title: lesson.title,
      url: lesson.url,
      part: lesson.partTitle,
      type: 'Sesi',
      text: [lesson.description, ...lesson.objectives, ...lesson.practice, ...lesson.tags, sourceText].join('\n'),
    };
  });

  return Response.json(index, { headers: { 'Cache-Control': 'public, max-age=3600' } });
};
