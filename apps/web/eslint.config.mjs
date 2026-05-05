import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { "allow": ["warn", "error"] }],
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.object.name='console'][callee.property.name=/^(log|info|debug)$/]",
          "message": "console.log/info/debug forbidden — sensitive data leaks (COMPLY-009). Use a structured logger or remove."
        }
      ]
    }
  }
];

export default eslintConfig;
