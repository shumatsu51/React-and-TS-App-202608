import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AuthGate from "./components/AuthGate";
import { AuthProvider } from "./context/AuthProvider";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("root 要素が見つかりません");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </StrictMode>
);
