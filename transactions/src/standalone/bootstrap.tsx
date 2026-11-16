import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import '@yozhikom/finflow-ui/theme.css';

import './global.css';
import { standaloneRoutes } from './routes';

// Внутри `shell` глобальные стили и тему даёт `shell` (ADR-0005), здесь — обёртка.
const router = createBrowserRouter(standaloneRoutes);

createRoot(document.getElementById('app') as HTMLElement).render(
  <RouterProvider router={router} />,
);
