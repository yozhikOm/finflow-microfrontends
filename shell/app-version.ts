import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * Версия приложения из `package.json` для `define` сборки и тестов (ADR-0009).
 * В `buildVersion` манифеста её же пишет Module Federation.
 */
export const appVersion = {
  __APP_VERSION__: JSON.stringify(version),
};
