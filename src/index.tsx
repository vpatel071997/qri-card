import React from "react";
import ReactDOM from "react-dom/client";
// Required to switch between HashRouter(Creating Executable) and BrowserRouter(Running on Web)
import { HashRouter as Router } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import App from "./App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("app") as HTMLElement);
root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
reportWebVitals();
