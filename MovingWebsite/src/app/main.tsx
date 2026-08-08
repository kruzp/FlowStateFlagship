import React from "react";
import ReactDOM from "react-dom/client";

import "../styles/variables.css";
import "../styles/base.css";
import "../styles/layout.css";
import "../styles/utilities.css";
import "../styles/components.css";

import App from "./App";


ReactDOM
  .createRoot(document.getElementById("root")!)
  .render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );