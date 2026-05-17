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
  // F9 — getPlannedSession (lib/plan/) is the only legal read path for
  // planned_sessions and typical_week_pattern (architecture A2). Block
  // direct table access from anywhere else.
  {
    files: [
      "src/**/*.ts",
      "src/**/*.tsx",
    ],
    // Exceptions to the A2 read-path rule:
    //   - lib/plan/ — getPlannedSession itself
    //   - /api/planned-session — the only mutation API
    //   - /settings/training-pattern — the post-onboarding edit surface
    //     (reads + writes athletes.typical_week_pattern by design)
    //   - /onboarding — the new-athlete form does the same upsert
    ignores: [
      "src/lib/plan/**",
      "src/app/api/planned-session/**",
      "src/app/settings/training-pattern/**",
      "src/app/onboarding/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='from'][arguments.0.value='planned_sessions']",
          message:
            "Read planned_sessions only via @/lib/plan/getPlannedSession (architecture A2). For mutations use /api/planned-session.",
        },
        {
          selector: "Literal[value='typical_week_pattern']",
          message:
            "Access typical_week_pattern only via @/lib/plan/getPlannedSession (architecture A2).",
        },
      ],
    },
  },
]);

export default eslintConfig;
