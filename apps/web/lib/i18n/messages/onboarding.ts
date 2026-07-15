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
      stepMeta: (n: number, total: number) => `Step ${n} of ${total}`,
      estimates: {
        language: "takes under a minute",
        gmail: "takes about a minute",
        booking: "takes about a minute",
        calendar: "takes a couple of minutes",
        sales: "takes a couple of minutes",
        voice: "takes a couple of minutes",
        "first-lead": "takes about a minute",
        notifications: "takes under a minute",
      },
      back: "Back",
      watchVideo: "Watch how it's done",
      help: "Stuck or unsure?",
      helpLink: "Message Daniel",
      helpTail: "— he'll walk you through it.",
      helpMailSubject: "Help with my setup",
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
    // Localized messages for machine error codes returned by
    // /api/onboarding/complete-step. Keys mirror the server's `code` field.
    errors: {
      gmail_not_connected: "Gmail isn't connected yet — click Connect Gmail above first.",
      voice_examples_min:
        "The voice needs at least 8 examples before we can continue. Use the button above, or paste more messages.",
      demo_not_approved: "Approve the draft above first — then we'll continue.",
      notifications_channel_required:
        "Turn on at least one channel, or tick the dashboard-only box.",
      save_failed: "We couldn't save that. Check your connection and try again.",
    },
    // StepGmail
    gmail: {
      intro:
        "We send follow-up emails as you, from your Gmail address, not a generic system address. This keeps deliverability high and trust intact.",
      preflightTitle: "Before you click:",
      preflightBody:
        "Google will show a warning that this app isn't verified yet. That's normal at our size — click “Advanced”, then “Continue”. You'll only see it once.",
      connected: "Gmail connected",
      connect: "Connect Gmail",
      errorDeniedTitle: "You said no on Google's screen — no problem.",
      errorDeniedBody:
        "Nothing was connected. When you're ready, click Try again and choose Allow on Google's screen.",
      errorGenericTitle: "That didn't work.",
      errorGenericBody:
        "Something went wrong while connecting to Google. It's not you — just try again. If it keeps happening, message Daniel below.",
      retry: "Try again",
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
        "Which tool do your leads use to book calls with you? Connect it with a couple of clicks, and we'll automatically notice new bookings, no-shows, and finished calls — and start the right follow-up for you.",
      otherTool:
        "Using a different tool, or not sure? Skip this step — you can set it up later in Settings, or Daniel will do it with you.",
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
        "One click: pick the way of selling that sounds most like you. If you also add your programs and prices below, the AI can answer “what does it cost?” exactly the way you would. You can skip any of it and finish later in Settings.",
      advanceFailed: "Couldn't advance. Try again.",
      later: "I'll add this later",
      saving: "Saving…",
      continue: "Continue",
    },
    // StepVoice
    voice: {
      intro:
        "The AI writes to your leads in your voice. Click the button below and it learns from emails you've already sent — one click, and nothing changes in your Gmail.",
      counter: (count: number) => `${count} / 8 min`,
      notComplete: "Voice model not complete yet. Try again.",
      checking: "Checking…",
      continue: "Continue",
    },
    // StepFirstLead
    firstLead: {
      generating: "Generating your first AI draft…",
      loadFailed: "Couldn't load the demo.",
      loadFailedBody: "We couldn't load the demo. It's not you — just try again.",
      retry: "Try again",
      intro:
        "Here's what the AI drafted for a sample lead, in your voice, based on what they shared on the call. Review it, then approve to see what happens next.",
      celebration:
        "Beautiful — that's exactly how it works with real leads: the AI writes, you approve, and we send it from your Gmail. You're nearly done.",
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
        "When a draft is ready for your OK, where should we ping you? Email is already on — you don't have to change anything.",
      emailTitle: "Email",
      emailBody: (email: string) =>
        `We'll email you at ${email} when something needs your OK.`,
      slackTitle: "Slack",
      slackBody: "Prefer Slack? Connect it and we'll ping you there too.",
      slackConnect: "Connect Slack",
      dashboardTitle: "Dashboard",
      dashboardBody:
        "Everything also shows up here, always. This one can't be turned off.",
      alwaysOn: "Always on",
      dashboardOnly: "Only notify me on the dashboard",
      saveFailed: "Couldn't save that. Try again.",
      advanceFailed:
        "Turn on at least one channel, or tick the dashboard-only box.",
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
      stepMeta: (n: number, total: number) => `Trin ${n} af ${total}`,
      estimates: {
        language: "tager under et minut",
        gmail: "tager cirka et minut",
        booking: "tager cirka et minut",
        calendar: "tager et par minutter",
        sales: "tager et par minutter",
        voice: "tager et par minutter",
        "first-lead": "tager cirka et minut",
        notifications: "tager under et minut",
      },
      back: "Tilbage",
      watchVideo: "Se hvordan du gør",
      help: "Sidder du fast?",
      helpLink: "Skriv til Daniel",
      helpTail: "— han hjælper dig igennem.",
      helpMailSubject: "Hjælp til min opsætning",
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
    errors: {
      gmail_not_connected:
        "Gmail er ikke forbundet endnu — klik på Forbind Gmail ovenfor først.",
      voice_examples_min:
        "Stemmen har brug for mindst 8 eksempler, før vi kan gå videre. Brug knappen ovenfor, eller indsæt flere beskeder.",
      demo_not_approved: "Godkend udkastet ovenfor først — så går vi videre.",
      notifications_channel_required:
        "Slå mindst én kanal til, eller sæt kryds i kun-overblik.",
      save_failed: "Vi kunne ikke gemme det. Tjek din forbindelse, og prøv igen.",
    },
    gmail: {
      intro:
        "Vi sender opfølgende e-mails som dig, fra din Gmail-adresse — ikke fra en anonym systemadresse. Det holder leveringssikkerheden høj og tilliden intakt.",
      preflightTitle: "Inden du klikker:",
      preflightBody:
        "Google viser en advarsel om, at appen ikke er verificeret endnu. Det er helt normalt i vores størrelse — klik “Avanceret” og derefter “Fortsæt”. Du ser den kun én gang.",
      connected: "Gmail forbundet",
      connect: "Forbind Gmail",
      errorDeniedTitle: "Du sagde nej på Googles skærm — helt fint.",
      errorDeniedBody:
        "Der blev ikke forbundet noget. Når du er klar, så klik Prøv igen og vælg Tillad på Googles skærm.",
      errorGenericTitle: "Det virkede ikke.",
      errorGenericBody:
        "Noget gik galt, da vi forbandt til Google. Det er ikke din skyld — prøv bare igen. Sker det igen, så skriv til Daniel nedenfor.",
      retry: "Prøv igen",
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
        "Hvilket værktøj bruger dine leads til at booke samtaler med dig? Forbind det med et par klik, så opdager vi automatisk nye bookinger, udeblivelser og gennemførte samtaler — og sætter den rette opfølgning i gang for dig.",
      otherTool:
        "Bruger du noget andet, eller er du i tvivl? Spring det over — du kan sætte det op senere under Indstillinger, eller Daniel gør det sammen med dig.",
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
        "Ét klik: vælg den måde at sælge på, der lyder mest som dig. Tilføjer du også dine programmer og priser nedenfor, kan AI'en svare på “hvad koster det?” præcis som du ville. Du kan springe det hele over og gøre det færdigt senere under Indstillinger.",
      advanceFailed: "Vi kunne ikke gå videre. Prøv igen.",
      later: "Det tilføjer jeg senere",
      saving: "Gemmer…",
      continue: "Fortsæt",
    },
    voice: {
      intro:
        "AI'en skriver til dine leads med din stemme. Klik på knappen nedenfor, så lærer den af e-mails, du allerede har sendt — ét klik, og der ændres intet i din Gmail.",
      counter: (count: number) => `${count} / 8 min.`,
      notComplete: "Stemmemodellen er ikke helt klar endnu. Prøv igen.",
      checking: "Tjekker…",
      continue: "Fortsæt",
    },
    firstLead: {
      generating: "Laver dit første AI-udkast…",
      loadFailed: "Vi kunne ikke indlæse demoen.",
      loadFailedBody:
        "Vi kunne ikke indlæse demoen. Det er ikke din skyld — prøv bare igen.",
      retry: "Prøv igen",
      intro:
        "Her er, hvad AI'en har skrevet til et eksempel-lead — i din stemme, ud fra det de delte i samtalen. Læs det igennem, og godkend for at se, hvad der sker derefter.",
      celebration:
        "Smukt — sådan foregår det med rigtige leads: AI'en skriver, du godkender, og vi sender fra din Gmail. Du er næsten i mål.",
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
        "Hvor skal vi give dig besked, når et udkast er klar til dit OK? E-mail er allerede slået til — du behøver ikke ændre noget.",
      emailTitle: "E-mail",
      emailBody: (email: string) =>
        `Vi sender en e-mail til ${email}, når noget kræver dit OK.`,
      slackTitle: "Slack",
      slackBody: "Foretrækker du Slack? Forbind den, så giver vi også besked dér.",
      slackConnect: "Forbind Slack",
      dashboardTitle: "Overblik",
      dashboardBody:
        "Alt vises også altid her. Denne kan ikke slås fra.",
      alwaysOn: "Altid slået til",
      dashboardOnly: "Giv mig kun besked i overblikket",
      saveFailed: "Vi kunne ikke gemme det. Prøv igen.",
      advanceFailed:
        "Slå mindst én kanal til, eller sæt kryds i kun-overblik.",
      savedToast:
        "Notifikationer er sat — du kan altid ændre dem under Indstillinger.",
      saving: "Gemmer…",
      finish: "Afslut opsætningen",
    },
  },
});
