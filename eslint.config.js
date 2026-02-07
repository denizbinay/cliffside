import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        getComputedStyle: "readonly",
        HTMLElement: "readonly",
        Event: "readonly",
        URLSearchParams: "readonly",
        Set: "readonly",
        Map: "readonly",
        Infinity: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "no-duplicate-imports": "error"
    }
  },
  {
    ignores: ["dist/", "node_modules/", "scripts/"]
  }
];
