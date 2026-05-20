import { test, expect } from "../fixtures";
import { createLead } from "../fixtures/createLead";
import { createDraft } from "../fixtures/createDraft";
import { admin } from "../fixtures/createCoach";

// RLS scopes all rows to coach_id via auth.uid().
// Any attempt to read another coach's row returns 404 (not 200 with empty body).

test("coach A cannot read coach B leads (GET returns 404)", async ({ coach, secondCoach, page }) => {
  const bLead = await createLead(secondCoach.id);
  await page.context().addCookies(coach.cookies);

  const res = await page.request.get(`/api/leads/${bLead.id}`);
  // RLS hides the row; route translates maybeSingle null → 404
  expect(res.status()).toBe(404);
});

test("coach A cannot PATCH coach B drafts (returns 4xx)", async ({ coach, secondCoach, page }) => {
  const bLead = await createLead(secondCoach.id);
  const bDraft = await createDraft(secondCoach.id, bLead.id);
  await page.context().addCookies(coach.cookies);

  // drafts/[id] PATCH uses adminClient to fetch then checks coach_id ownership
  const res = await page.request.patch(`/api/drafts/${bDraft.id}`, {
    data: { body: "Hacked" },
  });
  expect([403, 404]).toContain(res.status());
});

test("coach A settings PATCH cannot update coach B (scoped to auth.uid)", async ({ coach, secondCoach, page }) => {
  await page.context().addCookies(coach.cookies);

  // The settings route reads coach_id from auth.uid() — ignores any body coach_id
  const res = await page.request.patch(`/api/settings/profile`, {
    data: { display_name: "Hacked", coach_id: secondCoach.id },
  });
  // Route accepts the update but scopes it to coach A via auth.uid()
  expect([200, 400]).toContain(res.status());

  // Verify coach B name is unchanged
  const { data: bRow } = await admin
    .from("coaches")
    .select("name")
    .eq("id", secondCoach.id)
    .single();
  expect(bRow?.name).not.toBe("Hacked");
});
