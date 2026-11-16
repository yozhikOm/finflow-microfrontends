import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { Button } from './Button';

const meta = {
  title: 'Form/Button',
  component: Button,
  args: { children: 'Сохранить', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Сохранить' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Отмена' },
};

/** Действие в строке списка. */
export const GhostSmall: Story = {
  args: { variant: 'ghost', size: 'sm', children: 'В архив' },
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Сохранить' }),
    ).toBeDisabled();
  },
};

/** Без явного `type="submit"` кнопка внутри формы её не отправляет. */
export const DoesNotSubmitByDefault: Story = {
  args: { children: 'Добавить строку' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Добавить строку' }),
    ).toHaveAttribute('type', 'button');
  },
};

export const Submit: Story = {
  args: { variant: 'primary', type: 'submit' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Сохранить' }),
    ).toHaveAttribute('type', 'submit');
  },
};
