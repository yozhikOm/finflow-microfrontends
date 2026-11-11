import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findNarrowing, isBreakingTitle } from './narrowing.js';

const transactions = {
  route: 'transactions',
  url: '/transactions',
  params: {},
};
const analytics = { route: 'analytics', url: '/analytics', params: {} };

describe('findNarrowing', () => {
  it('finds nothing when fixtures are unchanged', () => {
    const fixtures = { 'fixtures/addresses.json': [transactions, analytics] };
    assert.deepEqual(findNarrowing(fixtures, fixtures), []);
  });

  it('allows new fixtures', () => {
    assert.deepEqual(
      findNarrowing(
        { 'fixtures/addresses.json': [transactions] },
        { 'fixtures/addresses.json': [transactions, analytics] },
      ),
      [],
    );
  });

  it('reports a removed fixture', () => {
    assert.deepEqual(
      findNarrowing(
        { 'fixtures/addresses.json': [transactions, analytics] },
        { 'fixtures/addresses.json': [transactions] },
      ),
      [{ file: 'fixtures/addresses.json', fixture: analytics }],
    );
  });

  it('reports a changed fixture even if the new version is added', () => {
    const changed = { ...analytics, params: { month: '2026-01' } };
    assert.deepEqual(
      findNarrowing(
        { 'fixtures/addresses.json': [analytics] },
        { 'fixtures/addresses.json': [changed] },
      ),
      [{ file: 'fixtures/addresses.json', fixture: analytics }],
    );
  });

  it('reports every fixture of a removed file', () => {
    assert.deepEqual(
      findNarrowing({ 'fixtures/old.json': [transactions, analytics] }, {}),
      [
        { file: 'fixtures/old.json', fixture: transactions },
        { file: 'fixtures/old.json', fixture: analytics },
      ],
    );
  });

  it('ignores the order of fixtures and of their keys', () => {
    const reordered = { params: {}, url: '/analytics', route: 'analytics' };
    assert.deepEqual(
      findNarrowing(
        { 'fixtures/addresses.json': [transactions, analytics] },
        { 'fixtures/addresses.json': [reordered, transactions] },
      ),
      [],
    );
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
