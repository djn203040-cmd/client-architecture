import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Next 16's eslint-config-next ships native flat configs, so we import them
// directly. The old FlatCompat("next/core-web-vitals", "next/typescript") bridge
// crashed under ESLint 9.16 + @eslint/eslintrc 3.3.5 ("Converting circular
// structure to JSON" — eslint-plugin-react closes the circle), which silently
// took the no-console CI gate offline. Spreading the flat arrays needs no bridge.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name=/^(log|info|debug)$/]",
          message:
            "console.log/info/debug forbidden — sensitive data leaks (COMPLY-009). Use a structured logger or remove.",
        },
      ],
      // react-hooks v7 (bundled by the Next 16 flat config above) adds the
      // React Compiler readiness rules below as errors. They're advisory — not
      // security — and the P1–P6 UI predates them, so we surface them as
      // warnings rather than block CI on a risky bulk refactor of shipped code.
      // TODO(react-compiler): clean these up and promote back to "error".
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    // Playwright fixtures destructure a `use` callback; the rules-of-hooks rule
    // misreads it as React's `use` hook. These are node/test files, not React.
    files: ["tests/**"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
