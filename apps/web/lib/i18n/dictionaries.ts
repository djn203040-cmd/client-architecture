import type { TLanguage } from "@client/shared/validators";
import { common } from "./messages/common";
import { nav } from "./messages/nav";
import { language } from "./messages/language";
import { dashboard } from "./messages/dashboard";
import { leads } from "./messages/leads";
import { drafts } from "./messages/drafts";
import { calls } from "./messages/calls";
import { settings } from "./messages/settings";
import { onboarding } from "./messages/onboarding";
import { modules } from "./messages/modules";
import { review } from "./messages/review";

export type Locale = TLanguage;

/**
 * The message catalog, composed from one module per surface under `messages/`.
 * `en` is the source of truth for the shape; each module's `defineMessages`
 * pins its `da` to the same shape, so Danish can never silently drift from the
 * English keys.
 *
 * Danish is written idiomatically, NOT word-for-word — read each string for
 * meaning and phrase it the way a Dane actually would. See `GLOSSARY.md`.
 *
 * Components read it via `useDictionary()` (client) or `getDictionary(locale)`
 * (server). Grow it surface by surface inside the `messages/` modules — never
 * inline strings here.
 */
const en = {
  common: common.en,
  nav: nav.en,
  language: language.en,
  dashboard: dashboard.en,
  leads: leads.en,
  drafts: drafts.en,
  calls: calls.en,
  settings: settings.en,
  onboarding: onboarding.en,
  modules: modules.en,
  review: review.en,
};

const da: Dictionary = {
  common: common.da,
  nav: nav.da,
  language: language.da,
  dashboard: dashboard.da,
  leads: leads.da,
  drafts: drafts.da,
  calls: calls.da,
  settings: settings.da,
  onboarding: onboarding.da,
  modules: modules.da,
  review: review.da,
};

export type Dictionary = typeof en;

export const dictionaries: Record<Locale, Dictionary> = { en, da };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
