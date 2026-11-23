import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "import.meta.vitest": false,
  },
  test: {
    includeSource: ["app/**/*.{js,ts,tsx}", "sources/**/*.{js,ts,tsx}","utils.tsx"],
    exclude: [
      ...configDefaults.exclude,
      "**/node_modules/**",
      "**/.git/**",
      "**/.next/**",
    ],
    reporters: [["minimal", { summary: false }]],
  },
});
