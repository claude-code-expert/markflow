import { createDb, type Db } from '@markflow/db';

let cached: Db | null = null;

export function getDb(): Db {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    cached = createDb(url, { max: 3, idle_timeout: 20 });
  }
  return cached;
}
