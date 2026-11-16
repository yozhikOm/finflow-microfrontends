import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHANNEL, publish, subscribe } from './index.js';

describe('publish and subscribe', () => {
  const unsubscribes: (() => void)[] = [];
  afterEach(() => unsubscribes.splice(0).forEach((close) => close()));

  function listen(...args: Parameters<typeof subscribe>) {
    unsubscribes.push(subscribe(...args));
  }

  it('delivers an event to a subscriber in the same tab', async () => {
    const listener = vi.fn();
    listen(['transactions-changed'], listener);

    publish('transactions-changed');

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith('transactions-changed'),
    );
  });

  it('delivers only the event types the subscriber asked for', async () => {
    const accounts = vi.fn();
    const categoriesAndAccounts = vi.fn();
    listen(['accounts-changed'], accounts);
    listen(['categories-changed', 'accounts-changed'], categoriesAndAccounts);

    publish('categories-changed');
    publish('accounts-changed');

    await vi.waitFor(() =>
      expect(categoriesAndAccounts).toHaveBeenCalledTimes(2),
    );
    expect(categoriesAndAccounts.mock.calls).toEqual([
      ['categories-changed'],
      ['accounts-changed'],
    ]);
    expect(accounts.mock.calls).toEqual([['accounts-changed']]);
  });

  it('stops delivering events after unsubscribe', async () => {
    const removedListener = vi.fn();
    const witness = vi.fn();
    const unsubscribe = subscribe(['accounts-changed'], removedListener);
    listen(['accounts-changed'], witness);

    unsubscribe();
    publish('accounts-changed');

    await vi.waitFor(() => expect(witness).toHaveBeenCalled());
    expect(removedListener).not.toHaveBeenCalled();
  });

  it('ignores messages that are not known events', async () => {
    const listener = vi.fn();
    listen(['transactions-changed'], listener);

    const channel = new BroadcastChannel(CHANNEL);
    for (const message of [null, 'transactions-changed', {}, { type: 1 }])
      channel.postMessage(message);
    channel.postMessage({ type: 'budgets-changed' });
    channel.close();
    publish('transactions-changed');

    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    expect(listener.mock.calls).toEqual([['transactions-changed']]);
  });
});
