import ReactDOM from "react-dom/client";
import { Transactions } from "transactions/Transactions";

import "./index.css";

const App = () => (
  <div className="container">
    <div>Name: shell</div>
    <div>Framework: react-19</div>
    <Transactions/>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("app") as HTMLElement);

root.render(<App />);