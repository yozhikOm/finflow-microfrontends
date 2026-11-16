import { once } from 'node:events';
import { Worker } from 'node:worker_threads';
import { describe, expect, it, vi } from 'vitest';
import { CHANNEL, publish, subscribe } from './index.js';

// Поток `worker_threads` со своим `BroadcastChannel` заменяет соседнюю вкладку:
// у него своя очередь событий, а канал общий только по имени.
function startNeighbour(code: string): Worker {
  return new Worker(code, { eval: true, workerData: { channel: CHANNEL } });
}

describe('events between neighbouring contexts', () => {
  it('delivers a published event to a neighbour', async () => {
    const neighbour = startNeighbour(`
      const { parentPort, workerData } = require('node:worker_threads');
      const channel = new BroadcastChannel(workerData.channel);
      channel.onmessage = ({ data }) => {
        parentPort.postMessage(data);
        channel.close();
      };
      parentPort.postMessage('ready');
    `);
    try {
      const [ready] = await once(neighbour, 'message');
      expect(ready).toBe('ready');

      publish('categories-changed');

      const [received] = await once(neighbour, 'message');
      expect(received).toEqual({ type: 'categories-changed' });
    } finally {
      await neighbour.terminate();
    }
  });

  it('delivers an event from a neighbour to a subscriber', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(['accounts-changed'], listener);
    const neighbour = startNeighbour(`
      const { workerData } = require('node:worker_threads');
      const channel = new BroadcastChannel(workerData.channel);
      channel.postMessage({ type: 'accounts-changed' });
      channel.close();
    `);
    try {
      await vi.waitFor(() =>
        expect(listener).toHaveBeenCalledWith('accounts-changed'),
      );
    } finally {
      unsubscribe();
      await neighbour.terminate();
    }
  });
});
