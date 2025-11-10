import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:3000";

  return {
    plugins: [svelte()],
    server: {
      port: 4175,
      proxy: {
        "/api": {
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

