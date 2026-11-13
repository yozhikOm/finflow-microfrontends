// Проверка сужения общих пакетов (ADR-0012, ADR-0013).
//
// Для каждого пакета в `packages/` сравнивает его контракт с тем, что лежит на
// последнем теге выпуска `<пакет>-v*`. Контракт — «золотые» фикстуры из
// `fixtures/` (`routes`, `events`) и имена токенов `src/theme.css` (`ui`).
// Если PR удаляет или меняет фикстуру выпущенной версии или удаляет либо
// переименовывает её токен, он сужает контракт, и в заголовке PR нужен `!`.
// Значения токенов сужением не считаются (ADR-0005).
// Пакет без тега выпуска пропускается. Тег ищется по имени каталога пакета,
// поэтому `component` пакета в release-please-config.json совпадает с ним.
//
// Запуск: BASE_SHA=<база PR> PR_TITLE='feat(routes): …' node scripts/check-narrowing.js
// Нужна полная история с тегами (`fetch-depth: 0`).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { findNarrowing, isBreakingTitle, themeTokens } from './narrowing.js';

const title = process.env.PR_TITLE ?? '';
const baseSha = process.env.BASE_SHA || 'HEAD';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function latestTag(name) {
  const tags = git('tag', '--list', `${name}-v*`, '--sort=-v:refname');
  return tags.split('\n').find(Boolean);
}

/** Файлы контракта пакета: фикстуры и тема. */
const isContractFile = (file) =>
  /\/fixtures\/.+\.json$/.test(file) || file.endsWith('/src/theme.css');

/** Содержимое файла контракта: список фикстур или имён токенов. */
const parseContract = (file, text) =>
  file.endsWith('.css') ? themeTokens(text) : JSON.parse(text);

/** Контракт пакета из каталога `dir` на коммите `rev`. */
function contractAt(rev, dir) {
  const files = git('ls-tree', '-r', '--name-only', rev, '--', dir)
    .split('\n')
    .filter(isContractFile);
  return Object.fromEntries(
    files.map((file) => [
      file,
      parseContract(file, git('show', `${rev}:${file}`)),
    ]),
  );
}

/** Контракт из рабочего дерева, то есть из головы PR. */
function contractInWorkTree(files) {
  return Object.fromEntries(
    files
      .filter((file) => existsSync(file))
      .map((file) => [file, parseContract(file, readFileSync(file, 'utf8'))]),
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

  const dir = `packages/${name}`;
  const released = contractAt(tag, dir);
  const narrowing = findNarrowing(
    released,
    contractAt(baseSha, dir),
    contractInWorkTree(Object.keys(released)),
  );
  if (narrowing.length === 0) {
    console.log(`${name}: этот PR не сужает контракт ${tag}`);
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
      `::error::${name}: PR удаляет или меняет фикстуры либо удаляет или ` +
        `переименовывает токены темы ${tag} и этим сужает контракт. ` +
        `Поставьте «!» в заголовок PR (major) или верните их.\n${list}`,
    );
  }
}

process.exitCode = failed ? 1 : 0;
