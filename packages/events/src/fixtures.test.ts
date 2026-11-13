import { describe, expect, it, vi } from 'vitest';
import messages from '../fixtures/messages.json' with { type: 'json' };
import { CHANNEL, eventsByOwner, subscribe } from './index.js';

// «Золотые» фикстуры (ADR-0012): сообщения, которые слали в канал эта и
// прошлые версии пакета. Каждое обязано приниматься как событие своего типа.
// Фикстуры пишутся руками, удаляются и меняются только в major.
const fixtures: { type: string }[] = messages;
const events = Object.values(eventsByOwner).flat();

describe('golden message fixtures', () => {
  it.each(events)('has at least one fixture for %s', (event) => {
    expect(fixtures.some((fixture) => fixture.type === event)).toBe(true);
  });

  it.each(fixtures)('accepts $type', async (message) => {
    const listener = vi.fn();
    const unsubscribe = subscribe(events, listener);
    const channel = new BroadcastChannel(CHANNEL);
    try {
      channel.postMessage(message);
      await vi.waitFor(() =>
        expect(listener).toHaveBeenCalledWith(message.type),
      );
    } finally {
      channel.close();
      unsubscribe();
    }
  });
});
