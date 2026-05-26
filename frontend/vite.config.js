import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      "prosimex.pitundev.io.vn",
      "dev.prosimex.pitundev.io.vn",
      "localhost",
      "127.0.0.1",
    ],
  },
});
