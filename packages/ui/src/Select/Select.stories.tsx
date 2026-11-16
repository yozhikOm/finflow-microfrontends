import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import { Field } from '../Field/Field';
import { Select } from './Select';

const meta = {
  title: 'Form/Select',
  component: Select,
  args: { onChange: fn() },
  render: function Render(args) {
    const [type, setType] = useState('');
    return (
      <Field label="Тип счёта">
        <Select
          {...args}
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            args.onChange?.(event);
          }}
        >
          <option value="" disabled>
            Выберите тип
          </option>
          <option value="CASH">Наличные</option>
          <option value="BANK">Банковский счёт</option>
          <option value="CREDIT_CARD">Кредитка</option>
        </Select>
      </Field>
    );
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const select = canvas.getByRole('combobox', { name: 'Тип счёта' });
    await userEvent.selectOptions(select, 'Кредитка');
    await expect(select).toHaveValue('CREDIT_CARD');
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('combobox', { name: 'Тип счёта' }),
    ).toBeDisabled();
  },
};
