/**
 * @file main.tsx
 * @description Application entrypoint.
 * Renders the React root application inside a StrictMode wrapper.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Initialize and mount the React application on the DOM root element.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
