# Danish UI Glossary — The Client Architecture

The shared terminology for every Danish UI string in `apps/web/lib/i18n/messages/`.
Use these exact terms so the whole product speaks with one voice.

## Register (non-negotiable)

- **du-form**, everyday spoken Danish. Address the coach directly ("Du har…", "Gem dine…").
- **Idiomatic, never word-for-word.** Read the English for meaning, then phrase it the
  way a Dane actually would. If a literal translation sounds like a machine, rewrite it.
- **No anglicisms/calques** except the loanwords listed below that Danes genuinely use in
  business (lead, booking, e-mail…). Never "requeste", "submitte", "på track".
- Sentence case for buttons and labels (Danish does not title-case). "Gem ændringer", not
  "Gem Ændringer".
- Danish quotation, punctuation and spacing. Use `…` for ellipsis. "AI'en" (apostrophe +
  definite article) is fine and matches the onboarding copy already shipped.

## Core terms

| English | Danish | Notes |
|---|---|---|
| draft | **udkast** | et udkast, udkastet, flere udkast (no plural -er) |
| follow-up (noun) | **opfølgning** | opfølgningen, opfølgninger |
| to follow up | **at følge op** | |
| lead | **lead** | loanword kept. et lead, leadet, flere leads |
| call / sales call | **samtale / salgssamtale** | samtalen, samtaler |
| dashboard | **overblik** | matches nav. "dit overblik" |
| settings | **indstillinger** | |
| voice / voice model | **stemme / stemmemodel** | "din stemme", how the AI sounds like you |
| sequence | **forløb** | et forløb — the multi-step follow-up journey. NOT "sekvens" |
| touchpoint | **kontaktpunkt** | |
| re-engagement | **fornyet kontakt** | reaching out again after silence |
| reply (noun / verb) | **svar / at svare** | |
| approve | **godkend** | godkend udkastet |
| adjust / edit | **tilpas / redigér** | "godkend eller tilpas" |
| send | **send** | |
| on hold / HOLD | **på hold** | draft parked indefinitely |
| autonomous mode | **autonom tilstand** | |
| notification(s) | **notifikation(er)** | |
| integration(s) | **integration(er)** | |
| calendar | **kalender** | |
| booking | **booking** | loanword kept |
| transcript | **udskrift** | udskriften, udskrifter |
| onboarding / setup | **opsætning** / "kom godt i gang" | |
| lead profile | **lead-profil** | |
| name / email / phone | **navn / e-mail / telefon** | "e-mail" with hyphen |
| no-show | **udeblevet** | lead who didn't show |
| call completed | **gennemført samtale** | |
| module | **modul** | et modul, moduler |
| coach | **coach** | loanword kept |
| client | **klient** | the coach's paying client |
| unsubscribe | **afmeld** | |
| open rate | **åbningsrate** | |

## Common verbs / states

| English | Danish |
|---|---|
| Save | Gem |
| Saving… | Gemmer… |
| Cancel | Annullér |
| Continue | Fortsæt |
| Back | Tilbage |
| Loading… | Indlæser… |
| Try again | Prøv igen |
| Something went wrong. Try again. | Noget gik galt. Prøv igen. |
| Copy / Copied | Kopiér / Kopieret |
| Connected / Not connected | Forbundet / Ikke forbundet |
| Connect | Forbind |
| Disconnect | Afbryd |
| Required | Påkrævet |
| Optional | Valgfrit |

## Empty / error patterns

- Empty states: warm and specific, not "No data". e.g. "Ingen udkast endnu — de dukker op,
  når en samtale er registreret."
- Errors: plain, human, actionable. "Vi kunne ikke gemme. Prøv igen om lidt."
- Loading: "Indlæser…" or a specific "Henter dine leads…".

## Don't translate

- Backend/admin/logs stay English (out of scope).
- Proper nouns and brand names: Gmail, Calendly, Cal.com, Slack, WhatsApp, Anthropic, etc.
- The landing pages (deferred until landing design is chosen).
