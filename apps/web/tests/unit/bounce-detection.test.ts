import { describe, it } from "vitest";
// Will import from: apps/web/lib/gmail/bounce-detector.ts
// Testing: COMPLY-005, COMPLY-007

describe("bounce detection", () => {
  it.todo("identifies MAILER-DAEMON in From header as bounce");
  it.todo("identifies postmaster@ in From header as bounce");
  it.todo("does not flag normal message as bounce");
  it.todo("extracts bounced email address from subject line");
});
