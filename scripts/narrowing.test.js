import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findNarrowing, isBreakingTitle } from './narrowing.js';

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
