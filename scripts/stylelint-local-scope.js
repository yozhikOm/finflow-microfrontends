import parser from 'postcss-selector-parser';
import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

/**
 * Remote-приложение пишет стили только в CSS-модулях и только под своим
 * классом (тикет #9, ADR-0005). Глобальные стили и тему на странице даёт `shell`:
 * селектор без локального класса задел бы его и соседей.
 */
const ruleName = 'finflow/local-scope-only';

const messages = ruleMessages(ruleName, {
  globalFile: () =>
    'В remote-приложении только CSS-модули (*.module.css): глобальные стили даёт shell',
  globalSelector: (selector) =>
    `глобальный селектор «${selector}»: в remote-приложении селектор должен содержать локальный класс`,
});

const isScopeSwitch = (node) =>
  node.type === 'pseudo' &&
  (node.value === ':global' || node.value === ':local');

/**
 * В селекторе есть локальный класс. `:global(…)` локальным не бывает, а
 * `:global` без скобок делает глобальным всё после себя до `:local`.
 * `&` вложенного правила считается локальным: родительское правило
 * проверяется само.
 */
function isLocal(selector, nested) {
  let global = false;
  return selector.nodes.some((node) => {
    if (isScopeSwitch(node) && node.nodes.length === 0) {
      global = node.value === ':global';
      return false;
    }
    if (isScopeSwitch(node)) {
      return (
        node.value === ':local' && node.nodes.some((s) => isLocal(s, nested))
      );
    }
    if (global) return false;
    if (node.type === 'class') return true;
    if (node.type === 'nesting') return nested;
    // `:is(.a)`, `:where(.a)` и подобные: локальный класс внутри.
    return node.type === 'pseudo' && node.nodes.some((s) => isLocal(s, nested));
  });
}

const isInsideKeyframes = (rule) =>
  rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name);

const ruleFunction = (primary) => (root, result) => {
  if (!validateOptions(result, ruleName, { actual: primary })) return;

  const file = root.source?.input.file ?? '';
  if (!file.endsWith('.module.css')) {
    report({ ruleName, result, node: root, message: messages.globalFile() });
    return;
  }

  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) return;
    const nested = rule.parent?.type === 'rule';
    parser((selectors) => {
      selectors.each((selector) => {
        if (isLocal(selector, nested)) return;
        report({
          ruleName,
          result,
          node: rule,
          message: messages.globalSelector(selector.toString().trim()),
          word: selector.toString().trim(),
        });
      });
    }).processSync(rule.selector);
  });
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

export default createPlugin(ruleName, ruleFunction);
