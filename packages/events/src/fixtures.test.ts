import { describe, expect, it, vi } from 'vitest';
import messages from '../fixtures/messages.json' with { type: 'json' };
import { eventsByOwner, publish, subscribe } from './index.js';

// «Золотые» фикстуры (ADR-0012): сообщения и каналы, в которые их слали эта и
// прошлые версии пакета. Текущая версия обязана принять каждое как событие его
// типа, а сама слать только то, что есть в фикстурах: иначе её не поймут
// прошлые версии в соседних приложениях. Имя канала берётся из фикстуры, а не
// из пакета, поэтому его смена тоже ломает тест. Фикстуры пишутся руками,
// удаляются и меняются только в major.
interface Fixture {
  channel: string;
  message: { type: string };
}

const fixtures: Fixture[] = messages;
const events = Object.values(eventsByOwner).flat();
const channels = [...new Set(fixtures.map((fixture) => fixture.channel))];

describe('golden message fixtures', () => {
  it.each(events)('has at least one fixture for %s', (event) => {
    expect(fixtures.some(({ message }) => message.type === event)).toBe(true);
  });

  it.each(fixtures)(
    'accepts $message.type from $channel',
    async ({ channel, message }) => {
      const listener = vi.fn();
      const unsubscribe = subscribe(events, listener);
      const sender = new BroadcastChannel(channel);
      try {
        sender.postMessage(message);
        await vi.waitFor(() =>
          expect(listener).toHaveBeenCalledWith(message.type),
        );
      } finally {
        sender.close();
        unsubscribe();
      }
    },
  );

  it.each(events)('publishes %s as one of the fixtures', async (event) => {
    const received: Fixture[] = [];
    const receivers = channels.map((channel) => {
      const receiver = new BroadcastChannel(channel);
      receiver.onmessage = ({ data }) =>
        received.push({ channel, message: data });
      return receiver;
    });
    try {
      publish(event);
      await vi.waitFor(() => expect(received).toHaveLength(1));
      expect(fixtures).toContainEqual(received[0]);
      expect(received[0].message.type).toBe(event);
    } finally {
      receivers.forEach((receiver) => receiver.close());
    }
  });
});
