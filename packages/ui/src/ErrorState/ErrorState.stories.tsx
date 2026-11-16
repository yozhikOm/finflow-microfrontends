import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { ErrorState } from './ErrorState';

const meta = {
  title: 'Feedback/ErrorState',
  component: ErrorState,
  args: { text: 'Счета временно недоступны' },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Сбой на месте блока: данные или модуль не загрузились (ADR-0014). */
export const WithRetry: Story = {
  args: { retry: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Счета временно недоступны',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Повторить' }));
    await expect(args.retry).toHaveBeenCalledOnce();
  },
};

/** Без `retry` повторять нечего, и кнопки нет. */
export const WithoutRetry: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Счета временно недоступны',
    );
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

/** Компактный вариант для строки списка и поля формы. */
export const Compact: Story = {
  args: { text: 'Не удалось удалить', compact: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Не удалось удалить',
    );
  },
};

/** Компактный вариант с повтором, например у `AccountPicker` в форме. */
export const CompactWithRetry: Story = {
  args: { compact: true, retry: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Повторить' }));
    await expect(args.retry).toHaveBeenCalledOnce();
  },
};

/** Текст кнопки задаёт потребитель, если «Повторить» не подходит. */
export const CustomRetryLabel: Story = {
  args: { retry: fn(), retryLabel: 'Загрузить снова' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Загрузить снова' }),
    ).toBeInTheDocument();
  },
};
