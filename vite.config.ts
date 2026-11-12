import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import cssScoping from "./vite-addons/css-scoping";

export default defineConfig({
  plugins: [cssScoping(), react()],
});
