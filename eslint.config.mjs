import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * next/typescript enables @typescript-eslint/no-unused-vars with
 * argsIgnorePattern "^_" already in next's shareable config. We keep it
 * that way explicitly so params prefixed with `_` (reserved intentionally,
 * e.g. for future RTL handling in email templates) don't fail builds —
 * deploys (Railway/Netlify) run `next build` which lints by default.
 */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Don't fail production deploys for cosmetic lint issues.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
