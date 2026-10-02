import type { APIRoute } from 'astro';

export const GET: APIRoute = () => Response.json([], {
  headers: { 'Cache-Control': 'public, max-age=3600' },
});
