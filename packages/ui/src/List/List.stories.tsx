import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { Button } from '../Button/Button';
import { ErrorState } from '../ErrorState/ErrorState';
import { List } from './List';
import { ListItem } from './ListItem';

const meta = {
  title: 'List/List',
  component: List,
  args: { 'aria-label': 'Счета', emptyText: 'Счетов пока нет' },
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: [
      <ListItem
        key="1"
        title="Наличные"
        description="Наличные"
        aside="5 000 ₽"
      />,
      <ListItem
        key="2"
        title="Зарплатная карта"
        description="Банковский счёт"
        aside="120 000 ₽"
      />,
      <ListItem
        key="3"
        title="Кредитка"
        description="Кредитка"
        aside="−15 300 ₽"
      />,
    ],
  },
  play: async ({ canvas }) => {
    const list = canvas.getByRole('list', { name: 'Счета' });
    const items = within(list).getAllByRole('listitem');
    await expect(items).toHaveLength(3);
    await expect(items[0]).toHaveTextContent('Наличные');
    await expect(items[0]).toHaveTextContent('5 000 ₽');
  },
};

/** Пустой список показывает текст вместо пустого места. */
export const Empty: Story = {
  args: { children: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Счетов пока нет')).toBeVisible();
    await expect(canvas.queryByRole('list')).not.toBeInTheDocument();
  },
};

const archive = fn();

/**
 * Действие в строке и компактный сбой под ней: неудачная мутация из строки
 * оставляет строку как есть (ADR-0014).
 */
export const WithActionsAndFailure: Story = {
  args: {
    children: [
      <ListItem
        key="1"
        title="Старая карта"
        description="Банковский счёт"
        aside="0 ₽"
        actions={
          <Button variant="ghost" size="sm" onClick={archive}>
            В архив
          </Button>
        }
      >
        <ErrorState compact text="Не удалось отправить в архив" />
      </ListItem>,
      <ListItem
        key="2"
        title="Вклад"
        description="В архиве"
        aside="0 ₽"
        muted
      />,
    ],
  },
  play: async ({ canvas, userEvent }) => {
    const [row] = canvas.getAllByRole('listitem');
    if (!row) throw new Error('Нет строки');
    await expect(within(row).getByRole('alert')).toHaveTextContent(
      'Не удалось отправить в архив',
    );
    await userEvent.click(within(row).getByRole('button', { name: 'В архив' }));
    await expect(archive).toHaveBeenCalled();
  },
};
