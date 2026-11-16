import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { appVersion } from './app-version.ts';

export default defineConfig({
  define: appVersion,
  resolve: {
    // Потребитель тестирует свою сторону с заглушкой вместо remote-модуля
    // (ADR-0012): настоящий `./App` загружает Module Federation.
    alias: {
      'transactions/App': fileURLToPath(
        new URL('./src/test/remote-app.stub.tsx', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
