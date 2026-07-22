module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { es2022: true, browser: true, node: true },
  ignorePatterns: ["dist", "node_modules", "*.config.*"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
  },
  overrides: [
    {
      // Client-only rules: hook correctness and Vite fast-refresh hygiene.
      files: ["apps/client/**/*.{ts,tsx}"],
      plugins: ["react-hooks", "react-refresh"],
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      },
    },
  ],
};
