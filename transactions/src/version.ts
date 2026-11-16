declare const __APP_VERSION__: string;

// Модуль выполняется один раз, когда код раздела загрузился (ADR-0009).
console.info(`transactions ${__APP_VERSION__}`);
