// Встроенные CSS-модули Rspack отдают классы именованными экспортами:
// `import * as styles from './X.module.css'`.
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export = classes;
}
