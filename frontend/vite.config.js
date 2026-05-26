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
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Data fetching & utilities
          "vendor-utils": ["@tanstack/react-query", "axios", "luxon", "sonner"],
          // Calendar (only used in SchedulePage)
          "vendor-calendar": [
            "@fullcalendar/core",
            "@fullcalendar/daygrid",
            "@fullcalendar/interaction",
            "@fullcalendar/react",
            "@fullcalendar/resource-timeline",
          ],
        },
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
