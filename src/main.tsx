import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { clearLegacyPasswords } from "./lib/secureStore";

// Migración única: elimina contraseñas en texto plano guardadas en localStorage
clearLegacyPasswords();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
