import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // MUI core (largest dependency)
          "vendor-mui": ["@mui/material", "@emotion/react", "@emotion/styled"],
          // MUI Icons (very large, used across many pages)
          "vendor-mui-icons": ["@mui/icons-material"],
          // Data fetching & utilities
          "vendor-utils": ["@tanstack/react-query", "axios", "luxon"],
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
