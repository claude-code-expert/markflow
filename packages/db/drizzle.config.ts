import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(): string {
  // Read DATABASE_URL from apps/api/.env
  const envPath = resolve(__dirname, '../../apps/api/.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = /^DATABASE_URL=(.+)$/.exec(line.trim());
      if (match?.[1]) return match[1];
    }
  } catch {
    // fall through
  }
  return process.env.DATABASE_URL ?? '';
}

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? loadEnv(),
  },
});
