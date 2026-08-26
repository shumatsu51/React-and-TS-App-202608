import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AuthGate from "./components/auth/AuthGate";
import { AuthProvider } from "./context/AuthProvider";
import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("root 要素が見つかりません");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </AuthProvider>
  </StrictMode>
);
