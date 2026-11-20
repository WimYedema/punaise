import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/out/**", "**/node_modules/**", "**/.vscode-test/**", "test-fixtures/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["packages/core/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "vscode", message: "packages/core must not depend on vscode." }] }],
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } },
  },
);
