import ReactDOM from 'react-dom/client';
import { TransactionsPage } from 'transactions/TransactionsPage';

import './index.css';

const App = () => (
  <div className='container'>
    <div>Name: shell</div>
    <div>Framework: react-19</div>
    <TransactionsPage />
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);

root.render(<App />);
