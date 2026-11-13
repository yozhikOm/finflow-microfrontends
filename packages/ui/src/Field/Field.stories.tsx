import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';

import { Input } from '../Input/Input';
import { Field } from './Field';
import { FieldError } from './FieldError';

const meta = {
  title: 'Form/Field',
  component: Field,
  args: { label: 'Имя счёта', children: null },
  render: function Render(args) {
    const [name, setName] = useState('');
    return (
      <Field {...args}>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
    );
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Подпись связана с полем: по ней поле находится и получает фокус. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('Имя счёта'));
    const input = canvas.getByRole('textbox', { name: 'Имя счёта' });
    await expect(input).toHaveFocus();
    await userEvent.type(input, 'Наличные');
    await expect(input).toHaveValue('Наличные');
    await expect(input).not.toHaveAttribute('aria-invalid');
  },
};

export const WithHint: Story = {
  args: { hint: 'Видно только вам' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('textbox', { name: 'Имя счёта' }),
    ).toHaveAccessibleDescription('Видно только вам');
  },
};

/** Отказ по правилу показывается у нужного поля (ADR-0015). */
export const WithError: Story = {
  args: { hint: 'Видно только вам', error: 'Счёт с таким именем уже есть' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Имя счёта' });
    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription(
      'Счёт с таким именем уже есть Видно только вам',
    );
  },
};

/** Текст ошибки отдельно от поля, например у кнопки отправки формы. */
export const StandaloneError: Story = {
  render: () => (
    <FieldError>Не удалось сохранить. Попробуйте ещё раз</FieldError>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('Не удалось сохранить. Попробуйте ещё раз'),
    ).toBeVisible();
  },
};
