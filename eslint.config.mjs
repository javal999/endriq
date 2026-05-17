import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Non-source paths that live in this repo root but are not the app:
    ".stryker-tmp/**",
    ".cursor/**",
    "Prototypes/**",
    "Tools/**",
    "Assets/**",
    "Deliverables/**",
    "Knowledge/**",
    "Tasks/**",
    "projects/**",
    "skills/**",
    "scripts/**",
    "e2e/**",
    "test-results/**",
    "supabase/migrations/**",
  ]),
]);

export default eslintConfig;
