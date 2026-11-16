import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { MoneyText } from './MoneyText';

const meta = {
  title: 'Money/MoneyText',
  component: MoneyText,
  args: { value: { amount: 35050, currency: 'RUB' } },
} satisfies Meta<typeof MoneyText>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Сумма в минимальных единицах: 35050 RUB — это 350,50 ₽. */
export const Rubles: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('350,50 ₽');
  },
};

export const Dollars: Story = {
  args: { value: { amount: 123456, currency: 'USD' } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('1 234,56 $');
  },
};

/** Баланс может быть отрицательным, например долг по кредитке. */
export const Negative: Story = {
  args: { value: { amount: -1530000, currency: 'EUR' } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('-15 300,00 €');
  },
};

/** Знак всегда и цвет по знаку: например сальдо месяца. */
export const SignedAndColored: Story = {
  args: {
    value: { amount: 500000, currency: 'RUB' },
    signDisplay: 'always',
    colored: true,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('+5 000,00 ₽');
  },
};

export const Zero: Story = {
  args: {
    value: { amount: 0, currency: 'RUB' },
    signDisplay: 'exceptZero',
    colored: true,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('0,00 ₽');
  },
};
