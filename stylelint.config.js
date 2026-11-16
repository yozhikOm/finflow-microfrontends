/** Remote-приложения: их стили не должны выходить за свои CSS-модули. */
const remoteApps = ['transactions', 'accounts', 'analytics'];

export default {
  plugins: ['./scripts/stylelint-local-scope.js'],
  ignoreFiles: ['**/dist/**', '**/storybook-static/**', '**/coverage/**'],
  // Глобальными стилями и темой владеют `shell` и `ui` (ADR-0005).
  rules: { 'finflow/local-scope-only': null },
  overrides: [
    {
      files: remoteApps.map((app) => `${app}/src/**/*.css`),
      rules: { 'finflow/local-scope-only': true },
    },
    {
      // Dev-обёртка отдельного запуска даёт глобальные стили вместо `shell`
      // (решение #19) и в прод-сборку не входит.
      files: remoteApps.map((app) => `${app}/src/standalone/**/*.css`),
      rules: { 'finflow/local-scope-only': null },
    },
  ],
};
