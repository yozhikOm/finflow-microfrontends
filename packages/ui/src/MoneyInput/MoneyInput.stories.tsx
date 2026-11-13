import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { MoneyInput, type MoneyInputValue } from './MoneyInput';

const CURRENCIES = ['RUB', 'USD', 'EUR'];

const meta = {
  title: 'Money/MoneyInput',
  component: MoneyInput,
  args: {
    value: { amount: null, currency: 'RUB' },
    currencies: CURRENCIES,
    onChange: fn(),
  },
  // Состояние держит потребитель, как в форме транзакции.
  render: function Render(args) {
    const [value, setValue] = useState<MoneyInputValue>(args.value);
    return (
      <Field label="Сумма">
        <MoneyInput
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange(next);
          }}
        />
      </Field>
    );
  },
} satisfies Meta<typeof MoneyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** «350,50» в рублях — это 35050 копеек (Money в `GLOSSARY.md`). */
export const TypesAmountInMinorUnits: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const amount = canvas.getByRole('textbox', { name: 'Сумма' });
    await userEvent.type(amount, '350,50');
    await expect(amount).toHaveValue('350,50');
    await expect(args.onChange).toHaveBeenLastCalledWith({
      amount: 35050,
      currency: 'RUB',
    });
  },
};

/** Точка, пробелы между разрядами и неполные копейки тоже понятны. */
export const AcceptsCommonNotations: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const amount = canvas.getByRole('textbox', { name: 'Сумма' });
    await userEvent.type(amount, '1 200.5');
    await expect(args.onChange).toHaveBeenLastCalledWith({
      amount: 120050,
      currency: 'RUB',
    });
    await userEvent.clear(amount);
    await userEvent.type(amount, '75');
    await expect(args.onChange).toHaveBeenLastCalledWith({
      amount: 7500,
      currency: 'RUB',
    });
  },
};

/** Валюту суммы выбирает пользователь (спецификация #22). */
export const ChoosesCurrency: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Сумма' }), '10');
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Валюта' }),
      'USD',
    );
    await expect(args.onChange).toHaveBeenLastCalledWith({
      amount: 1000,
      currency: 'USD',
    });
  },
};

/** Не число — `amount: null`, текст в поле остаётся как введён. */
export const NotANumber: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const amount = canvas.getByRole('textbox', { name: 'Сумма' });
    for (const text of ['12,345', 'abc', '1,2,3', '-5']) {
      await userEvent.clear(amount);
      await userEvent.type(amount, text);
      await expect(amount).toHaveValue(text);
      await expect(args.onChange).toHaveBeenLastCalledWith({
        amount: null,
        currency: 'RUB',
      });
    }
    await userEvent.clear(amount);
    await expect(args.onChange).toHaveBeenLastCalledWith({
      amount: null,
      currency: 'RUB',
    });
  },
};

/** Начальный остаток кредитки может быть отрицательным. */
export const Negative: Story = {
  args: { allowNegative: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Сумма' }),
      '-15 300',
    );
    await expect(args.onChange).toHaveBeenLastCalledWith({
      amount: -1530000,
      currency: 'RUB',
    });
  },
};

/** Значение от потребителя, например при правке транзакции. */
export const InitialValue: Story = {
  args: { value: { amount: 120050, currency: 'EUR' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Сумма' })).toHaveValue(
      '1200,50',
    );
    await expect(canvas.getByRole('combobox', { name: 'Валюта' })).toHaveValue(
      'EUR',
    );
  },
};

/** Сброс формы снаружи очищает поле. */
export const ResetFromOutside: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<MoneyInputValue>(args.value);
    return (
      <>
        <Field label="Сумма">
          <MoneyInput {...args} value={value} onChange={setValue} />
        </Field>
        <Button onClick={() => setValue({ amount: null, currency: 'RUB' })}>
          Сбросить
        </Button>
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const amount = canvas.getByRole('textbox', { name: 'Сумма' });
    await userEvent.type(amount, '350,50');
    await userEvent.click(canvas.getByRole('button', { name: 'Сбросить' }));
    await expect(amount).toHaveValue('');
  },
};

/** Одна валюта: выбирать нечего, она показана рядом с суммой. */
export const SingleCurrency: Story = {
  args: { currencies: ['USD'], value: { amount: null, currency: 'USD' } },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument();
    await expect(canvas.getByText('USD')).toBeVisible();
    await userEvent.type(canvas.getByRole('textbox', { name: 'Сумма' }), '1');
    await expect(args.onChange).toHaveBeenLastCalledWith({
      amount: 100,
      currency: 'USD',
    });
  },
};

/** Отказ `server` под полем суммы, например `CURRENCY_MISMATCH`. */
export const WithError: Story = {
  render: function Render(args) {
    return (
      <Field label="Сумма" error="Валюта суммы не совпадает с валютой счёта">
        <MoneyInput {...args} />
      </Field>
    );
  },
  play: async ({ canvas }) => {
    const amount = canvas.getByRole('textbox', { name: 'Сумма' });
    await expect(amount).toBeInvalid();
    await expect(amount).toHaveAccessibleDescription(
      'Валюта суммы не совпадает с валютой счёта',
    );
  },
};
