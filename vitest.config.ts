import { defineConfig } from 'vitest/config';
import path from 'path';

const workspaceRoot = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [`${workspaceRoot}/packages/**/*.test.ts`, `${workspaceRoot}/packages/**/*.test.tsx`],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**'],
    },
  },
});
