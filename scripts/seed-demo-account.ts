// Seeds a complete, fully-loaded DEMO coach account for product walkthroughs.
//
// Creates (idempotent — safe to re-run, wipes and rebuilds its own leads only):
//   - auth user + coaches row for demo@sonorous.digital (password printed at end)
//   - complete coach profile: voice model, sales toolkit, booking URL, signature,
//     onboarding marked complete (lands straight on the dashboard)
//   - 8 leads covering every stage: identified, call_booked, no_show,
//     call_completed, in_sequence, replied, converted, lost
//   - encrypted call transcripts, active/paused/completed sequences, sent +
//     pending drafts (queue has content), email open/reply events, full
//     activity timelines, call outcomes
//
// Usage: apps/web/node_modules/.bin/tsx scripts/seed-demo-account.ts [password]
//   If no password is given, a random one is generated and printed.
//
// NOTE: writes to whatever Supabase project .env.local points at (currently prod).

import { createClient } from "@supabase/supabase-js";
import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- env ----------
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of [resolve(repoRoot, "apps/web/.env.local"), resolve(repoRoot, ".env.local")]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
  break;
}

const admin = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  { auth: { persistSession: false } },
);

// ---------- transcript encryption (mirrors apps/web/lib/crypto/transcript-cipher.ts,
// which imports "server-only" and can't be loaded from a standalone script) ----------
function encryptTranscript(plaintext: string): string {
  const raw = process.env["TRANSCRIPT_ENCRYPTION_KEY"];
  if (!raw) throw new Error("TRANSCRIPT_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TRANSCRIPT_ENCRYPTION_KEY must decode to 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "enc:v1:" + [iv, tag, ct].map((b) => b.toString("base64")).join(":");
}

// ---------- constants ----------
const DEMO_EMAIL = "demo@sonorous.digital";
const COACH_NAME = "Maja Lindberg";
const PASSWORD = process.argv[2] ?? randomBytes(12).toString("base64url") + "!Aa2";

const now = Date.now();
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const iso = (offsetMs: number): string => new Date(now + offsetMs).toISOString();

// ---------- coach profile ----------
const VOICE_MODEL = {
  tone_adjectives: ["warm", "direct", "grounded", "encouraging", "curious"],
  formality_level: "conversational",
  sentence_length: "varied",
  emoji_usage: "rare",
  opener_phrases: [
    "It was really good to talk with you",
    "I've been thinking about what you said",
    "Thanks for making the time",
  ],
  closer_phrases: ["Warmly, Maja", "Talk soon, Maja", "Rooting for you, Maja"],
  never_say_list: ["circle back", "just checking in", "touch base", "no worries if not!", "synergy"],
  selected_examples: [
    "It was really good to talk with you this morning. What stayed with me was what you said about feeling like you're performing your own life instead of living it. That's not a small thing to say out loud, and I don't want to let it drift.",
    "I've been thinking about what you said about Sunday evenings — that knot in your stomach before the week even starts. That's usually not about the job itself. It's about the gap between what you're doing and what you actually want. Worth a conversation?",
    "You don't need more discipline. You've white-knuckled your way through the last two years — that's plenty of discipline. What you need is a structure that doesn't rely on willpower. That's what we'd build.",
    "Honest answer? Three months won't transform your whole life. But it will get you moving, and movement changes what feels possible. Most of my clients say the biggest shift happened in the first six weeks.",
    "I hear you on the price. I'd rather you wait and start properly than stretch yourself thin and resent it. If the timing genuinely isn't right, tell me and I'll leave it alone. But if it's fear dressed up as timing — that's exactly the pattern we'd be working on.",
    "No pitch in this one. I just remembered you were presenting to the board this week and wanted to say: you've got this. The work you did on owning the room wasn't theoretical.",
    "Missed you on Tuesday — no drama, life happens. My Thursday afternoon is open if you want to grab a new slot. And if the honest answer is that the timing was wrong to book at all, that's a completely fine answer too.",
    "What would it look like if you trusted yourself on this one? Not the version of you that weighs every option for three weeks — the version that already knows. She shows up more often than you give her credit for.",
    "Quick thought after our call: you kept saying 'when things calm down.' In eleven years of doing this I've never once seen things calm down on their own. We calm them down. That's the work.",
    "I'm glad you said yes. Before our first session, one small thing: write down what you want to be true in six months. Don't polish it. First draft honesty is the whole point.",
  ],
  usage_rules: [
    {
      rule: "Name the emotional subtext directly, then immediately ground it in something concrete the lead said.",
      source: "corpus",
      added_at: iso(-30 * DAY),
    },
    {
      rule: "One clear question or invitation per email — never stack two asks.",
      source: "corpus",
      added_at: iso(-30 * DAY),
    },
  ],
};

const SALES_TOOLKIT = {
  sales_style: "guide",
  approach_override: "",
  philosophy:
    "I never talk anyone into coaching. My job is to help people get honest about what staying stuck is costing them — the decision makes itself after that.",
  packages: [
    {
      name: "3-Month Clarity Container",
      price: "12.000 kr.",
      format: "12 weeks, weekly 60-min calls + WhatsApp access between sessions",
      includes: "Kickoff deep-dive, weekly sessions, mid-point review, personal operating manual",
      ideal_for: "Professionals who feel stuck or are circling a big decision they keep postponing",
    },
    {
      name: "6-Month Deep Work",
      price: "22.000 kr.",
      format: "24 weeks, weekly calls + two half-day intensives",
      includes: "Everything in the 3-month container plus two in-person intensives and a 90-day integration plan",
      ideal_for: "Leaders navigating a career transition or rebuilding after burnout",
    },
  ],
  bridges: [
    { name: "3-payment split", when_to_offer: "Price is the stated objection but the interest is clearly real" },
    { name: "Start date pushed 4 weeks", when_to_offer: "Genuine timing crunch (new job, move, newborn) — lock commitment now, start later" },
  ],
  downsells: [
    { name: "4-Week Reset", when_to_offer: "Budget genuinely won't stretch, or the lead needs proof of concept before committing to 3 months" },
  ],
  leverage_points:
    "Discovery call always covers: what staying stuck costs them, the decision they keep postponing, what they've already tried, and what six months from now looks like if nothing changes. Reference these back verbatim.",
};

const SERVICE_INFO = {
  offer: "1:1 clarity and leadership coaching for professionals in transition",
  outcomes: "Clear decisions, sustainable routines, confidence in the next career move",
  pricing: "3-month container 12.000 kr. / 6-month deep work 22.000 kr.",
};

const ONBOARDING_PROGRESS = {
  language_selected_at: iso(-45 * DAY),
  gmail_connected_at: iso(-45 * DAY),
  booking_url_added_at: iso(-45 * DAY),
  calendar_connected_at: iso(-45 * DAY),
  sales_toolkit_added_at: iso(-44 * DAY),
  voice_model_completed_at: iso(-44 * DAY),
  first_lead_completed_at: iso(-44 * DAY),
  notifications_picked_at: iso(-44 * DAY),
};

// ---------- transcripts ----------
const TRANSCRIPT_JONAS = `[Maja] So tell me what made you book this call.
[Jonas] Honestly, I've tried two coaching programs before and neither stuck. I'd do well for three weeks, then life would hit and I'd drift. Nobody was actually checking in.
[Maja] That's really common, and it's not a you-problem. Most programs are content-heavy and accountability-light. What does a good week look like for you right now?
[Jonas] Right now? Survival. Newborn at home, full-time job, gym maybe twice a week if I'm lucky. I want to feel like I'm building something, not just keeping the lights on.
[Maja] So we're not optimizing for peak performance — we're building a stable floor. What would feel like a win three months from now?
[Jonas] A consistent morning routine, lifting three times a week without it feeling like a battle, and one creative project actually moving. That's it.
[Maja] That's achievable, and honestly it's the right size of ambition for this season of your life. Let me put together two options — the 3-month and the 6-month — and send them tonight.
[Jonas] Perfect. I'll talk it over with my partner.`;

const TRANSCRIPT_SOPHIE = `[Maja] You mentioned in your message that a friend's post is what got you here. What was it about that post?
[Sophie] She wrote about finally feeling like herself again after having kids. And I just sat there thinking — I don't remember what that feels like. I have two under five. I love them. And I've completely disappeared.
[Maja] Say more about "disappeared."
[Sophie] Everything I do is for someone else. My calendar is other people's needs. When I get an hour to myself I don't even know what to do with it anymore.
[Maja] That's one of the most honest descriptions of it I've heard. Here's what I want you to notice: you booked this call. That's the first calendar entry in a long time that was only for you.
[Sophie] I hadn't thought of it that way. It felt selfish, honestly.
[Maja] That feeling is exactly where we'd start. Not fixing your schedule — renegotiating your relationship with taking up space. The routines follow from that, not the other way around.
[Sophie] Okay. That actually scares me a bit, which probably means it's right.`;

const TRANSCRIPT_CAMILLA = `[Maja] Last time we spoke you said the consultancy runs you, not the other way around. Is that still true?
[Camilla] Worse if anything. I took on two new clients I shouldn't have. I know exactly what I'm doing wrong while I'm doing it — that's the maddening part.
[Maja] Knowing-while-doing is actually a late stage of the pattern. Most people don't see it until afterwards. What would need to be true for you to say no to the next wrong-fit client?
[Camilla] I'd need to trust that better ones are coming. Saying no feels like burning money.
[Maja] So the real work isn't time management, it's the scarcity underneath it. That's what the container is for — twelve weeks of practicing decisions from a different premise, with someone holding you to it.
[Camilla] That lands. Send me the details and pricing? I want to look at it properly, not between meetings.`;

const TRANSCRIPT_ANDERS = `[Maja] You said something in your email that stuck with me — "I built a company and lost a life." Where does that land today?
[Anders] Still true. Twenty-two years building the firm. My youngest just left for university and I realized I don't actually know what I like doing. The business doesn't need me daily anymore, and that terrifies me more than any market crash ever did.
[Maja] Because the busyness was load-bearing.
[Anders] [laughs] That's one way to put it. Yes. If I'm not needed, who am I?
[Maja] That question is the work. Not answering it quickly — sitting with it properly, probably for the first time in twenty years. I'll be direct: this is 6-month work, not 3-month work. The first month you'll mostly resist slowing down.
[Anders] My wife said almost exactly the same thing. Alright. Where do we sign?`;

// ---------- seed data ----------
type LeadSeed = {
  key: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  source: string;
  created: number; // ms offset
  last_activity: number;
  coach_notes: string;
  ai_summary: string;
  transcript?: { content: string; call_at: number; duration: number };
  sequence?: { track: string; status: string; current_touchpoint: number; created: number };
  callOutcome?: { ext: string; scheduled: number; ends: number; status: string; outcome?: string; decided?: number };
  drafts: Array<{
    subject: string;
    body: string;
    status: string;
    touchpoint: number;
    total?: number;
    scheduled?: number;
    approved?: number;
    sent?: number;
    onSequence?: boolean;
  }>;
  emailEvents: Array<{ type: string; at: number; draftIdx?: number; open_source?: string }>;
  events: Array<{ type: string; at: number; by: string; payload?: Record<string, unknown> }>;
};

const LEADS: LeadSeed[] = [
  {
    key: "identified",
    name: "Freja Dahl",
    email: "freja.dahl@example.com",
    status: "identified",
    source: "manual",
    created: -1 * DAY,
    last_activity: -1 * DAY,
    coach_notes:
      "Wrote through the website form yesterday evening. Works in HR, says she's 'good at helping everyone else grow and completely stalled herself.' Asked whether coaching is 'worth it for someone who already knows the theory.' Haven't replied yet — want to open with that question, it's a good one.",
    ai_summary:
      "Mid-30s HR professional. Self-aware, articulate, slightly skeptical — frames coaching as something she should be able to do herself. Pain point: stalled growth while facilitating everyone else's. High fit for the 3-month container if the first exchange takes her skepticism seriously instead of brushing past it.",
    drafts: [],
    emailEvents: [],
    events: [{ type: "note_added", at: -1 * DAY + 2 * HOUR, by: "coach" }],
  },
  {
    key: "call_booked",
    name: "Emil Vestergaard",
    email: "emil.vestergaard@example.com",
    phone: "+45 31 12 84 90",
    status: "call_booked",
    source: "cal_com",
    created: -3 * DAY,
    last_activity: -3 * DAY,
    coach_notes:
      "Booked a discovery call for Thursday 14:00 through the site. Runs a small design studio, 6 people. Intake form: 'I'm the bottleneck in my own company and I know it.' Short answers but every one of them lands somewhere real.",
    ai_summary:
      "Early 40s, founder of a 6-person design studio. Named the problem himself — he is the bottleneck. Likely topics: delegation, identity tied to being needed, fear of the studio outgrowing him. Strong signal: booked within 10 minutes of first visiting the site.",
    callOutcome: { ext: "demo-evt-emil-discovery", scheduled: 2 * DAY, ends: 2 * DAY + HOUR, status: "scheduled" },
    drafts: [],
    emailEvents: [],
    events: [
      { type: "call_booked", at: -3 * DAY, by: "cal_com" },
      { type: "note_added", at: -3 * DAY + HOUR, by: "coach" },
    ],
  },
  {
    key: "no_show",
    name: "Mette Sørensen",
    email: "mette.sorensen@example.com",
    status: "no_show",
    source: "calendly",
    created: -6 * DAY,
    last_activity: -HOUR * 5,
    coach_notes:
      "Booked a 30-min intro for Tuesday 15:00, didn't show, didn't message. Her intake form was thoughtful — stuck in the same routine for 18 months, wants to feel like herself again after maternity leave. First interaction, no history of flaking. My guess: overwhelmed, not uninterested.",
    ai_summary:
      "Mid-30s, works in marketing, signed up after a workshop. Pain point: stuck, low energy, lost sense of self after maternity leave. Genuine interest signals but likely overwhelmed — the no-show fits the pattern she described rather than contradicting it. Re-engagement should be zero-pressure.",
    sequence: { track: "no_show", status: "active", current_touchpoint: 1, created: -4 * DAY },
    callOutcome: {
      ext: "demo-evt-mette-intro",
      scheduled: -4 * DAY - 2 * HOUR,
      ends: -4 * DAY - 90 * 60_000,
      status: "resolved",
      outcome: "no_show",
      decided: -4 * DAY,
    },
    drafts: [
      {
        subject: "Missed you Tuesday — zero drama",
        body: "Hi Mette,\n\nMissed you on Tuesday — no drama at all, life happens, especially the season of life you described in your form.\n\nWhat you wrote stayed with me: eighteen months in the same loop, wanting to feel like yourself again. That's exactly the kind of thing a first conversation is for.\n\nMy Thursday afternoon is open if you'd like a new slot. And if the honest answer is that booking felt right in the moment but the timing is wrong — that's a completely fine answer too. Just say so and I'll leave it with you.\n\nWarmly,\nMaja",
        status: "sent",
        touchpoint: 1,
        total: 3,
        scheduled: -3 * DAY,
        approved: -3 * DAY - 2 * HOUR,
        sent: -3 * DAY,
        onSequence: true,
      },
      {
        subject: "The 18-month loop",
        body: "Hi Mette,\n\nOne more thought and then I'll be quiet.\n\nYou wrote that you've been in the same routine for eighteen months. In my experience the loop doesn't break on its own at month nineteen — something has to interrupt it, and it's almost never willpower. Usually it's a conversation.\n\nIf you want that conversation, my calendar link is below. If not, I genuinely wish you well — and the door stays open.\n\nWarmly,\nMaja",
        status: "pending",
        touchpoint: 2,
        total: 3,
        scheduled: 22 * HOUR,
        onSequence: true,
      },
    ],
    emailEvents: [
      { type: "sent", at: -3 * DAY, draftIdx: 0 },
      { type: "opened", at: -3 * DAY + 4 * HOUR, draftIdx: 0, open_source: "direct" },
      { type: "opened", at: -5 * HOUR, draftIdx: 0, open_source: "direct" },
    ],
    events: [
      { type: "call_booked", at: -6 * DAY, by: "calendly" },
      { type: "no_show", at: -4 * DAY, by: "calendly" },
      { type: "sequence_started", at: -4 * DAY, by: "system" },
      { type: "email_sent", at: -3 * DAY, by: "system" },
      { type: "email_opened", at: -3 * DAY + 4 * HOUR, by: "system" },
      { type: "email_opened", at: -5 * HOUR, by: "system" },
    ],
  },
  {
    key: "call_completed",
    name: "Jonas Berg",
    email: "jonas.berg@example.com",
    phone: "+45 26 44 71 03",
    status: "call_completed",
    source: "cal_com",
    created: -5 * DAY,
    last_activity: -6 * HOUR,
    coach_notes:
      "Discovery call this morning — really strong fit. Two prior programs that didn't stick, wants structure + real accountability. Newborn at home, job is heavy. Asked about 3 vs 6 months; I promised him both options in writing tonight. Keep the proposal small and concrete — he's allergic to fluff.",
    ai_summary:
      "Engineer, 38. Two failed coaching attempts — both content-heavy, accountability-light. Motivated but skeptical of anything vague. Current season: newborn + demanding job, so the right frame is 'stable floor, not peak performance.' Wants: morning routine, 3x training, one creative project moving. Decision involves his partner — proposal must be forwardable.",
    transcript: { content: TRANSCRIPT_JONAS, call_at: -6 * HOUR, duration: 1860 },
    callOutcome: {
      ext: "demo-evt-jonas-discovery",
      scheduled: -7 * HOUR,
      ends: -6 * HOUR,
      status: "resolved",
      outcome: "completed",
      decided: -5 * HOUR,
    },
    drafts: [
      {
        subject: "The two options, as promised",
        body: "Hi Jonas,\n\nIt was really good to talk with you this morning. What stayed with me: you don't need another program, you need a stable floor — and someone who actually checks in when week four hits.\n\nAs promised, both options in plain terms:\n\n**3-Month Clarity Container — 12.000 kr.**\nWeekly 60-min calls + WhatsApp between sessions. We build the morning routine, the 3x training rhythm, and get the creative project moving. Right-sized for the season you're in.\n\n**6-Month Deep Work — 22.000 kr.**\nSame weekly rhythm plus two half-day intensives. Makes sense if you want the habits *and* the deeper layer — why the drift happens at week three in the first place.\n\nMy honest read: start with 3 months. If the floor holds, we'll both know whether to keep going.\n\nTake it to your partner, and bring every question to me straight.\n\nWarmly,\nMaja",
        status: "pending",
        touchpoint: 1,
        scheduled: 18 * HOUR,
      },
    ],
    emailEvents: [],
    events: [
      { type: "call_booked", at: -5 * DAY, by: "cal_com" },
      { type: "call_completed", at: -6 * HOUR, by: "coach" },
      { type: "note_added", at: -5 * HOUR, by: "coach" },
    ],
  },
  {
    key: "in_sequence",
    name: "Sophie Lindh",
    email: "sophie.lindh@example.com",
    status: "in_sequence",
    source: "calendly",
    created: -8 * DAY,
    last_activity: -2 * DAY,
    coach_notes:
      "Discovery call three days ago — one of those calls where the real thing surfaces in the first ten minutes ('I've completely disappeared'). She said the idea of investing in herself 'felt selfish and probably right.' Sequence running; keep every touchpoint soft, her windows are tight with two kids under five.",
    ai_summary:
      "Late 30s, mother of two under 5, marketing background. Core theme: lost identity in caretaking — 'my calendar is other people's needs.' Booked the call as her first self-directed act in months; treat that as the thread. Objection to expect: guilt framed as budget/time. Engaged when online, but online windows are short — keep emails scannable with one ask.",
    transcript: { content: TRANSCRIPT_SOPHIE, call_at: -3 * DAY, duration: 2100 },
    sequence: { track: "call_completed", status: "active", current_touchpoint: 1, created: -3 * DAY },
    drafts: [
      {
        subject: "That calendar entry that was only for you",
        body: "Hi Sophie,\n\nThanks for making the time on Tuesday — I know exactly how much orchestration one free hour costs you.\n\nOne thing from our call I want to hand back to you: you booked that conversation for *yourself*. First entry in the calendar in a long time that wasn't for someone else. You called it selfish. I'd call it the first rep of the exact muscle we'd be training.\n\nI've attached how the 3-Month Clarity Container works. Read it when the house is asleep — no rush from my side.\n\nWarmly,\nMaja",
        status: "sent",
        touchpoint: 1,
        total: 3,
        scheduled: -2 * DAY,
        approved: -2 * DAY - 3 * HOUR,
        sent: -2 * DAY,
        onSequence: true,
      },
      {
        subject: "What an hour for yourself would actually look like",
        body: "Hi Sophie,\n\nI've been thinking about what you said — that when you finally get an hour to yourself, you don't know what to do with it anymore.\n\nThat's not a scheduling problem. That's what happens when someone spends years being the infrastructure of other people's lives. The want-muscle atrophies. It comes back — but it comes back through practice, not through waiting for a calmer month.\n\nIf you're ready to practice, my Thursday and Friday mornings are open for a shorter follow-up call. One question, one step. That's all a start needs to be.\n\nRooting for you,\nMaja",
        status: "pending",
        touchpoint: 2,
        total: 3,
        scheduled: 26 * HOUR,
        onSequence: true,
      },
    ],
    emailEvents: [
      { type: "sent", at: -2 * DAY, draftIdx: 0 },
      { type: "opened", at: -2 * DAY + 6 * HOUR, draftIdx: 0, open_source: "direct" },
    ],
    events: [
      { type: "call_booked", at: -8 * DAY, by: "calendly" },
      { type: "call_completed", at: -3 * DAY, by: "coach" },
      { type: "sequence_started", at: -3 * DAY, by: "system" },
      { type: "email_sent", at: -2 * DAY, by: "system" },
      { type: "email_opened", at: -2 * DAY + 6 * HOUR, by: "system" },
    ],
  },
  {
    key: "replied",
    name: "Camilla Holm",
    email: "camilla.holm@example.com",
    phone: "+45 60 18 29 55",
    status: "replied",
    source: "manual",
    created: -12 * DAY,
    last_activity: -3 * HOUR,
    coach_notes:
      "Replied to the proposal this morning: 'It looks really good but honestly the price is a stretch right now. I'd love to do it eventually — can we revisit in a few months when work calms down?' Classic — and she literally told me on the call that 'when things calm down' is her pattern. The reply draft should name that gently, offer the 3-payment split, and make either answer safe.",
    ai_summary:
      "Early 40s, self-employed consultant, cash-flow conscious. Wants the program — frames it as 'wrong time,' not 'wrong fit.' Key context from the call: she names her own pattern (taking wrong-fit clients, waiting for calm) while doing it. The price objection is partly real, partly the scarcity pattern itself. Bridge available: 3-payment split. Never pressure — she responds to being taken seriously.",
    transcript: { content: TRANSCRIPT_CAMILLA, call_at: -9 * DAY, duration: 1740 },
    sequence: { track: "call_completed", status: "paused", current_touchpoint: 1, created: -8 * DAY },
    drafts: [
      {
        subject: "The container, properly laid out",
        body: "Hi Camilla,\n\nThanks for a genuinely sharp conversation last week. As promised, here's the 3-Month Clarity Container in full — structure, rhythm, and pricing — so you can look at it properly, not between meetings.\n\nTwelve weeks, weekly calls, WhatsApp between sessions. The work: practicing decisions from a different premise than scarcity, with someone holding you to it.\n\nRead it in peace, and bring me your real questions — including the uncomfortable ones about money and time. Those are usually the important ones.\n\nWarmly,\nMaja",
        status: "sent",
        touchpoint: 1,
        total: 3,
        scheduled: -8 * DAY,
        approved: -8 * DAY - HOUR,
        sent: -8 * DAY,
        onSequence: true,
      },
      {
        subject: "Re: The container, properly laid out",
        body: "Hi Camilla,\n\nThank you for the straight answer — I'd always rather have that than silence.\n\nCan I reflect one thing back, gently? On our call you told me your pattern is waiting for things to calm down — and that in eleven years they never have on their own. I'm not saying that to corner you. I'm saying it because you said it first, and it seemed important.\n\nIf the constraint is genuinely cash flow, there's a middle path: the same container, split over three payments of 4.000 kr. If the honest answer is that this isn't the season, tell me that too — I'll close the file with zero hard feelings and the door stays open.\n\nWhich is it, truthfully?\n\nWarmly,\nMaja",
        status: "pending",
        touchpoint: 2,
        total: 3,
        scheduled: 8 * HOUR,
        onSequence: true,
      },
    ],
    emailEvents: [
      { type: "sent", at: -8 * DAY, draftIdx: 0 },
      { type: "opened", at: -8 * DAY + 2 * HOUR, draftIdx: 0, open_source: "direct" },
      { type: "opened", at: -4 * DAY, draftIdx: 0, open_source: "proxy" },
      { type: "received", at: -3 * HOUR, draftIdx: 0 },
    ],
    events: [
      { type: "call_completed", at: -9 * DAY, by: "coach" },
      { type: "sequence_started", at: -8 * DAY, by: "system" },
      { type: "email_sent", at: -8 * DAY, by: "system" },
      { type: "email_opened", at: -8 * DAY + 2 * HOUR, by: "system" },
      { type: "replied", at: -3 * HOUR, by: "system" },
      { type: "sequence_paused", at: -3 * HOUR, by: "system" },
    ],
  },
  {
    key: "converted",
    name: "Anders Krogh",
    email: "anders.krogh@example.com",
    phone: "+45 20 90 33 17",
    status: "converted",
    source: "referral",
    created: -24 * DAY,
    last_activity: -2 * DAY,
    coach_notes:
      "SIGNED — 6-Month Deep Work, starts the 1st. Referred by Thomas. The line that did it came from him, not me: 'I built a company and lost a life.' His wife had apparently been saying the same thing for a year. Prep note for kickoff: he'll try to turn the sessions into board meetings — don't let him.",
    ai_summary:
      "Early 50s, founder (22 years), youngest child just left home. Presenting issue: identity fully fused with being needed by the business. Fast decision-maker once emotionally honest — went from first call to signed in two weeks. Watch for: intellectualizing feelings, treating coaching as another project to manage. Committed to 6-Month Deep Work.",
    transcript: { content: TRANSCRIPT_ANDERS, call_at: -16 * DAY, duration: 2520 },
    sequence: { track: "call_completed", status: "completed", current_touchpoint: 2, created: -15 * DAY },
    callOutcome: {
      ext: "demo-evt-anders-discovery",
      scheduled: -16 * DAY - HOUR,
      ends: -16 * DAY,
      status: "resolved",
      outcome: "converted",
      decided: -2 * DAY,
    },
    drafts: [
      {
        subject: "The question that is the work",
        body: "Hi Anders,\n\nThanks for making the time — and for the honesty. 'If I'm not needed, who am I?' is not a question most founders let themselves ask out loud. That you did tells me you're ready for this.\n\nAs discussed, I'm recommending the 6-Month Deep Work — details and structure attached. I meant what I said: the first month you'll mostly resist slowing down, and that resistance is part of the material, not a detour from it.\n\nTalk it over with your wife. Sounds like she's been ahead of both of us on this one.\n\nWarmly,\nMaja",
        status: "sent",
        touchpoint: 1,
        total: 3,
        scheduled: -15 * DAY,
        approved: -15 * DAY - 2 * HOUR,
        sent: -15 * DAY,
        onSequence: true,
      },
      {
        subject: "Before we begin",
        body: "Hi Anders,\n\nI'm glad you said yes. Welcome to the work.\n\nBefore our kickoff on the 1st, one small assignment: write down what you want to be true in six months. Not for the company — for you. Don't polish it. First-draft honesty is the whole point.\n\nRooting for you,\nMaja",
        status: "sent",
        touchpoint: 2,
        total: 3,
        scheduled: -2 * DAY,
        approved: -2 * DAY - HOUR,
        sent: -2 * DAY,
        onSequence: true,
      },
    ],
    emailEvents: [
      { type: "sent", at: -15 * DAY, draftIdx: 0 },
      { type: "opened", at: -15 * DAY + HOUR, draftIdx: 0, open_source: "direct" },
      { type: "received", at: -3 * DAY, draftIdx: 0 },
      { type: "sent", at: -2 * DAY, draftIdx: 1 },
      { type: "opened", at: -2 * DAY + 30 * 60_000, draftIdx: 1, open_source: "direct" },
    ],
    events: [
      { type: "call_booked", at: -20 * DAY, by: "coach" },
      { type: "call_completed", at: -16 * DAY, by: "coach" },
      { type: "sequence_started", at: -15 * DAY, by: "system" },
      { type: "email_sent", at: -15 * DAY, by: "system" },
      { type: "email_opened", at: -15 * DAY + HOUR, by: "system" },
      { type: "replied", at: -3 * DAY, by: "system" },
      { type: "call_converted", at: -2 * DAY, by: "coach" },
      { type: "state_changed", at: -2 * DAY, by: "coach", payload: { from: "replied", to: "converted" } },
      { type: "sequence_completed", at: -2 * DAY, by: "system" },
      { type: "email_sent", at: -2 * DAY, by: "system" },
    ],
  },
  {
    key: "lost",
    name: "Line Østergaard",
    email: "line.ostergaard@example.com",
    status: "lost",
    source: "setmore",
    created: -30 * DAY,
    last_activity: -10 * DAY,
    coach_notes:
      "Closed after a kind, clear no: she chose a group program through her workplace instead. Completely fair — budget was the real constraint from day one. Left it warm; she asked if she could come back 'when it's my own money.' Absolutely a future lead, just not this quarter.",
    ai_summary:
      "Late 20s, project coordinator. Engaged genuinely through two emails, opened everything, then chose an employer-funded group program — a budget decision, not a fit decision. Declined warmly and asked to keep the door open. Good candidate for a light re-engagement in 4–6 months.",
    sequence: { track: "call_completed", status: "cancelled", current_touchpoint: 1, created: -20 * DAY },
    drafts: [
      {
        subject: "What we talked about, in writing",
        body: "Hi Line,\n\nThanks for a lovely conversation — your questions were sharper than you gave yourself credit for (that's a pattern worth noticing, by the way).\n\nHere's the 3-Month Clarity Container laid out as promised, including the 4-Week Reset as a lighter starting point if the full container is too big a first step.\n\nWhatever you decide, deciding *something* is the win here. Even a no is movement.\n\nWarmly,\nMaja",
        status: "sent",
        touchpoint: 1,
        total: 3,
        scheduled: -19 * DAY,
        approved: -19 * DAY - HOUR,
        sent: -19 * DAY,
        onSequence: true,
      },
    ],
    emailEvents: [
      { type: "sent", at: -19 * DAY, draftIdx: 0 },
      { type: "opened", at: -19 * DAY + 3 * HOUR, draftIdx: 0, open_source: "direct" },
      { type: "received", at: -10 * DAY, draftIdx: 0 },
    ],
    events: [
      { type: "call_completed", at: -21 * DAY, by: "coach" },
      { type: "sequence_started", at: -20 * DAY, by: "system" },
      { type: "email_sent", at: -19 * DAY, by: "system" },
      { type: "email_opened", at: -19 * DAY + 3 * HOUR, by: "system" },
      { type: "replied", at: -10 * DAY, by: "system" },
      { type: "sequence_cancelled", at: -10 * DAY, by: "coach" },
      { type: "state_changed", at: -10 * DAY, by: "coach", payload: { from: "replied", to: "lost" } },
      { type: "note_added", at: -10 * DAY, by: "coach" },
    ],
  },
];

// ---------- main ----------
async function main(): Promise<void> {
  // 1) auth user
  let userId: string;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: "coach", name: COACH_NAME },
  });
  if (created?.user) {
    userId = created.user.id;
    console.log(`Created auth user ${DEMO_EMAIL} → ${userId}`);
  } else if (createErr) {
    // Already exists — find it and reset the password so the printed one works.
    let found: string | null = null;
    for (let page = 1; page <= 10 && !found; page++) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) throw listErr;
      found = list.users.find((u) => u.email === DEMO_EMAIL)?.id ?? null;
      if (list.users.length < 200) break;
    }
    if (!found) throw new Error(`createUser failed (${createErr.message}) and user not found by email`);
    userId = found;
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
    if (updErr) throw updErr;
    console.log(`Reusing auth user ${DEMO_EMAIL} → ${userId} (password reset)`);
  } else {
    throw new Error("createUser returned neither user nor error");
  }

  // 2) coaches row (upsert)
  const coachRow = {
    id: userId,
    name: COACH_NAME,
    display_name: "Maja",
    email: DEMO_EMAIL,
    role: "coach",
    role_title: "Clarity & Leadership Coach",
    language: "en",
    timezone: "Europe/Copenhagen",
    autonomous_mode: "off",
    public_booking_url: "https://cal.com/maja-lindberg/clarity-call",
    email_signature: "Warmly,\nMaja Lindberg\nLindberg Coaching",
    voice_model: VOICE_MODEL,
    service_info: SERVICE_INFO,
    sales_toolkit: SALES_TOOLKIT,
    notification_settings: { dashboard_only_acknowledged: true },
    onboarding_progress: ONBOARDING_PROGRESS,
    onboarding_completed_at: ONBOARDING_PROGRESS.notifications_picked_at,
  };
  const { error: coachErr } = await admin.from("coaches").upsert(coachRow, { onConflict: "id" });
  if (coachErr) throw coachErr;
  console.log("Coach profile upserted (voice model, sales toolkit, onboarding complete)");

  // 3) wipe this coach's existing leads (cascades transcripts/sequences/drafts/events)
  const { error: wipeErr } = await admin.from("leads").delete().eq("coach_id", userId);
  if (wipeErr) throw wipeErr;

  // 4) leads + children
  for (const s of LEADS) {
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .insert({
        coach_id: userId,
        name: s.name,
        email: s.email,
        phone: s.phone ?? null,
        source: s.source,
        status: s.status,
        coach_notes: s.coach_notes,
        ai_summary: s.ai_summary,
        ai_summary_protected: false,
        external_ids: { demo_account: "true", key: s.key },
        last_activity_at: iso(s.last_activity),
        created_at: iso(s.created),
      })
      .select("id")
      .single();
    if (leadErr || !lead) throw leadErr ?? new Error("lead insert returned nothing");
    const leadId = lead.id as string;

    if (s.transcript) {
      const { error } = await admin.from("transcripts").insert({
        coach_id: userId,
        lead_id: leadId,
        provider: "manual",
        call_at: iso(s.transcript.call_at),
        duration_seconds: s.transcript.duration,
        content: encryptTranscript(s.transcript.content),
        matched_by: "manual",
        external_id: `demo-${s.key}`,
      });
      if (error) throw error;
    }

    let sequenceId: string | null = null;
    if (s.sequence) {
      const { data: seq, error } = await admin
        .from("sequences")
        .insert({
          coach_id: userId,
          lead_id: leadId,
          module: 1,
          track: s.sequence.track,
          status: s.sequence.status,
          current_touchpoint: s.sequence.current_touchpoint,
          created_at: iso(s.sequence.created),
        })
        .select("id")
        .single();
      if (error || !seq) throw error ?? new Error("sequence insert returned nothing");
      sequenceId = seq.id as string;
    }

    const draftIds: string[] = [];
    for (const d of s.drafts) {
      const { data: draft, error } = await admin
        .from("drafts")
        .insert({
          coach_id: userId,
          lead_id: leadId,
          sequence_id: d.onSequence ? sequenceId : null,
          subject: d.subject,
          body: d.body,
          touchpoint_index: d.touchpoint,
          total_touchpoints: d.total ?? null,
          status: d.status,
          scheduled_send_at: d.scheduled != null ? iso(d.scheduled) : null,
          approved_at: d.approved != null ? iso(d.approved) : null,
          sent_at: d.sent != null ? iso(d.sent) : null,
          confidence_level: "high",
          generation_context: { demo_account: true },
          created_at: iso((d.scheduled ?? 0) - DAY),
        })
        .select("id")
        .single();
      if (error || !draft) throw error ?? new Error("draft insert returned nothing");
      draftIds.push(draft.id as string);
    }

    if (s.emailEvents.length > 0) {
      const { error } = await admin.from("email_events").insert(
        s.emailEvents.map((e) => ({
          coach_id: userId,
          lead_id: leadId,
          draft_id: e.draftIdx != null ? draftIds[e.draftIdx] : null,
          event_type: e.type,
          open_source: e.open_source ?? null,
          created_at: iso(e.at),
        })),
      );
      if (error) throw error;
    }

    if (s.events.length > 0) {
      const { error } = await admin.from("lead_events").insert(
        s.events.map((e) => ({
          coach_id: userId,
          lead_id: leadId,
          event_type: e.type,
          triggered_by: e.by,
          payload: e.payload ?? {},
          created_at: iso(e.at),
        })),
      );
      if (error) throw error;
    }

    if (s.callOutcome) {
      const { error } = await admin.from("call_outcomes").insert({
        coach_id: userId,
        lead_id: leadId,
        provider: "cal_com",
        external_event_id: s.callOutcome.ext,
        scheduled_at: iso(s.callOutcome.scheduled),
        ends_at: iso(s.callOutcome.ends),
        status: s.callOutcome.status,
        outcome: s.callOutcome.outcome ?? null,
        decided_at: s.callOutcome.decided != null ? iso(s.callOutcome.decided) : null,
        decided_via: s.callOutcome.decided != null ? "dashboard" : null,
      });
      if (error) throw error;
    }

    console.log(`Lead seeded: ${s.name} (${s.status})`);
  }

  console.log("\n=== DEMO ACCOUNT READY ===");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log("  Save the password — it is not stored anywhere else.");
  console.log("  Re-running this script resets the password (or pass one as arg 1).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
