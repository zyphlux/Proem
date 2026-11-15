import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// Dev: run `ADMIN_DEV=1 pnpm admin` and `pnpm admin:dev`, open http://localhost:5173.
export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "../../src") } },
  build: { outDir: path.resolve(import.meta.dirname, "dist"), emptyOutDir: true },
  server: { proxy: { "/api": { target: "http://127.0.0.1:4310", changeOrigin: true } } },
});
