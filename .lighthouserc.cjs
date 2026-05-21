// 06-PLAN.md §1.5 — Lighthouse CI gates. Assertions warn-only initially; promote
// to error after one week of green baseline (per plan's rollback strategy).

module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/onboarding",
        "http://localhost:3000/modules/threshold",
        "http://localhost:3000/modules/continuation",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        skipAudits: ["uses-http2"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
