import { defineMessages } from "./util";

/** External approve-via-link page (/review/[token]) the coach opens from a
 * notification. Token-based, no auth session or I18nProvider — the locale is
 * derived from the owning coach's `language` column and strings are read via
 * `getDictionary(locale)` on the server. */
export const review = defineMessages({
  en: {
    /** Small brand label above the heading. Proper noun — not translated. */
    brand: "Sonorous",
    /** Fallback used when the coach's name isn't available. */
    coachFallback: "your coach",
    header: {
      title: "Review draft",
      /** e.g. "From Camilla's queue" — coachName is already possessive-joined
       * by the caller, so this just wraps it. */
      fromQueue: (coachName: string) => `From ${coachName}'s queue`,
    },
    footer: {
      expiryNote: "This link expires after 7 days or once you take action.",
    },
    cta: {
      openDashboard: "Open dashboard",
    },
    expired: {
      heading: "This review link has expired.",
      body: "Open your dashboard for the latest drafts.",
    },
    alreadyActioned: {
      heading: "This draft has been actioned.",
      body: "The action was already taken. Visit your dashboard to see updated status.",
    },
    invalid: {
      heading: "This link isn't valid.",
      body: "It may have been copied incorrectly. Open your dashboard for the latest drafts.",
    },
  },
  da: {
    brand: "Sonorous",
    coachFallback: "din coach",
    header: {
      title: "Gennemgå udkast",
      fromQueue: (coachName: string) => `Fra ${coachName}s kø`,
    },
    footer: {
      expiryNote: "Linket udløber efter 7 dage, eller når du har handlet på det.",
    },
    cta: {
      openDashboard: "Åbn dit overblik",
    },
    expired: {
      heading: "Linket til gennemgang er udløbet.",
      body: "Åbn dit overblik for at se de nyeste udkast.",
    },
    alreadyActioned: {
      heading: "Der er allerede handlet på dette udkast.",
      body: "Handlingen er allerede foretaget. Gå til dit overblik for at se den opdaterede status.",
    },
    invalid: {
      heading: "Linket er ikke gyldigt.",
      body: "Det kan være kopieret forkert. Åbn dit overblik for at se de nyeste udkast.",
    },
  },
});
