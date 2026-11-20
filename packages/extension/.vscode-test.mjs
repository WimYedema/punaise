import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/**/*.test.js",
  workspaceFolder: "../../test-fixtures/symbols",
  mocha: { ui: "tdd", timeout: 20000 },
});
