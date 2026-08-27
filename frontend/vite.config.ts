import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Docker Compose 内では backend、ホストで Vite を直接起動する場合は localhost を使う。
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      // /api/* へのリクエストをバックエンドサーバーへ転送する
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
      watch: {
        usePolling: true,
      },
    },

    test: {
      globals: true,
      environment: "jsdom",
      // 既存テストは Hono + JWT Cookie のローカル動作を検証する。
      // 開発用 .env を Firebase モードにしていてもテスト対象を変えない。
      env: {
        VITE_AUTH_PROVIDER: "local",
      },
      setupFiles: ["./src/__tests__/setup.ts"],
      exclude: [...configDefaults.exclude, "firebase-tests/**"],
    },
  };
});
