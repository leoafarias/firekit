import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {},
  },
  {
    // for JS files, disable type-checking rules
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // Override for test files
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      // Disable strict type safety rules that often cause issues in tests
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // Potentially relax 'any' usage in tests if needed, but let's keep it for now
      // "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // ignore patterns
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      ".git/**",
      "**/*.d.ts",
      "**/*.config.js",
      "jest.setup.js",
    ],
  }
);
