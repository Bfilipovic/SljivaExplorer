import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const explorerApiPort = env.EXPLORER_API_PORT || "4176";
  const explorerApiUrl = `http://localhost:${explorerApiPort}`;
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:3000";

  return {
    plugins: [svelte()],
    server: {
      port: 4175,
      proxy: {
        // Proxy Explorer API to local backend (must come before /api to avoid conflicts)
        "/api/explorer": {
          target: explorerApiUrl,
          changeOrigin: true,
          secure: false
          // No rewrite needed - path is passed through as-is
        },
        // Proxy other API calls to main store backend (excludes /api/explorer)
        "^/api/(?!explorer)": {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      port: 4175
    },
    build: {
      outDir: "dist"
    }
  };
});

