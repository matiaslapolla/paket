import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // the showcase imports the library straight from ../src
  server: { fs: { allow: ['..'] } },
  build: { chunkSizeWarningLimit: 1600 },
  test: { include: ['src/**/*.test.ts'] },
});
