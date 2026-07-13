import { test as base, expect } from "@playwright/test";
import { createCoach, type SeededCoach } from "./createCoach";
import { cleanupCoach } from "./cleanupCoach";

type Fixtures = {
  coach: SeededCoach;
  secondCoach: SeededCoach;
  danishCoach: SeededCoach;
};

export const test = base.extend<Fixtures>({
  coach: async ({}, use) => {
    const coach = await createCoach();
    await use(coach);
    await cleanupCoach(coach.id);
  },
  secondCoach: async ({}, use) => {
    const coach = await createCoach({ email: `b-${Date.now()}@sonorous.test` });
    await use(coach);
    await cleanupCoach(coach.id);
  },
  // Coach whose stored language is Danish — the whole UI + dates render in da.
  danishCoach: async ({}, use) => {
    const coach = await createCoach({ language: "da" });
    await use(coach);
    await cleanupCoach(coach.id);
  },
});

export { expect };
