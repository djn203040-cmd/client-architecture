import type { TLanguage } from "@client/shared/validators";

export type Locale = TLanguage;

/**
 * The message catalog. `en` is the source of truth for the shape; `da` must
 * mirror its keys exactly (enforced by the `Dictionary` type below). Danish is
 * written idiomatically, NOT word-for-word from the English, read each string
 * for meaning and phrase it the way a Dane actually would.
 *
 * This is intentionally namespaced by surface (common, nav, ...). Stage 2 grows
 * it surface by surface (settings, drafts, leads, ...); components read it via
 * `useDictionary()` (client) or `getDictionary(locale)` (server).
 */
const en = {
  common: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    continue: "Continue",
    back: "Back",
    edit: "Edit",
    delete: "Delete",
    loading: "Loading…",
    retry: "Try again",
    somethingWentWrong: "Something went wrong. Try again.",
  },
  nav: {
    dashboard: "Dashboard",
    leads: "Leads",
    drafts: "Drafts",
    calls: "Calls",
    settings: "Settings",
    signOut: "Sign out",
  },
  language: {
    label: "Language",
    danish: "Danish",
    english: "English",
    settingHint: "This sets your whole dashboard and the language the AI writes your drafts in.",
  },
};

/** Danish mirrors the English shape exactly. Phrased as everyday, spoken Danish. */
const da: Dictionary = {
  common: {
    save: "Gem",
    saving: "Gemmer…",
    cancel: "Annullér",
    continue: "Fortsæt",
    back: "Tilbage",
    edit: "Redigér",
    delete: "Slet",
    loading: "Indlæser…",
    retry: "Prøv igen",
    somethingWentWrong: "Noget gik galt. Prøv igen.",
  },
  nav: {
    dashboard: "Overblik",
    leads: "Leads",
    drafts: "Udkast",
    calls: "Samtaler",
    settings: "Indstillinger",
    signOut: "Log ud",
  },
  language: {
    label: "Sprog",
    danish: "Dansk",
    english: "Engelsk",
    settingHint: "Det styrer hele dit dashboard og det sprog, AI'en skriver dine udkast på.",
  },
};

export type Dictionary = typeof en;

export const dictionaries: Record<Locale, Dictionary> = { en, da };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
