import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || "./",
  worker: { format: "es" },
  build: { target: "es2022" },
  server: { host: "0.0.0.0", port: 5173 },
});
