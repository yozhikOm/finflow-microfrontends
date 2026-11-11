// Narrowing check for shared packages (ADR-0012, ADR-0013).
//
// Compares the golden fixtures of every package in `packages/` with the
// fixtures at the package's latest release tag `<package>-v*`. A removed or
// changed fixture narrows the contract, so the PR title must carry `!`.
// A package without a release tag yet is skipped.
//
// Usage: PR_TITLE='feat(routes): …' node scripts/check-narrowing.js
// Needs the full history with tags (`fetch-depth: 0`).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { findNarrowing, isBreakingTitle } from './narrowing.js';

const title = process.env.PR_TITLE ?? '';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function latestTag(name) {
  const tags = git('tag', '--list', `${name}-v*`, '--sort=-v:refname');
  return tags.split('\n').find(Boolean);
}

function fixturesAt(tag, dir) {
  const files = git('ls-tree', '-r', '--name-only', tag, '--', dir)
    .split('\n')
    .filter((file) => file.endsWith('.json'));
  return Object.fromEntries(
    files.map((file) => [file, JSON.parse(git('show', `${tag}:${file}`))]),
  );
}

function currentFixtures(previous) {
  return Object.fromEntries(
    Object.keys(previous)
      .filter((file) => existsSync(file))
      .map((file) => [file, JSON.parse(readFileSync(file, 'utf8'))]),
  );
}

let failed = false;

const packages = readdirSync('packages', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const name of packages) {
  const tag = latestTag(name);
  if (!tag) {
    console.log(`${name}: no release tag yet, skipped`);
    continue;
  }

  const previous = fixturesAt(tag, `packages/${name}/fixtures`);
  const narrowing = findNarrowing(previous, currentFixtures(previous));
  if (narrowing.length === 0) {
    console.log(`${name}: fixtures of ${tag} are intact`);
    continue;
  }

  const list = narrowing
    .map(({ file, fixture }) => `  ${file}: ${JSON.stringify(fixture)}`)
    .join('\n');
  if (isBreakingTitle(title)) {
    console.log(
      `${name}: fixtures of ${tag} removed or changed, PR is breaking:\n${list}`,
    );
  } else {
    failed = true;
    console.error(
      `::error::${name}: fixtures of ${tag} removed or changed. ` +
        `This narrows the contract: mark the PR title with "!" (major) ` +
        `or restore the fixtures.\n${list}`,
    );
  }
}

process.exitCode = failed ? 1 : 0;
