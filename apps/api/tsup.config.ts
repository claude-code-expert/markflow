import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    clean: true,
    sourcemap: true,
  },
  {
    entry: ['api/index.ts'],
    outDir: 'dist/vercel',
    format: ['esm'],
    sourcemap: true,
    noExternal: ['@markflow/db'],
  },
]);
