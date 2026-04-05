import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal(): Record<string, string> {
  const envPath = resolve(__dirname, '../../.env.local');
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
    }
  } catch {
    // fall through
  }
  return env;
}

export default defineConfig({
  test: {
    env: loadEnvLocal(),
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 15_000,
    fileParallelism: false,
  },
});
