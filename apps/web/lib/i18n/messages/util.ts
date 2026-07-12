/**
 * Every surface's messages live in their own module under `messages/` and are
 * composed into the full dictionary by `../dictionaries.ts`. Each module exports
 * `{ en, da }` through `defineMessages`, which pins `da` to the exact shape of
 * `en` at the type level — so a missing or misspelled Danish key is a compile
 * error, not a silent English fallback.
 *
 * Danish is written idiomatically (everyday, spoken, du-form), NOT word-for-word
 * from the English. Read each string for meaning and phrase it the way a Dane
 * actually would. See `../GLOSSARY.md` for the shared terminology.
 */
export function defineMessages<const T>(messages: { en: T; da: T }): {
  en: T;
  da: T;
} {
  return messages;
}
