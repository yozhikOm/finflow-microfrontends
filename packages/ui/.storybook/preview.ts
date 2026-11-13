import type { Preview } from '@storybook/react-vite';

// Витрина подключает тему так же, как `shell` (ADR-0005): компоненты кита
// без неё не получают значений токенов.
import '../src/theme.css';
import './preview.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    // Нарушение a11y роняет тест story (`@storybook/addon-vitest`).
    a11y: { test: 'error' },
    controls: { expanded: true },
  },
};

export default preview;
