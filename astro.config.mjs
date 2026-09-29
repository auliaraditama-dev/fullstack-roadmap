import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  output: 'static',
  trailingSlash: 'always',
  integrations: [vue()],
  vite: {
    resolve: { preserveSymlinks: true },
    environments: { astro: { resolve: { external: true } } },
    ssr: { external: ['picomatch', 'tinyglobby'] },
    build: { assetsInlineLimit: 0 },
  },
  devToolbar: { enabled: false },
});
