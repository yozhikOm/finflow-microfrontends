import { Route, Routes } from 'react-router';

import { NotFoundPage } from './pages/not-found/NotFoundPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import './version';

/**
 * Раздел транзакций: `shell` монтирует его на префикс `transactions/*`
 * (ADR-0008). Пути внутри префикса — относительные, ими распоряжается раздел.
 */
export default function App() {
  return (
    <Routes>
      <Route index element={<TransactionsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
