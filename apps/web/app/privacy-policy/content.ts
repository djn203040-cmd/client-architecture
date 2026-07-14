export const LAST_UPDATED = "2026-07-14";

export type TPolicyBlock =
  | { kind: "p"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type TPolicySection = {
  id: string;
  title: string;
  blocks: TPolicyBlock[];
};

export const POLICY_SECTIONS: TPolicySection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    blocks: [
      {
        kind: "p",
        text: "The Client Architecture is a managed software-delivered service for coaching businesses, operated by Daniel (Sonorous Digital). Coaches are our direct customers; leads belong to coaches, not to us. This policy explains what we collect, why, and how you can control it — in plain language. If anything is unclear, email privacy@theclientarchitecture.com.",
      },
    ],
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    blocks: [
      { kind: "subheading", text: "From coaches (you)" },
      {
        kind: "list",
        items: [
          "Account profile — name, email, business name, photo",
          "OAuth tokens for Gmail, Slack, calendar providers, and transcript providers — held encrypted in a secrets vault, never in plain database columns",
          "Voice corpus — a structured profile (tone adjectives, formality, opener phrases) plus 10–15 real message examples you supply. The examples are encrypted at rest.",
          "Notification preferences",
          "Activity timestamps (last login, most recent draft approval)",
        ],
      },
      { kind: "subheading", text: "From your leads (people who contact you)" },
      {
        kind: "list",
        items: [
          "Contact details — name, email, phone — supplied by you, by the calendar provider, or via your inbox monitoring",
          "Call transcripts — when you connect Fireflies, Zoom, or paste one in manually. Transcript content is encrypted at rest with AES-256-GCM.",
          "Sequence state — which messages we've drafted and which you sent",
          "Engagement signals — opens, clicks, replies, bounces",
          "An automatic 90-day purge applies to leads marked do-not-contact",
        ],
      },
      { kind: "subheading", text: "Operational data" },
      {
        kind: "list",
        items: [
          "Server logs — request paths, response codes, latency. Personal data is scrubbed before any log leaves our servers.",
          "Error reports — collected via Sentry, with automatic scrubbing of emails, phone numbers, and lead identifiers before anything is sent",
        ],
      },
    ],
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    blocks: [
      {
        kind: "list",
        items: [
          "To draft and send follow-up messages on your behalf, in your voice",
          "To detect replies, bounces, and unsubscribes",
          "To notify you when a draft is ready or a sequence pauses",
          "To detect abuse and protect the system (rate limits, audit log)",
        ],
      },
      {
        kind: "p",
        text: "We never train AI models on your data. Anthropic, our LLM provider, is bound by enterprise terms that prohibit training on inputs.",
      },
    ],
  },
  {
    id: "google-api-services",
    title: "Google API Services & Limited Use",
    blocks: [
      {
        kind: "p",
        text: "The Client Architecture's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
      },
      {
        kind: "list",
        items: [
          "We access Gmail only to send follow-up emails you have approved (or authorized to send automatically) and to detect replies, bounces, and unsubscribes from your leads.",
          "We do not use Gmail data for advertising, and we never sell it.",
          "We do not use Gmail data to train AI or machine-learning models. Only the minimum context needed to draft a specific message is passed to our AI provider under the no-training terms above.",
          "Humans do not read your Gmail data except with your explicit permission for support, where required for security purposes, or to comply with applicable law.",
          "Disconnecting Gmail in Settings revokes our access; you can also revoke it at any time from your Google account's security settings.",
        ],
      },
    ],
  },
  {
    id: "sub-processors",
    title: "Sub-processors",
    blocks: [
      {
        kind: "table",
        headers: ["Sub-processor", "Purpose", "Data shared"],
        rows: [
          ["Vercel", "Hosting", "All request data"],
          ["Supabase", "Database + auth + vault", "Account + lead data (access-scoped per coach; secrets in Vault)"],
          ["Anthropic", "AI drafts", "Lead first name + transcript snippets relevant to the message being drafted. No emails, no phone numbers in prompts."],
          ["Gmail (Google)", "Outbound email + inbound monitoring", "Your messages and your leads' replies"],
          ["Twilio", "WhatsApp + SMS notifications", "Your phone number; lead's phone for delivery"],
          ["Slack", "Coach notifications", "Draft body when you opt in"],
          ["Resend", "Transactional email (review links, alerts)", "Your email + draft preview"],
          ["Inngest", "Workflow orchestration", "Workflow state (no message bodies)"],
          ["Upstash", "Rate-limit counters", "IP / coach ID hashes"],
          ["Calendar providers (Calendly, Cal.com, Acuity, Setmore, Square, MS Bookings, TidyCal)", "Booking webhooks", "Booking metadata; you control the connection"],
          ["Transcript providers (Fireflies, Zoom)", "Call transcripts", "Per coach + per call; you control the connection"],
          ["Sentry", "Error monitoring", "Scrubbed exception data only"],
        ],
      },
    ],
  },
  {
    id: "retention",
    title: "Retention",
    blocks: [
      {
        kind: "list",
        items: [
          "Coach account data — kept while your subscription is active. Deletion via Settings → Danger Zone → \"Delete account\" cascades through every coach-scoped table within 60 seconds.",
          "Lead data — kept while the lead is active. Marking a lead do-not-contact triggers a 90-day purge.",
          "Audit log — kept 24 months, then archived to cold storage. Cannot be deleted by the coach (it records administrative actions for accountability).",
          "Logs — hosting: 30 days. Error monitoring: 90 days. Both scrubbed of personal data.",
        ],
      },
    ],
  },
  {
    id: "gdpr-rights",
    title: "Your GDPR rights",
    blocks: [
      {
        kind: "p",
        text: "If you (or one of your leads) are an EU/UK resident, you have the right to:",
      },
      {
        kind: "list",
        items: [
          "Access — export a complete archive of your data from Settings",
          "Rectification — edit any field in your dashboard",
          "Erasure — delete your account from Settings → Danger Zone",
          "Portability — the export is machine-readable JSON",
          "Restriction / objection — email privacy@theclientarchitecture.com",
        ],
      },
      { kind: "p", text: "We respond to requests within 30 days." },
    ],
  },
  {
    id: "dpa",
    title: "Data Processing Addendum (DPA)",
    blocks: [
      {
        kind: "p",
        text: "We're happy to sign a DPA with any coach who needs one for B2B clients. Email privacy@theclientarchitecture.com and we'll send the template and countersign.",
      },
    ],
  },
  {
    id: "international-transfers",
    title: "International transfers",
    blocks: [
      {
        kind: "p",
        text: "Servers are in the EU (database in eu-central-1; hosting on a global edge network). Sub-processors located outside the EU operate under Standard Contractual Clauses.",
      },
    ],
  },
  {
    id: "children",
    title: "Children",
    blocks: [
      {
        kind: "p",
        text: "The Client Architecture is for adult professionals. We don't knowingly collect data about anyone under 16.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes",
    blocks: [
      {
        kind: "p",
        text: "Substantive changes to this policy will be announced in-app and via email at least 14 days before they take effect.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    blocks: [
      {
        kind: "p",
        text: "privacy@theclientarchitecture.com — Daniel (operator)",
      },
    ],
  },
];
