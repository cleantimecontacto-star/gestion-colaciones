import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { setupCloudSync } from "./lib/cloudSync";

registerSW({ immediate: true });

// Inicia sincronización con la nube si VITE_CONVEX_URL está definida.
// Si no, la app sigue funcionando 100% offline con localStorage.
setupCloudSync();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
