import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Все тестовые файлы работают с одной тестовой базой и чистят коллекцию
    // перед каждым тестом, поэтому параллельные файлы мешали бы друг другу.
    fileParallelism: false,
  },
});
