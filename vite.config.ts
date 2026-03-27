import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Statiska izvietošana: pēc `npm run build` mape `dist/` — nekāda Node servera produkcijā.
// Cels `./` ļauj likt failus uz GitHub Pages, USB u.c., kur ceļš nav saknes `/`.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
