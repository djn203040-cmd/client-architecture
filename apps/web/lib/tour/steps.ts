import { TOUR_ANCHOR, type TourAnchor } from "./anchors";

export type TourPlacement = "center" | "top" | "bottom" | "left" | "right" | "auto";

export interface TourStep {
  /** Stable id, used for analytics / debugging, never shown. */
  id: string;
  /** Route this step lives on. The engine navigates here first if needed.
   *  `:leadId` is replaced with the seeded demo lead's id at runtime. */
  route?: string;
  /** `data-tour` anchor to spotlight. Omit for a centered modal step. */
  target?: TourAnchor;
  title: string;
  /** Body copy. Kept plain-text; the overlay renders it as a paragraph. */
  body: string;
  placement?: TourPlacement;
  /** When true, the step advances only once the user clicks the spotlighted
   *  element (the "now click Drafts" moments). A Next button is still offered. */
  clickToAdvance?: boolean;
  /** Requires the seeded demo lead, skipped if seeding failed. */
  needsDemoLead?: boolean;
}

/**
 * The full guided walkthrough. Order matters, the engine walks it start→finish.
 * Nav steps (clickToAdvance) highlight a single sidebar item and ask the coach to
 * click it; the following steps then showcase that page's real elements. The
 * lead/draft steps run against a real seeded demo lead ("Alex Rivera") so
 * "make a draft / approve a draft / lead description" are hands-on, not narrated.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    title: "Welcome to The Client Architecture",
    body: "This is where every lead from your sales calls turns into perfectly-timed, in-your-voice follow-up. Take two minutes and I'll show you how the pieces fit together.",
    placement: "center",
  },
  {
    id: "sidebar",
    route: "/dashboard",
    target: TOUR_ANCHOR.sidebar,
    title: "Everything lives in the sidebar",
    body: "Dashboard is your daily overview. Leads is your pipeline. Drafts is your approval queue. Calls is where you log how each booked call went. Click any item to jump there.",
    placement: "right",
  },
  {
    id: "dashboard-cards",
    route: "/dashboard",
    target: TOUR_ANCHOR.dashCards,
    title: "Your day, at a glance",
    body: "The dashboard surfaces what needs you first, how many leads are in flight and how many drafts are waiting for a yes. Nothing important slips while you're heads-down with clients.",
    placement: "bottom",
  },
  {
    id: "goto-leads",
    route: "/dashboard",
    target: TOUR_ANCHOR.navLeads,
    title: "Let's look at a lead",
    body: "Click Leads in the sidebar to open your pipeline.",
    placement: "right",
    clickToAdvance: true,
  },
  {
    id: "leads-table",
    route: "/leads",
    target: TOUR_ANCHOR.leadsTable,
    title: "Every lead lands here",
    body: "Leads flow in automatically from your calendar and calls. Each row shows their stage at a glance. I've added a demo lead, Alex Rivera, so you can see a full profile. Let's open it.",
    placement: "top",
  },
  {
    id: "lead-description",
    route: "/leads/:leadId",
    target: TOUR_ANCHOR.leadDescription,
    title: "The AI keeps a living description",
    body: "This description is written and re-written automatically, from the call transcript, every email reply, and each new signal. You never update it by hand; it's always current when you open the lead.",
    placement: "right",
    needsDemoLead: true,
  },
  {
    id: "generate-draft",
    route: "/leads/:leadId",
    target: TOUR_ANCHOR.generateDraft,
    title: "Need a message now? Make a draft",
    body: "Most follow-ups are generated for you on a schedule, but any time you want one, hit Generate draft and the AI writes it in your voice from everything it knows about this lead.",
    placement: "left",
    needsDemoLead: true,
  },
  {
    id: "lead-draft",
    route: "/leads/:leadId",
    target: TOUR_ANCHOR.leadDrafts,
    title: "Review, tweak, and approve",
    body: "Here's a draft the AI already wrote for Alex, in your voice. Read it, edit inline if you'd like, then Approve to send, or Hold to park it. Tip: press A to approve, H to hold. Try approving this one.",
    placement: "top",
    needsDemoLead: true,
  },
  {
    id: "sequence",
    route: "/leads/:leadId",
    target: TOUR_ANCHOR.sequencePanel,
    title: "The follow-up runs on rails",
    body: "Every lead is enrolled in a sequence, a timed series of touchpoints. This panel shows which message is next and when it sends, so nothing is ever forgotten. You can pause, restart, or override the stage here.",
    placement: "left",
    needsDemoLead: true,
  },
  {
    id: "lead-tabs",
    route: "/leads/:leadId",
    target: TOUR_ANCHOR.leadTabs,
    title: "The full picture, in one place",
    body: "Their entire email conversation lives here, synced live through Gmail, so replies land automatically and feed the next draft. Alongside it: a complete activity timeline, and a private Notes tab only you ever see.",
    placement: "top",
    needsDemoLead: true,
  },
  {
    id: "goto-drafts",
    route: "/leads/:leadId",
    target: TOUR_ANCHOR.navDrafts,
    title: "Your approval queue",
    body: "Scheduled follow-ups collect in one place. Click Drafts in the sidebar.",
    placement: "right",
    clickToAdvance: true,
  },
  {
    id: "drafts-queue",
    route: "/drafts",
    target: TOUR_ANCHOR.draftsQueue,
    title: "One queue, one keystroke each",
    body: "Every scheduled message across all your leads surfaces here 24 hours before it sends, like Alex's next touchpoint. Fly through them with A to approve, S to skip, H to hold, or edit any draft first. (If you already approved Alex's, it's on its way.)",
    placement: "top",
  },
  {
    id: "goto-calls",
    route: "/drafts",
    target: TOUR_ANCHOR.navCalls,
    title: "After the call",
    body: "Click Calls in the sidebar, this is the one bit of upkeep the system asks of you.",
    placement: "right",
    clickToAdvance: true,
  },
  {
    id: "calls",
    route: "/calls",
    target: TOUR_ANCHOR.callsHeader,
    title: "Log each call in one tap",
    body: "After every booked call, tell the system how it went, converted, no-show, or not yet. That single tap decides whether the lead keeps getting nurtured or graduates to a client.",
    placement: "bottom",
  },
  {
    id: "goto-settings",
    route: "/calls",
    target: TOUR_ANCHOR.navSettings,
    title: "Make it sound like you",
    body: "Last stop. Click Settings in the sidebar.",
    placement: "right",
    clickToAdvance: true,
  },
  {
    id: "settings",
    route: "/settings",
    target: TOUR_ANCHOR.settingsNav,
    title: "Your voice, your rules",
    body: "You set most of this up during onboarding, but everything stays changeable. Let me point out where each piece lives, for the day you want to adjust something.",
    placement: "right",
  },
  {
    id: "settings-notifications",
    route: "/settings",
    target: TOUR_ANCHOR.settingsNotifications,
    title: "Choose where we ping you",
    body: "When a draft is ready or a lead replies, you get a heads-up. Decide here which alerts reach you and where, email, Slack, or WhatsApp, so the system finds you where you actually look.",
    placement: "top",
  },
  {
    id: "settings-autonomous",
    route: "/settings",
    target: TOUR_ANCHOR.settingsAutonomous,
    title: "Decide how much runs on its own",
    body: "The trust dial. Approve every draft yourself, let unreviewed drafts send themselves after their 24-hour window, or go fully hands-off. You picked a mode during onboarding, and this is where you change your mind as trust grows.",
    placement: "top",
  },
  {
    id: "settings-voice",
    route: "/settings",
    target: TOUR_ANCHOR.settingsVoice,
    title: "Your voice profile lives here",
    body: "Everything the AI writes is shaped by this: your tone, your go-to phrases, and real examples of how you write. It was built during onboarding, but it isn't locked, if your style evolves or something reads off, adjust it here.",
    placement: "top",
  },
  {
    id: "voice-refine",
    route: "/settings",
    target: TOUR_ANCHOR.settingsVoiceRefine,
    title: "It learns when a draft sounds off",
    body: "The AI writes in your voice, and it keeps getting closer. If a draft ever sounds slightly not-you, paste it here with a quick note on what's wrong. It turns that into a rule every future draft follows, so it sounds more like you the more you use it.",
    placement: "top",
  },
  {
    id: "settings-sales",
    route: "/settings",
    target: TOUR_ANCHOR.settingsSales,
    title: "How you sell, on record",
    body: "Your sales approach, your programs and pricing, and how you bridge objections. When a lead hesitates, the AI draws on all of this to respond the way you would. Keep it current whenever your offers change.",
    placement: "top",
  },
  {
    id: "settings-calendar",
    route: "/settings",
    target: TOUR_ANCHOR.settingsCalendar,
    title: "Where new leads come from",
    body: "Your booking calendar feeds leads in automatically the moment a call is booked. If you ever switch booking tools, or a connection needs a nudge, this is where you fix it.",
    placement: "top",
  },
  {
    id: "settings-integrations",
    route: "/settings",
    target: TOUR_ANCHOR.settingsIntegrations,
    title: "One glance at the plumbing",
    body: "Gmail sends every follow-up as you and pulls replies back in. This panel shows the health of each connection, and if anything ever shows as disconnected, one click here brings it back.",
    placement: "top",
  },
  {
    id: "feedback",
    route: "/settings",
    target: TOUR_ANCHOR.feedbackButton,
    title: "This megaphone shapes the product",
    body: "One last thing, and it matters. This button follows you on every page. Something confusing, broken, or brilliant? Open it, write a line or two, hit send. It lands directly with us, along with the page you were on. It's the fastest way to make this fit you better, so use it freely.",
    placement: "left",
  },
  {
    id: "done",
    route: "/settings",
    title: "That's the whole tour",
    body: "You've seen the loop: leads arrive, the AI drafts in your voice, you approve, and calls get logged. You can replay this tour any time from the sidebar. Now go turn conversations into clients.",
    placement: "center",
  },
];
