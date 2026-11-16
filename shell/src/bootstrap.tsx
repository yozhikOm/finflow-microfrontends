import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import '@yozhikom/finflow-ui/theme.css';

import './index.css';
import { appRoutes } from './router';

declare const __APP_VERSION__: string;

console.info(`shell ${__APP_VERSION__}`);

// Один роутер на страницу, в Data Mode (ADR-0007, ADR-0008).
const router = createBrowserRouter(appRoutes);

createRoot(document.getElementById('app') as HTMLElement).render(
  <RouterProvider router={router} />,
);
