import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';

const configFile = fileURLToPath(
  new URL('../stylelint.config.js', import.meta.url),
);

/** Тексты нарушений для `code` в файле `file` по конфигу репозитория. */
async function violations(file, code) {
  const { results } = await stylelint.lint({
    code,
    codeFilename: file,
    configFile,
  });
  return results[0].warnings.map((warning) => warning.text);
}

const MODULE = 'transactions/src/pages/x/X.module.css';

describe('стили remote-приложения', () => {
  it('пропускают селекторы с локальным классом', async () => {
    const code = `
      .page { color: red; }
      .list li, .list > .item:hover { color: red; }
      .page :global(.external) { color: red; }
      .page :global .external { color: red; }
      :global .external :local(.page) { color: red; }
      .page { &:hover { color: red; } }
      @keyframes spin { from { opacity: 0; } to { opacity: 1; } }
      @media (width > 600px) { .page { color: red; } }
    `;
    assert.deepEqual(await violations(MODULE, code), []);
  });

  for (const selector of [
    'body',
    '*',
    ':root',
    'div',
    ':global(.page)',
    ':global .page',
  ]) {
    it(`не пропускают глобальный селектор «${selector}»`, async () => {
      const found = await violations(MODULE, `${selector} { color: red; }`);
      assert.equal(found.length, 1);
      assert.match(found[0], /глобальный селектор/);
    });
  }

  it('ловят глобальную часть в списке селекторов', async () => {
    const found = await violations(MODULE, '.page, h1 { color: red; }');
    assert.equal(found.length, 1);
    assert.match(found[0], /«h1»/);
  });

  it('не пропускают CSS-файл не модулем', async () => {
    const found = await violations(
      'transactions/src/pages/x/x.css',
      '.page { color: red; }',
    );
    assert.equal(found.length, 1);
    assert.match(found[0], /только CSS-модули/);
  });

  it('пропускают глобальные стили dev-обёртки', async () => {
    const code = 'body { margin: 0; }';
    assert.deepEqual(
      await violations('transactions/src/standalone/global.css', code),
      [],
    );
  });
});

describe('стили shell', () => {
  it('пропускают глобальные селекторы', async () => {
    assert.deepEqual(
      await violations('shell/src/index.css', 'body { margin: 0; }'),
      [],
    );
  });
});
