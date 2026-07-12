import type { TLanguage } from '@client/shared/validators';

export type { TLanguage } from '@client/shared/validators';

export function languageName(language: TLanguage): string {
  return language === 'da' ? 'Danish' : 'English';
}

/**
 * The explicit LANGUAGE directive injected into the draft system prompt.
 *
 * Language is now an explicit, coach-selected setting, NOT inferred from the
 * voice examples. The examples still define tone/voice, but a coach who picked
 * Danish gets Danish drafts even if some of their examples happen to be English.
 * The register we ask for is deliberately everyday, spoken language, because
 * these drafts are real messages a coach sends to a real person, never marketing
 * copy or textbook prose.
 */
export function buildLanguageDirective(language: TLanguage): string {
  if (language === 'da') {
    return `- LANGUAGE: Skriv HELE beskeden, både emnelinje og brødtekst, på dansk. Dette er ufravigeligt og vejer tungere end sproget i <voice_examples> (eksemplerne definerer tone og stemme, ikke sprog, nogle kan være på engelsk, men du skriver stadig på dansk). Skriv det hverdagsdanske, talte sprog som en rigtig coach ville sende i en sms eller mail til en klient, ikke stift, kancelli-agtigt eller "skriftligt" dansk, og aldrig en maskinoversættelse. Konkret:
  - Tiltal læseren med "du" (aldrig "De"/"Dem").
  - Brug de ord, den rytme og de sammentrækninger danskere faktisk siger ("Hej", "Vi ses", "Lige et hurtigt spørgsmål", "Sig endelig til"). Læs betydningen af det, du vil sige, og udtryk det, som en dansker ville sige det, oversæt ALDRIG en engelsk sætning ord for ord.
  - Ingen anglicismer eller oversættelseslån. Tag aldrig et engelsk ord eller udtryk og bøj det som dansk: skriv fx IKKE "missede dig", "keen på", "reache ud", "booke et kald", "det makes sense". En dansker skriver "savnede dig"/"vi fik ikke snakket", "frisk på", "række ud"/"skrive", "finde en tid", "det giver god mening". Er du i tvivl om, hvorvidt en vending er ægte dansk, så vælg den mest almindelige hverdagsformulering en dansker ville bruge.
  - Korrekt dansk på modersmålsniveau hele vejen: grammatik, stavning, bøjning, ordstilling og tegnsætning. Ingen løse engelske ord (eneste undtagelse er en URL, som står præcis som den er).`;
  }
  return `- LANGUAGE: Write the ENTIRE message, both subject and body, in English. This overrides the language of the <voice_examples> (they define tone and voice, not language). Write natural, everyday English the way a real coach would text or email a client, not stiff, formal, or corporate. Correct native-level grammar, spelling, inflection, and punctuation throughout, with no stray words from another language (the only exception is a URL, which stays exactly as written).`;
}

/**
 * Language-specific naturalness guidance for the review (proofread) pass. The
 * reviewer knows the exact target language rather than inferring it from the
 * examples, so it can enforce the same everyday register the draft prompt asks
 * for and catch anglicisms the first pass let through.
 */
export function buildReviewLanguageChecks(language: TLanguage): string {
  if (language === 'da') {
    return `1. SPROG: Beskeden SKAL være skrevet udelukkende på dansk. Er der sneget sig blot ét ord ind fra et andet sprog (fx et engelsk ord som "guessing", "lmk" eller "btw" i en ellers dansk besked), så erstat det med det naturlige danske. Eneste undtagelse er en URL, som står uændret.
2. GRAMMATIK & STAVNING: Ret enhver fejl i grammatik, bøjning, stavning og tegnsætning, så det læses som skrevet af en indfødt dansker. Brug "du", ikke "De".
3. NATURLIGHED: Fjern anglicismer og ord-for-ord-oversættelser. En vending, der er grammatisk korrekt, men som en dansker aldrig ville sige, skal skrives om, som en dansker faktisk siger det. Vær særligt streng med engelske ord, der er bøjet som danske: fx er "missede dig"/"missede hinanden" forkert (kopierer engelsk "missed"), en dansker skriver "savnede dig", "vi fik ikke snakket", "du nåede ikke at dukke op" eller "du kom aldrig". Sproget skal lyde som talt hverdagsdansk, ikke som en oversættelse.`;
  }
  return `1. LANGUAGE PURITY: The draft must be written entirely in English. If even a single word slipped in from another language, replace it with the natural English equivalent. The ONLY exception is the URL, which stays exactly as written.
2. GRAMMAR & SPELLING: Fix every grammatical error, wrong inflection, misspelling, and punctuation mistake so it reads as written by an educated native speaker.
3. NATURALNESS: Remove calques and literal word-for-word translations. A phrase that is grammatically valid but that a native speaker would never actually say must be rewritten the way a native genuinely says it. It should read as everyday spoken English, not as a translation.`;
}
