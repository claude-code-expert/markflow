import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['apps/api/api/index.ts'],
  outDir: 'api',
  format: ['esm'],
  noExternal: [/@markflow\/.*/],
  banner: { js: '/* bundled for vercel */' },
});
