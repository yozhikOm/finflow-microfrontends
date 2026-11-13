import { afterEach, describe, expect, it, vi } from 'vitest';
import finflowRemotePlugin from './runtime-plugin.js';

type ErrorLoadRemoteArgs = Parameters<
  NonNullable<ReturnType<typeof finflowRemotePlugin>['errorLoadRemote']>
>[0];

// Так Module Federation описывает сбой загрузки манифеста.
const manifestError = new Error(
  'Failed to get manifest. #RUNTIME-003\n' +
    'args: {"manifestUrl":"http://localhost:3002/mf-manifest.json"}',
);

function failure(error: unknown): ErrorLoadRemoteArgs {
  return {
    id: 'accounts/AccountPicker',
    error,
    from: 'runtime',
    lifecycle: 'onLoad',
    origin: {} as ErrorLoadRemoteArgs['origin'],
  };
}

describe('finflow remote runtime plugin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the remote, the module and the error code and returns nothing', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const plugin = finflowRemotePlugin();

    const result = await plugin.errorLoadRemote?.(failure(manifestError));

    expect(result).toBeFalsy();
    expect(log).toHaveBeenCalledOnce();
    const message = log.mock.calls[0].join(' ');
    expect(message).toContain('accounts');
    expect(message).toContain('./AccountPicker');
    expect(message).toContain('RUNTIME-003');
  });

  it('logs an error without a Module Federation code as unknown', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await finflowRemotePlugin().errorLoadRemote?.(failure('boom'));

    expect(log.mock.calls[0].join(' ')).toContain('unknown');
  });

  it('retries loading through retry-plugin', () => {
    const plugin = finflowRemotePlugin();

    expect(plugin.fetch).toBeTypeOf('function');
    expect(plugin.loadEntryError).toBeTypeOf('function');
  });
});
