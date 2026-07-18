import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});
