import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { remoteComponent, type RemoteFailureProps } from './index.js';

type Props = { name: string };
type Module = { default: (props: Props) => React.ReactNode };

const Greeting = ({ name }: Props) => <p>Привет, {name}</p>;

/** Подложный загрузчик: каждый вызов — промис, которым управляет тест. */
function fakeLoader() {
  const calls: {
    resolve: (m: Module) => void;
    reject: (e: unknown) => void;
  }[] = [];
  const load = vi.fn(
    () =>
      new Promise<Module>((resolve, reject) => {
        calls.push({ resolve, reject });
      }),
  );
  return { load, calls };
}

const options = {
  loading: <p>заглушка</p>,
  failure: ({ retry }: RemoteFailureProps) => (
    <button onClick={retry}>Повторить</button>
  ),
};

/** Даёт промисам и таймерам отработать внутри `act`. */
const flush = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  // React пишет пойманные ErrorBoundary ошибки в консоль.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('remoteComponent', () => {
  it('shows the placeholder while the module loads, then the module with its props', async () => {
    const { load, calls } = fakeLoader();
    const Remote = remoteComponent(load, options);

    render(<Remote name="Таня" />);
    await flush();
    expect(screen.getByText('заглушка')).toBeTruthy();

    calls[0].resolve({ default: Greeting });
    await flush();

    expect(screen.getByText('Привет, Таня')).toBeTruthy();
    expect(screen.queryByText('заглушка')).toBeNull();
  });

  it('shows the failure when the module fails to load', async () => {
    const { load, calls } = fakeLoader();
    const Remote = remoteComponent(load, options);

    render(<Remote name="Таня" />);
    await flush();
    calls[0].reject(new Error('RUNTIME-003'));
    await flush();

    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
    expect(screen.queryByText('заглушка')).toBeNull();
  });

  it('shows the same failure when the loaded module throws while rendering', async () => {
    const { load, calls } = fakeLoader();
    const Remote = remoteComponent(load, options);
    const Broken = (): React.ReactNode => {
      throw new Error('render');
    };

    render(<Remote name="Таня" />);
    await flush();
    calls[0].resolve({ default: Broken });
    await flush();

    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
  });

  it('treats loading longer than 10 seconds as a failure', async () => {
    const { load, calls } = fakeLoader();
    const Remote = remoteComponent(load, options);

    render(<Remote name="Таня" />);
    await flush(9_999);
    expect(screen.getByText('заглушка')).toBeTruthy();

    await flush(1);
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();

    // Модуль, пришедший после таймаута, сбой не отменяет.
    calls[0].resolve({ default: Greeting });
    await flush();
    expect(screen.queryByText('Привет, Таня')).toBeNull();
  });

  it('loads the module again on retry without reloading the page', async () => {
    const { load, calls } = fakeLoader();
    const reload = vi.fn();
    const Remote = remoteComponent(load, { ...options, reload });

    render(<Remote name="Таня" />);
    await flush();
    calls[0].reject(new Error('RUNTIME-003'));
    await flush();

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await flush();
    expect(screen.getByText('заглушка')).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);

    calls[1].resolve({ default: Greeting });
    await flush();
    expect(screen.getByText('Привет, Таня')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the page when a retry without reloading did not help', async () => {
    const { load, calls } = fakeLoader();
    const reload = vi.fn();
    const Remote = remoteComponent(load, { ...options, reload });

    render(<Remote name="Таня" />);
    await flush();
    calls[0].reject(new Error('RUNTIME-003'));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await flush(10_000);

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(reload).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('loads the module once for all places it is shown', async () => {
    const { load, calls } = fakeLoader();
    const Remote = remoteComponent(load, options);

    render(
      <>
        <Remote name="Таня" />
        <Remote name="Оля" />
      </>,
    );
    await flush();
    calls[0].resolve({ default: Greeting });
    await flush();

    expect(screen.getByText('Привет, Таня')).toBeTruthy();
    expect(screen.getByText('Привет, Оля')).toBeTruthy();
    expect(load).toHaveBeenCalledOnce();
  });

  it('tries to load again when shown after a failure', async () => {
    const { load, calls } = fakeLoader();
    const Remote = remoteComponent(load, options);

    const { unmount } = render(<Remote name="Таня" />);
    await flush();
    calls[0].reject(new Error('RUNTIME-003'));
    await flush();
    unmount();

    render(<Remote name="Таня" />);
    await flush();
    expect(screen.getByText('заглушка')).toBeTruthy();

    calls[1].resolve({ default: Greeting });
    await flush();
    expect(screen.getByText('Привет, Таня')).toBeTruthy();
  });

  it('loads again on retry in a place whose next attempt already failed elsewhere', async () => {
    const { load, calls } = fakeLoader();
    const reload = vi.fn();
    const Remote = remoteComponent(load, { ...options, reload });

    render(
      <>
        <Remote name="Таня" />
        <Remote name="Оля" />
      </>,
    );
    await flush();
    calls[0].reject(new Error('RUNTIME-003'));
    await flush();
    const [first, second] = screen.getAllByRole('button', {
      name: 'Повторить',
    });

    fireEvent.click(first);
    await flush();
    calls[1].reject(new Error('RUNTIME-003'));
    await flush();

    fireEvent.click(second);
    await flush();
    expect(load).toHaveBeenCalledTimes(3);
    calls[2].resolve({ default: Greeting });
    await flush();
    expect(screen.getByText('Привет, Оля')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('retries without reloading again after a retry has helped', async () => {
    const { load, calls } = fakeLoader();
    const reload = vi.fn();
    const Remote = remoteComponent(load, { ...options, reload });
    const Picky = ({ name }: Props) => {
      if (name === 'сбой') throw new Error('render');
      return <p>Привет, {name}</p>;
    };

    const { rerender } = render(<Remote name="Таня" />);
    await flush();
    calls[0].reject(new Error('RUNTIME-003'));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await flush();
    calls[1].resolve({ default: Picky });
    await flush();
    expect(screen.getByText('Привет, Таня')).toBeTruthy();

    rerender(<Remote name="сбой" />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await flush();

    expect(reload).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(3);
  });
});
