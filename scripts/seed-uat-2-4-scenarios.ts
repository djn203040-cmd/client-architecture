// Seeds 5 demo leads for §2.4 Voice Model Quality walk — one per scenario.
// Idempotent: tagged via external_ids.uat_2_4 = scenario id, re-runs upsert.
//
// Usage: pnpm tsx scripts/seed-uat-2-4-scenarios.ts <coach_email>

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of [
  resolve(repoRoot, "apps/web/.env.local"),
  resolve(repoRoot, ".env.local"),
]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
  }
  break;
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: pnpm tsx scripts/seed-uat-2-4-scenarios.ts <coach_email>");
  process.exit(1);
}

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

type Scenario = {
  id: string;
  name: string;
  email: string;
  status:
    | "identified"
    | "no_show"
    | "call_completed"
    | "in_sequence"
    | "replied";
  coach_notes: string;
  ai_summary: string;
  transcript?: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "no_show",
    name: "Mette Sørensen",
    email: "uat-noshow@example.com",
    status: "no_show",
    coach_notes:
      "Booked a 30-min intro for Tuesday 3pm via Calendly. Didn't show up, didn't message. " +
      "She filled out the intake form thoughtfully — said she's been stuck in the same routine " +
      "for 18 months and wants to feel like herself again. No history of flakiness — first interaction.",
    ai_summary:
      "Mid-30s, works in marketing, signed up after the workshop. Pain point: stuck, low energy, " +
      "lost a sense of herself after maternity leave. Genuine interest signals but possibly overwhelmed.",
  },
  {
    id: "post_call",
    name: "Jonas Berg",
    email: "uat-postcall@example.com",
    status: "call_completed",
    coach_notes:
      "Had our discovery call this morning. Really strong fit — he's done two prior coaching " +
      "programs that didn't stick. He wants something more structured + accountable. Asked about " +
      "the 3-month vs 6-month option; I told him I'd send something tonight with both laid out.",
    ai_summary:
      "Engineer, 38, two failed prior coaching attempts, motivated but skeptical of fluffy approaches. " +
      "Currently overwhelmed at work + new baby. Wants structure, accountability, and a clear path.",
    transcript:
      `[Coach] So tell me what made you book this call.
[Jonas] Honestly, I've tried two programs before and neither stuck. I'd do well for three weeks, then life would hit and I'd drift. I think the issue was nobody was actually checking in.
[Coach] That's really common, and not a you-problem. Most programs are content-heavy and accountability-light. What does a good week look like for you right now?
[Jonas] Right now? Survival. Newborn, full-time job, gym maybe twice a week if I'm lucky. I want to feel like I'm building something, not just keeping the lights on.
[Coach] Got it. So we're not optimizing for peak performance, we're building a stable floor. What would feel like a win three months from now?
[Jonas] If I had a consistent morning routine, was lifting three times a week without it feeling like a battle, and had one creative project I was actually moving on. That's it.
[Coach] Achievable. Let me put together two options — a 3-month and a 6-month — and I'll send them over tonight so you can chew on them.
[Jonas] Perfect. I'll talk it over with my partner.`,
  },
  {
    id: "objection",
    name: "Camilla Holm",
    email: "uat-objection@example.com",
    status: "replied",
    coach_notes:
      "Had our discovery call last week. She replied to my proposal email today. Quote: " +
      "'It looks really good but honestly the price is a stretch for me right now. I'd love to do " +
      "it eventually — can we revisit in a few months when work calms down?'",
    ai_summary:
      "Early 40s, self-employed consultant, cash-flow conscious. Wants the program but framing " +
      "it as 'wrong time' rather than 'wrong fit.' Genuine interest, real price sensitivity.",
  },
  {
    id: "reactivation",
    name: "Anders Krogh",
    email: "uat-reactivation@example.com",
    status: "identified",
    coach_notes:
      "Reached out 4 months ago via the website form. We exchanged 2 emails — he said he was " +
      "interested but waiting until 'after the summer.' Then radio silence. It's been 4 months. " +
      "No idea where his head is now. Want to reopen without being weird about the gap.",
    ai_summary:
      "Early 50s, business owner, hinted at burnout and a desire to step back from operational " +
      "work. Polite, considered, slow communicator. Not a ghosting personality — life just took over.",
  },
  {
    id: "nudge",
    name: "Sophie Lindh",
    email: "uat-nudge@example.com",
    status: "in_sequence",
    coach_notes:
      "She inquired 5 days ago after seeing a friend's post. We had a great first exchange — she " +
      "asked smart questions about how I work with parents of young kids. I sent a follow-up 3 days " +
      "ago with availability for a call. No response yet. Not concerned, just want to land softly.",
    ai_summary:
      "Late 30s, mother of two under 5, considering coaching to rebuild routines and identity " +
      "post-kids. Engaged communicator when she's online, but online windows are tight.",
  },
];

async function main(): Promise<void> {
  const { data: coach, error: coachError } = await admin
    .from("coaches")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (coachError) throw coachError;
  if (!coach) {
    console.error(`No coach record for ${email}`);
    process.exit(1);
  }

  for (const s of SCENARIOS) {
    const { data: existing } = await admin
      .from("leads")
      .select("id")
      .eq("coach_id", coach.id)
      .eq("email", s.email)
      .maybeSingle();

    const payload = {
      coach_id: coach.id,
      name: s.name,
      email: s.email,
      status: s.status,
      coach_notes: s.coach_notes,
      ai_summary: s.ai_summary,
      ai_summary_protected: false,
      source: "manual" as const,
      external_ids: { uat_2_4: s.id },
      last_activity_at: new Date().toISOString(),
    };

    let leadId: string;
    if (existing) {
      const { error } = await admin
        .from("leads")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
      leadId = existing.id;
      console.log(`Updated lead: ${s.name} (${s.id}) → ${existing.id}`);
    } else {
      const { data: inserted, error } = await admin
        .from("leads")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      leadId = inserted.id;
      console.log(`Inserted lead: ${s.name} (${s.id}) → ${inserted.id}`);
    }

    if (s.transcript) {
      const { data: existingTranscript } = await admin
        .from("transcripts")
        .select("id")
        .eq("lead_id", leadId)
        .eq("provider", "manual")
        .maybeSingle();

      const transcriptPayload = {
        lead_id: leadId,
        coach_id: coach.id,
        provider: "manual",
        call_at: new Date().toISOString(),
        content: s.transcript,
        matched_by: "manual",
      };

      if (existingTranscript) {
        const { error } = await admin
          .from("transcripts")
          .update(transcriptPayload)
          .eq("id", existingTranscript.id);
        if (error) throw error;
        console.log(`  Updated transcript`);
      } else {
        const { error } = await admin
          .from("transcripts")
          .insert(transcriptPayload);
        if (error) throw error;
        console.log(`  Inserted transcript`);
      }
    }
  }

  console.log(`\nDone. Go to http://localhost:3000/leads and you'll see 5 UAT-2.4 leads.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
