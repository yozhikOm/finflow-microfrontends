import { defineConfig } from 'vitest/config';

import { appVersion } from './app-version.ts';

export default defineConfig({
  define: appVersion,
  test: {
    environment: 'jsdom',
  },
});
