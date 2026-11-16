// Только для проверки типов самого кита, в пакет не входит: CSS-модули кита
// компилирует сборка потребителя, и объявление у него своё (ADR-0005).
// Встроенные CSS-модули Rspack отдают классы именованными экспортами, поэтому
// кит импортирует их как `import * as styles from './X.module.css'`, а имена
// классов пишет в camelCase.
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export = classes;
}

declare module '*.css';
