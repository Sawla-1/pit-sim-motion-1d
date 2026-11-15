import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { startOfflineCache } from "./offline/startOfflineCache.js";
import { startInstallPrompt } from "./offline/installPrompt.js";

startOfflineCache();
startInstallPrompt();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
