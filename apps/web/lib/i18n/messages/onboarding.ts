import { defineMessages } from "./util";

/** Onboarding wizard shell + steps (gmail, booking, calendar, sales, voice,
 * first lead, notifications). The language step itself stays bilingual on its
 * own (StepLanguage), and the language heading/label here stay bilingual too,
 * because they can render before a language is chosen. */
export const onboarding = defineMessages({
  en: {
    // WizardShell — brand + per-step headings + dev skip link
    shell: {
      brand: "The Client Architecture",
      headings: {
        // Bilingual on purpose: shown before a language is picked.
        language: "Vælg sprog · Choose language",
        gmail: "Connect your Gmail",
        booking: "Add your booking link",
        calendar: "Connect your calendar",
        sales: "How you sell",
        voice: "Teach the AI your voice",
        "first-lead": "Your first AI draft",
        notifications: "Where should we reach you?",
      },
      devOnly: "Dev only, ",
      skipOnboarding: "Skip onboarding",
    },
    // StepIndicator — progress dots
    indicator: {
      ariaLabel: "Onboarding progress",
      labels: {
        language: "Language",
        gmail: "Gmail",
        booking: "Booking",
        calendar: "Calendar",
        sales: "Selling",
        voice: "Voice",
        "first-lead": "First lead",
        notifications: "Notifications",
      },
    },
    // StepGmail
    gmail: {
      intro:
        "We send follow-up emails as you, from your Gmail address, not a generic system address. This keeps deliverability high and trust intact.",
      connected: "Gmail connected",
      connect: "Connect Gmail",
      advanceFailed: "Couldn't advance. Try again.",
      saving: "Saving…",
      continue: "Continue",
    },
    // StepBooking
    booking: {
      intro:
        "Paste the public booking link your leads use to book a call with you. The AI will use this verbatim when a draft needs to offer a time, so you never see “[CALENDLY LINK]” placeholders in your emails.",
      label: "Your booking link",
      placeholder: "https://cal.com/your-name",
      invalidUrl: "URLs need to start with http:// or https://",
      looksGood: "Looks good.",
      showHints: "Show where to find your link",
      hideHints: "Hide where to find your link",
      anyProvider:
        "Any other provider works too, just paste the public booking URL.",
      saveFailed: "Couldn't save your booking link. Try again.",
      advanceFailed: "Couldn't advance. Try again.",
      later: "I'll add this later",
      saving: "Saving…",
      continue: "Continue",
    },
    // StepCalendar
    calendar: {
      intro:
        "Connect your calendar so we can pick up no-shows, post-call completions, and new bookings, and start the right follow-up automatically. Pick the tool you actually use; you can switch later from Settings.",
      connectedHeading: (label: string) => `${label}, connected`,
      autoReady:
        "We'll start receiving bookings + no-shows automatically.",
      manualReady:
        "Finish wiring the webhook below so we start receiving events.",
      skippedToast:
        "Skipped, you can connect a calendar later from Settings.",
      advanceFailed: "Couldn't advance. Try again.",
      later: "I'll do this later",
      saving: "Saving…",
      continue: "Continue",
      continueWithout: "Continue without calendar",
    },
    // StepSales
    sales: {
      intro:
        "Start by picking the sales approach that sounds most like you, that part takes about a minute. If you want, add your programs and how you handle objections too, so the AI can bridge the gap the way you would when a lead hesitates. The whole thing takes about 3 to 5 minutes, and you can skip it now and finish later in Settings.",
      advanceFailed: "Couldn't advance. Try again.",
      later: "I'll add this later",
      saving: "Saving…",
      continue: "Continue",
    },
    // StepVoice
    voice: {
      intro:
        "Paste messages you've written. The more you give it, the more accurately it captures how you write.",
      counter: (count: number) => `${count} / 8 min`,
      notComplete: "Voice model not complete yet. Try again.",
      checking: "Checking…",
      continue: "Continue",
    },
    // StepFirstLead
    firstLead: {
      generating: "Generating your first AI draft…",
      loadFailed: "Couldn't load demo. Refresh to try again.",
      loadFailedBody: "Couldn't load the demo. Refresh the page to try again.",
      intro:
        "Here's what the AI drafted for a sample lead, in your voice, based on what they shared on the call. Review it, then approve to see what happens next.",
      advanceFailed: "Couldn't advance. Try again.",
      saving: "Saving…",
      continue: "Continue",
    },
    // DemoLeadDraft
    demoDraft: {
      badge: "Onboarding demo",
      to: (name: string) => `To: ${name}`,
      generatedInVoice: "AI-generated in your voice",
      approveFailed: "Couldn't approve draft. Try again.",
      approving: "Approving…",
      approve: "Approve this draft",
    },
    // StepNotifications
    notifications: {
      intro:
        "We'll notify you the moment a draft is ready or a lead replies. Pick at least one channel beyond Dashboard, or acknowledge Dashboard-only mode.",
      advanceFailed:
        "Enable at least one channel, or acknowledge Dashboard-only mode in the matrix below.",
      savedToast:
        "Notifications set, you can change these anytime in Settings.",
      saving: "Saving…",
      finish: "Finish setup",
    },
  },
  da: {
    shell: {
      brand: "The Client Architecture",
      headings: {
        language: "Vælg sprog · Choose language",
        gmail: "Forbind din Gmail",
        booking: "Tilføj dit booking-link",
        calendar: "Forbind din kalender",
        sales: "Sådan sælger du",
        voice: "Lær AI'en din stemme",
        "first-lead": "Dit første AI-udkast",
        notifications: "Hvor skal vi fange dig?",
      },
      devOnly: "Kun i dev, ",
      skipOnboarding: "Spring opsætningen over",
    },
    indicator: {
      ariaLabel: "Fremgang i opsætningen",
      labels: {
        language: "Sprog",
        gmail: "Gmail",
        booking: "Booking",
        calendar: "Kalender",
        sales: "Salg",
        voice: "Stemme",
        "first-lead": "Første lead",
        notifications: "Notifikationer",
      },
    },
    gmail: {
      intro:
        "Vi sender opfølgende e-mails som dig, fra din Gmail-adresse — ikke fra en anonym systemadresse. Det holder leveringssikkerheden høj og tilliden intakt.",
      connected: "Gmail forbundet",
      connect: "Forbind Gmail",
      advanceFailed: "Vi kunne ikke gå videre. Prøv igen.",
      saving: "Gemmer…",
      continue: "Fortsæt",
    },
    booking: {
      intro:
        "Indsæt det offentlige booking-link, dine leads bruger til at booke en samtale med dig. AI'en bruger det ordret, når et udkast skal tilbyde et tidspunkt, så du aldrig ser “[CALENDLY LINK]”-pladsholdere i dine e-mails.",
      label: "Dit booking-link",
      placeholder: "https://cal.com/dit-navn",
      invalidUrl: "URL'er skal starte med http:// eller https://",
      looksGood: "Ser godt ud.",
      showHints: "Vis, hvor du finder dit link",
      hideHints: "Skjul, hvor du finder dit link",
      anyProvider:
        "Alle andre udbydere virker også — indsæt bare det offentlige booking-link.",
      saveFailed: "Vi kunne ikke gemme dit booking-link. Prøv igen.",
      advanceFailed: "Vi kunne ikke gå videre. Prøv igen.",
      later: "Det tilføjer jeg senere",
      saving: "Gemmer…",
      continue: "Fortsæt",
    },
    calendar: {
      intro:
        "Forbind din kalender, så vi kan fange udeblivelser, gennemførte samtaler og nye bookinger — og sætte den rette opfølgning i gang automatisk. Vælg det værktøj, du faktisk bruger; du kan skifte senere under Indstillinger.",
      connectedHeading: (label: string) => `${label} forbundet`,
      autoReady:
        "Vi begynder at modtage bookinger og udeblivelser automatisk.",
      manualReady:
        "Færdiggør opsætningen af webhooken nedenfor, så vi begynder at modtage begivenheder.",
      skippedToast:
        "Sprunget over — du kan forbinde en kalender senere under Indstillinger.",
      advanceFailed: "Vi kunne ikke gå videre. Prøv igen.",
      later: "Det gør jeg senere",
      saving: "Gemmer…",
      continue: "Fortsæt",
      continueWithout: "Fortsæt uden kalender",
    },
    sales: {
      intro:
        "Start med at vælge den salgsstil, der lyder mest som dig — det tager cirka et minut. Hvis du vil, kan du også tilføje dine programmer og måden, du håndterer indvendinger på, så AI'en kan bygge bro på samme måde, som du selv ville, når et lead tøver. Det hele tager cirka 3 til 5 minutter, og du kan springe det over nu og gøre det færdigt senere under Indstillinger.",
      advanceFailed: "Vi kunne ikke gå videre. Prøv igen.",
      later: "Det tilføjer jeg senere",
      saving: "Gemmer…",
      continue: "Fortsæt",
    },
    voice: {
      intro:
        "Indsæt beskeder, du selv har skrevet. Jo flere du giver den, jo mere præcist rammer den måden, du skriver på.",
      counter: (count: number) => `${count} / 8 min.`,
      notComplete: "Stemmemodellen er ikke helt klar endnu. Prøv igen.",
      checking: "Tjekker…",
      continue: "Fortsæt",
    },
    firstLead: {
      generating: "Laver dit første AI-udkast…",
      loadFailed: "Vi kunne ikke indlæse demoen. Genindlæs for at prøve igen.",
      loadFailedBody:
        "Vi kunne ikke indlæse demoen. Genindlæs siden for at prøve igen.",
      intro:
        "Her er, hvad AI'en har skrevet til et eksempel-lead — i din stemme, ud fra det de delte i samtalen. Læs det igennem, og godkend for at se, hvad der sker derefter.",
      advanceFailed: "Vi kunne ikke gå videre. Prøv igen.",
      saving: "Gemmer…",
      continue: "Fortsæt",
    },
    demoDraft: {
      badge: "Demo i opsætningen",
      to: (name: string) => `Til: ${name}`,
      generatedInVoice: "Skrevet af AI'en i din stemme",
      approveFailed: "Vi kunne ikke godkende udkastet. Prøv igen.",
      approving: "Godkender…",
      approve: "Godkend dette udkast",
    },
    notifications: {
      intro:
        "Vi giver dig besked i samme øjeblik et udkast er klar, eller et lead svarer. Vælg mindst én kanal ud over Overblik, eller bekræft, at du kun vil have det i Overblik.",
      advanceFailed:
        "Slå mindst én kanal til, eller bekræft kun-Overblik-tilstand i matrixen nedenfor.",
      savedToast:
        "Notifikationer er sat — du kan altid ændre dem under Indstillinger.",
      saving: "Gemmer…",
      finish: "Afslut opsætningen",
    },
  },
});
