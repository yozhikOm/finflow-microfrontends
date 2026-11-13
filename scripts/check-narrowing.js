// Проверка сужения общих пакетов (ADR-0012, ADR-0013).
//
// Для каждого пакета в `packages/` сравнивает «золотые» фикстуры с теми, что
// лежат на последнем теге выпуска `<пакет>-v*`. Если PR удаляет или меняет
// фикстуру выпущенной версии, он сужает контракт, и в заголовке PR нужен `!`.
// Пакет без тега выпуска пропускается. Тег ищется по имени каталога пакета,
// поэтому `component` пакета в release-please-config.json совпадает с ним.
//
// Запуск: BASE_SHA=<база PR> PR_TITLE='feat(routes): …' node scripts/check-narrowing.js
// Нужна полная история с тегами (`fetch-depth: 0`).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { findNarrowing, isBreakingTitle } from './narrowing.js';

const title = process.env.PR_TITLE ?? '';
const baseSha = process.env.BASE_SHA || 'HEAD';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function latestTag(name) {
  const tags = git('tag', '--list', `${name}-v*`, '--sort=-v:refname');
  return tags.split('\n').find(Boolean);
}

/** JSON-файлы фикстур из каталога `dir` на коммите `rev`. */
function fixturesAt(rev, dir) {
  const files = git('ls-tree', '-r', '--name-only', rev, '--', dir)
    .split('\n')
    .filter((file) => file.endsWith('.json'));
  return Object.fromEntries(
    files.map((file) => [file, JSON.parse(git('show', `${rev}:${file}`))]),
  );
}

/** Фикстуры из рабочего дерева, то есть из головы PR. */
function fixturesInWorkTree(files) {
  return Object.fromEntries(
    files
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
    console.log(`${name}: тега выпуска ещё нет, проверка пропущена`);
    continue;
  }

  const dir = `packages/${name}/fixtures`;
  const released = fixturesAt(tag, dir);
  const narrowing = findNarrowing(
    released,
    fixturesAt(baseSha, dir),
    fixturesInWorkTree(Object.keys(released)),
  );
  if (narrowing.length === 0) {
    console.log(`${name}: этот PR не трогает фикстуры ${tag}`);
    continue;
  }

  const list = narrowing
    .map(({ file, fixture }) => `  ${file}: ${JSON.stringify(fixture)}`)
    .join('\n');
  if (isBreakingTitle(title)) {
    console.log(
      `${name}: PR сужает контракт ${tag}, в заголовке есть «!»:\n${list}`,
    );
  } else {
    failed = true;
    console.error(
      `::error::${name}: PR удаляет или меняет фикстуры ${tag} и этим сужает ` +
        `контракт. Поставьте «!» в заголовок PR (major) или верните фикстуры.\n${list}`,
    );
  }
}

process.exitCode = failed ? 1 : 0;
