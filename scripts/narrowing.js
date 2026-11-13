/**
 * «Золотые» фикстуры одного пакета: `{ [файл]: фикстура[] }`.
 * @typedef {Record<string, unknown[]>} FixtureFiles
 */

/** JSON с отсортированными ключами: порядок ключей изменением не считается. */
function canonical(value) {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : item,
  );
}

const keys = (files, file) => new Set((files[file] ?? []).map(canonical));

/**
 * Фикстуры выпущенной версии, которые этот PR удаляет или меняет: они ещё
 * есть в базе PR, но в его голове их больше нет без изменений. Каждая сужает
 * контракт пакета (ADR-0012, ADR-0013). Сужение, уже влитое в базу, на счёт
 * PR не записывается: иначе после `feat!` в develop краснел бы каждый
 * следующий PR до выпуска пакета.
 * @param {FixtureFiles} released фикстуры на последнем теге пакета
 * @param {FixtureFiles} base фикстуры в базе PR
 * @param {FixtureFiles} head фикстуры в голове PR
 * @returns {{ file: string, fixture: unknown }[]}
 */
export function findNarrowing(released, base, head) {
  const narrowing = [];
  for (const [file, fixtures] of Object.entries(released)) {
    const inBase = keys(base, file);
    const inHead = keys(head, file);
    for (const fixture of fixtures) {
      const key = canonical(fixture);
      if (inBase.has(key) && !inHead.has(key))
        narrowing.push({ file, fixture });
    }
  }
  return narrowing;
}

/**
 * Помечает ли заголовок Conventional Commit ломающее изменение знаком `!`
 * после типа или scope: `feat(routes)!: …`. Scope не сверяется с пакетом:
 * release-please относит коммит к пакетам по путям, и `!` в заголовке даёт
 * major каждому пакету, который коммит затрагивает.
 * @param {string} title
 */
export function isBreakingTitle(title) {
  return /^\w+(\([^()]*\))?!:/.test(title);
}

/**
 * Имена токенов, которые объявляет `theme.css` кита: `['--ff-color-bg', …]`.
 * Удаление или переименование токена сужает контракт `ui`, а смена значения —
 * нет (ADR-0005). Имена сравниваются как фикстуры: `findNarrowing` принимает
 * `{ [файл темы]: themeTokens(css) }`.
 * @param {string} css
 * @returns {string[]}
 */
export function themeTokens(css) {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(code.matchAll(/(?:^|[{;\s])(--[\w-]+)\s*:/g), (m) => m[1]);
}
