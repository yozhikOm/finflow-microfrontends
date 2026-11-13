import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findNarrowing, isBreakingTitle, themeTokens } from './narrowing.js';

const transactions = {
  route: 'transactions',
  url: '/transactions',
  params: {},
};
const analytics = { route: 'analytics', url: '/analytics', params: {} };

const FILE = 'fixtures/addresses.json';

/** База PR совпадает с выпущенной версией, меняется только голова PR. */
const narrowingOf = (released, head) => findNarrowing(released, released, head);

describe('findNarrowing', () => {
  it('finds nothing when fixtures are unchanged', () => {
    const fixtures = { [FILE]: [transactions, analytics] };
    assert.deepEqual(narrowingOf(fixtures, fixtures), []);
  });

  it('allows new fixtures', () => {
    assert.deepEqual(
      narrowingOf(
        { [FILE]: [transactions] },
        { [FILE]: [transactions, analytics] },
      ),
      [],
    );
  });

  it('reports a removed fixture', () => {
    assert.deepEqual(
      narrowingOf(
        { [FILE]: [transactions, analytics] },
        { [FILE]: [transactions] },
      ),
      [{ file: FILE, fixture: analytics }],
    );
  });

  it('reports a changed fixture even if the new version is added', () => {
    const changed = { ...analytics, params: { month: '2026-01' } };
    assert.deepEqual(
      narrowingOf({ [FILE]: [analytics] }, { [FILE]: [changed] }),
      [{ file: FILE, fixture: analytics }],
    );
  });

  it('reports every fixture of a removed file', () => {
    assert.deepEqual(
      narrowingOf({ 'fixtures/old.json': [transactions, analytics] }, {}),
      [
        { file: 'fixtures/old.json', fixture: transactions },
        { file: 'fixtures/old.json', fixture: analytics },
      ],
    );
  });

  it('ignores the order of fixtures and of their keys', () => {
    const reordered = { params: {}, url: '/analytics', route: 'analytics' };
    assert.deepEqual(
      narrowingOf(
        { [FILE]: [transactions, analytics] },
        { [FILE]: [reordered, transactions] },
      ),
      [],
    );
  });

  // Ломающий PR, влитый в develop, не должен красить каждый следующий PR
  // до выпуска пакета.
  it('ignores fixtures that the PR base already dropped', () => {
    const released = { [FILE]: [transactions, analytics] };
    const base = { [FILE]: [transactions] };
    assert.deepEqual(findNarrowing(released, base, base), []);
  });

  it('reports only what the PR itself drops', () => {
    const released = { [FILE]: [transactions, analytics] };
    const base = { [FILE]: [transactions] };
    assert.deepEqual(findNarrowing(released, base, {}), [
      { file: FILE, fixture: transactions },
    ]);
  });
});

describe('isBreakingTitle', () => {
  it('accepts the breaking marker before the colon, with or without scope', () => {
    assert.equal(isBreakingTitle('feat(routes)!: drop the month filter'), true);
    assert.equal(isBreakingTitle('feat!: drop the month filter'), true);
  });

  it('rejects titles without the marker in the header', () => {
    assert.equal(isBreakingTitle('feat(routes): drop the month filter'), false);
    assert.equal(isBreakingTitle('fix(routes): parse month!: 2026-01'), false);
    assert.equal(isBreakingTitle('feat(routes): wow!'), false);
  });
});

describe('themeTokens', () => {
  it('lists the custom properties a theme declares', () => {
    const css = `
      :root {
        --ff-color-bg: #fff;
        --ff-font-family:
          system-ui, sans-serif;
        --ff-space-1:0.25rem;
      }
    `;
    assert.deepEqual(themeTokens(css), [
      '--ff-color-bg',
      '--ff-font-family',
      '--ff-space-1',
    ]);
  });

  it('ignores tokens that are only used or commented out', () => {
    const css = `
      /* --ff-old: red; */
      :root {
        --ff-ring: 0 0 0 3px var(--ff-color-accent);
      }
    `;
    assert.deepEqual(themeTokens(css), ['--ff-ring']);
  });

  // Удалённый токен находится так же, как удалённая фикстура.
  it('feeds findNarrowing like fixtures do', () => {
    const file = 'packages/ui/src/theme.css';
    const released = { [file]: themeTokens(':root { --a: 1; --b: 2; }') };
    const renamed = { [file]: themeTokens(':root { --a: 1; --c: 2; }') };
    assert.deepEqual(narrowingOf(released, renamed), [
      { file, fixture: '--b' },
    ]);
  });
});
