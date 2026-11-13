/** Имя канала `BroadcastChannel`, через который приложения шлют события. */
export const CHANNEL = 'finflow-events';

/**
 * Типы событий по приложениям-владельцам (ADR-0006). Событие — факт об
 * изменении сущностей владельца без полезной нагрузки: что перезапросить,
 * решает получатель. Новое событие — minor, переименование или удаление — major.
 */
export const eventsByOwner = {
  transactions: ['transactions-changed', 'categories-changed'],
  accounts: ['accounts-changed'],
} as const;

export type Owner = keyof typeof eventsByOwner;
export type FinflowEvent = (typeof eventsByOwner)[Owner][number];

/** Поле `type` сообщения канала, если сообщение — объект. */
const messageType = (data: unknown): unknown =>
  typeof data === 'object' && data !== null && 'type' in data
    ? data.type
    : undefined;

/** Сообщает соседям в этой и в соседних вкладках, что данные изменились. */
export function publish(event: FinflowEvent): void {
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage({ type: event });
  channel.close();
}

/**
 * Вызывает `listener` на каждое событие из `events`. Возвращает отписку,
 * которая закрывает канал: её вызывают при размонтировании.
 */
export function subscribe(
  events: readonly FinflowEvent[],
  listener: (event: FinflowEvent) => void,
): () => void {
  const channel = new BroadcastChannel(CHANNEL);
  // Сообщение без известного типа могла прислать более новая версия пакета в
  // соседнем приложении: его молча пропускают. Лишние поля не мешают.
  channel.onmessage = ({ data }: MessageEvent<unknown>) => {
    const type = messageType(data);
    const event = events.find((subscribed) => subscribed === type);
    if (event) listener(event);
  };
  return () => channel.close();
}
