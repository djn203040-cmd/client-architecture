import { defineMessages } from "./util";

/** Settings shell + every section (profile, notifications, autonomous,
 * integrations, calendar, voice, sales toolkit, sequence, danger zone).
 * Idiomatic, spoken du-form Danish — see ../GLOSSARY.md. */
export const settings = defineMessages({
  en: {
    page: {
      title: "Settings",
      gmailConnected: "Gmail connected.",
    },
    // The sticky in-page section jump nav.
    nav: {
      profile: "Profile",
      notifications: "Notifications",
      autonomous: "Autonomous",
      voice: "Voice",
      sales: "How you sell",
      calendar: "Calendar",
      integrations: "Integrations",
      session: "Sign out",
      danger: "Danger zone",
    },
    profile: {
      title: "Profile",
      description: "Your identity on Sonorous, saved automatically as you type.",
      languageTitle: "Language",
      changePhoto: "Change photo",
      uploading: "Uploading…",
      photoHint: "JPG, PNG or WebP · max 5 MB",
      avatarAlt: "Avatar",
      avatarUpdated: "Avatar updated",
      uploadFailed: "Upload failed",
      displayName: "Display name",
      roleTitle: "Role / title",
      roleTitlePlaceholder: "e.g. Executive Coach",
      timezone: "Timezone",
      workingHours: "Working hours",
      workingHoursTo: "to",
      bookingUrl: "Public booking URL",
      bookingUrlPlaceholder: "https://cal.com/your-name",
      signature: "Email signature",
      signaturePlaceholder: "Appended to the bottom of outbound emails",
    },
    // Summary card copy on the settings page. Deeper editors live on sub-pages.
    voice: {
      title: "My Voice",
      description:
        "Paste messages you've written, emails, LinkedIn messages, WhatsApp texts. The more you give it, the more accurately it captures how you write.",
    },
    notifications: {
      title: "Notifications",
      description:
        "Choose where you want to hear from Sonorous. Connected channels are loud by default.",
    },
    autonomous: {
      title: "Autonomous mode",
      description: "Choose how much trust to give the AI. You can change this anytime.",
    },
    integrations: {
      title: "Integrations",
      description: "Connected services power your sequences and notifications.",
      notConnected: (label: string) => `${label}, not connected`,
      connect: (label: string) => `Connect ${label}`,
      empty: "No integrations connected yet.",
    },
    calendar: {
      title: "Calendar",
      description:
        "Connect a single calendar tool. We listen for no-shows, completed calls, and new bookings, then start the right follow-up automatically.",
      lastChecked: (when: string) => `Last checked ${when}`,
      disconnect: "Disconnect",
      disconnecting: "Disconnecting…",
      webhookSetup: "Webhook setup",
      show: "→ show",
      hide: "↓ hide",
      pickPrompt: "Pick the calendar you use:",
      switchPrompt: "Use a different calendar?",
      switchPickOne: "Pick one…",
      disconnected: (label: string) => `${label} disconnected.`,
      disconnectError: "Couldn't disconnect. Try again.",
      confirmDisconnectTitle: (label: string) => `Disconnect ${label}?`,
      confirmDisconnectBody: (label: string) =>
        `We'll stop receiving bookings and no-shows from ${label}. Sequences that were already started for existing leads keep running.`,
      confirmSwitchTitle: (label: string) => `Switch to ${label}?`,
      confirmSwitchBody: (from: string, to: string) =>
        `We'll disconnect ${from} first, then walk you through connecting ${to}. You can switch back any time.`,
      switch: "Switch",
      switching: "Switching…",
    },
    salesToolkit: {
      title: "How you sell",
      description:
        "Pick your sales approach, capture your programs, and tell the AI how you handle objections. When a lead hesitates on price or timing, it draws on all of this to make one on-brand attempt to bridge the gap instead of accepting the deferral. Everything here is optional, and saved automatically as you type.",
      stylePickerLabel: "How do you sell?",
      stylePickerHelper:
        "Pick the approach that sounds most like you. It shapes how the AI handles a lead who hesitates. You can change it any time.",
      bestFor: "Best for:",
      exampleAria: (label: string) => `Example of how ${label} sounds`,
      inAction: (label: string) => `${label} in action`,
      philosophyLabel: "Your sales philosophy",
      philosophyHelper:
        "One to three sentences on how you sell, in your own words. The AI uses this to fine tune its posture on top of the approach you picked above.",
      philosophyPlaceholder:
        "e.g. Gentle, never pushy, but I believe part of my job is helping people past the resistance that keeps them stuck. I bridge gaps and encourage the next step.",
      packagesLabel: "Your programs & pricing",
      packagesHelper:
        "Add the packages you actually sell. The more the AI understands your offer ladder, the better it can position the right next step, or a lighter one, when a lead hesitates. Only a name is required.",
      packagesEmpty: "No packages added yet.",
      addPackage: "Add a package",
      removePackage: "Remove package",
      pkgNamePlaceholder: "Program name, e.g. 12-Week 1:1 Container",
      pkgPricePlaceholder: "Price, e.g. $4,000 or 3× $1,500/mo",
      pkgFormatPlaceholder: "Format & duration, e.g. 12 weeks, weekly 60-min calls + Voxer",
      pkgIncludesPlaceholder:
        "What's included, e.g. workbook, 2 live intensives, private community",
      pkgIdealPlaceholder: "Ideal for, e.g. founders stuck under $10k/mo",
      optionsEmpty: "Nothing added yet.",
      remove: "Remove",
      bridgesLabel: "Bridges",
      bridgesHelper:
        "Ways you close the gap when a lead is interested but stuck on an objection, e.g. a payment plan or a lighter version of the program.",
      bridgeNamePlaceholder: "e.g. Payment plan (3-month split)",
      bridgeWhenPlaceholder:
        "When to offer it, e.g. if price is the stated objection but interest is real",
      addBridge: "Add a bridge",
      downsellsLabel: "Downsells",
      downsellsHelper:
        "Lighter or shorter offers you can fall back to when the full container is too big a commitment right now.",
      downsellNamePlaceholder: "e.g. 4-week intensive",
      downsellWhenPlaceholder:
        "When to offer it, e.g. if the full program feels like too long a commitment",
      addDownsell: "Add a downsell",
      leverageLabel: "Leverage points",
      leverageHelper:
        "What you learn on a discovery call, so the AI knows what it might be able to draw on when handling an objection (e.g. income lost to the current situation, the ROI they expect from working with you).",
      leveragePlaceholder:
        "e.g. I always ask what their current situation is costing them each month, and what a solved version would be worth.",
      overrideLabel: "Fine-tune your sales approach",
      overrideHelper:
        "Optional, and most coaches never need it. If the approach you picked doesn't quite match how you sell, describe the difference here in your own words. This overrides the default guidance where they conflict.",
      overridePlaceholder:
        "e.g. I never mention price until they ask. I always open with a question about where they are right now, not where they want to be.",
    },
    sequence: {
      description: "Days from sequence start for each touchpoint. Comma-separated.",
      noShowLabel: "No-show touchpoints",
      callCompletedLabel: "Call-completed touchpoints",
      save: "Save cadence",
      saving: "Saving…",
      saved: "Cadence saved.",
      saveError: "Couldn't save. Try again.",
    },
    signOut: {
      title: "Sign out",
      signedInAs: "Signed in as",
      description: "Sign out to switch accounts or end this session.",
      button: "Sign out",
    },
    danger: {
      title: "Danger zone",
      description: "Irreversible actions. All require exact phrase confirmation.",
      actions: {
        disconnectGmailLabel: "Disconnect Gmail",
        disconnectGmailDescription:
          "Removes Gmail access. Your sequences will pause until you reconnect.",
        disconnectSlackLabel: "Disconnect Slack",
        disconnectSlackDescription:
          "Removes Slack notifications. Dashboard notifications stay active.",
        disconnectTwilioLabel: "Disconnect Twilio",
        disconnectTwilioDescription: "Removes WhatsApp and SMS notifications.",
        deleteAccountLabel: "Delete account",
        deleteAccountDescription:
          "Permanently deletes your account and all data. This cannot be undone.",
      },
      typeToConfirmBefore: "Type",
      typeToConfirmAfter: "to confirm",
      cancel: "Cancel",
      confirm: "Confirm",
      processing: "Processing…",
      accountDeleted: "Account deleted",
      disconnected: "Disconnected",
      actionFailed: "Action failed",
      somethingWentWrong: "Something went wrong",
    },
    // The Settings language switcher card.
    languageSection: {
      danishSub: "Run the whole tool and your drafts in Danish.",
      englishSub: "Run the whole tool and your drafts in English.",
    },
    // Redirect-error banners shown at the top of the page after a failed connect.
    errors: {
      insufficientScopes:
        "We need permission to send and read emails. Please connect Gmail again and grant all requested scopes.",
      oauthNoRefreshToken:
        "Google didn't return a refresh token. Revoke the app in your Google account, then try connecting again.",
      oauthVaultFailed: "We couldn't securely store your tokens. Try again in a moment.",
      oauthExchangeFailed: "We couldn't complete the Google sign-in. Try connecting again.",
      oauthMissingParams: "The connection request was malformed. Try again.",
      calendarUnknownProvider:
        "That calendar provider isn't supported. Pick one from the list.",
      calendarWrongAuthType:
        "That provider uses an API key instead of a sign-in flow. Open it from the calendar picker.",
      calendarOauthNotConfigured:
        "This calendar provider isn't set up on our end yet. Try a different one for now.",
      calendarOauthStartFailed:
        "We couldn't start the calendar connection. Try again in a moment.",
      calendarMissingParams:
        "The calendar provider didn't send back what we needed. Try connecting again.",
      calendarStateInvalid:
        "Your connection link expired. Start the calendar connection again.",
      calendarOauthExchangeFailed: "We couldn't complete the calendar sign-in. Try again.",
      calendarVaultFailed:
        "We couldn't securely store your calendar credentials. Try again in a moment.",
      calendarOauthGeneric: (detail: string) => `Calendar connection failed: ${detail}`,
      generic: "Connection failed. Try again.",
    },
  },
  da: {
    page: {
      title: "Indstillinger",
      gmailConnected: "Gmail er forbundet.",
    },
    nav: {
      profile: "Profil",
      notifications: "Notifikationer",
      autonomous: "Autonom",
      voice: "Stemme",
      sales: "Sådan sælger du",
      calendar: "Kalender",
      integrations: "Integrationer",
      session: "Log ud",
      danger: "Farezone",
    },
    profile: {
      title: "Profil",
      description: "Din identitet på Sonorous, gemmes automatisk, mens du skriver.",
      languageTitle: "Sprog",
      changePhoto: "Skift billede",
      uploading: "Uploader…",
      photoHint: "JPG, PNG eller WebP · maks. 5 MB",
      avatarAlt: "Profilbillede",
      avatarUpdated: "Profilbilledet er opdateret",
      uploadFailed: "Upload mislykkedes",
      displayName: "Visningsnavn",
      roleTitle: "Rolle / titel",
      roleTitlePlaceholder: "f.eks. Executive coach",
      timezone: "Tidszone",
      workingHours: "Arbejdstider",
      workingHoursTo: "til",
      bookingUrl: "Offentligt booking-link",
      bookingUrlPlaceholder: "https://cal.com/dit-navn",
      signature: "E-mailsignatur",
      signaturePlaceholder: "Sættes nederst i de e-mails, du sender ud",
    },
    voice: {
      title: "Min stemme",
      description:
        "Indsæt beskeder, du selv har skrevet — e-mails, LinkedIn-beskeder, WhatsApp-beskeder. Jo mere du giver den, jo bedre rammer den, hvordan du skriver.",
    },
    notifications: {
      title: "Notifikationer",
      description:
        "Vælg, hvor du vil høre fra Sonorous. Forbundne kanaler er slået til som standard.",
    },
    autonomous: {
      title: "Autonom tilstand",
      description: "Vælg, hvor meget du vil overlade til AI'en. Du kan ændre det når som helst.",
    },
    integrations: {
      title: "Integrationer",
      description: "Forbundne tjenester driver dine forløb og notifikationer.",
      notConnected: (label: string) => `${label} — ikke forbundet`,
      connect: (label: string) => `Forbind ${label}`,
      empty: "Ingen integrationer forbundet endnu.",
    },
    calendar: {
      title: "Kalender",
      description:
        "Forbind ét kalenderværktøj. Vi holder øje med udeblevne, gennemførte samtaler og nye bookinger og starter den rigtige opfølgning automatisk.",
      lastChecked: (when: string) => `Sidst tjekket ${when}`,
      disconnect: "Afbryd",
      disconnecting: "Afbryder…",
      webhookSetup: "Opsætning af webhook",
      show: "→ vis",
      hide: "↓ skjul",
      pickPrompt: "Vælg den kalender, du bruger:",
      switchPrompt: "Vil du bruge en anden kalender?",
      switchPickOne: "Vælg en…",
      disconnected: (label: string) => `${label} er afbrudt.`,
      disconnectError: "Vi kunne ikke afbryde. Prøv igen.",
      confirmDisconnectTitle: (label: string) => `Afbryd ${label}?`,
      confirmDisconnectBody: (label: string) =>
        `Vi stopper med at modtage bookinger og udeblevne fra ${label}. Forløb, der allerede er startet for eksisterende leads, kører videre.`,
      confirmSwitchTitle: (label: string) => `Skift til ${label}?`,
      confirmSwitchBody: (from: string, to: string) =>
        `Vi afbryder ${from} først og hjælper dig så med at forbinde ${to}. Du kan altid skifte tilbage.`,
      switch: "Skift",
      switching: "Skifter…",
    },
    salesToolkit: {
      title: "Sådan sælger du",
      description:
        "Vælg din salgstilgang, beskriv dine programmer, og fortæl AI'en, hvordan du håndterer indvendinger. Når et lead tøver over pris eller timing, trækker den på det hele for at gøre ét forsøg — i din stil — på at bygge bro i stedet for bare at acceptere et nej for nu. Alt her er valgfrit og gemmes automatisk, mens du skriver.",
      stylePickerLabel: "Hvordan sælger du?",
      stylePickerHelper:
        "Vælg den tilgang, der ligner dig mest. Den styrer, hvordan AI'en håndterer et lead, der tøver. Du kan ændre det når som helst.",
      bestFor: "Bedst til:",
      exampleAria: (label: string) => `Eksempel på, hvordan ${label} lyder`,
      inAction: (label: string) => `${label} i praksis`,
      philosophyLabel: "Din salgsfilosofi",
      philosophyHelper:
        "En til tre sætninger om, hvordan du sælger — med dine egne ord. AI'en bruger det til at finjustere sin stil oven på den tilgang, du valgte ovenfor.",
      philosophyPlaceholder:
        "f.eks. Blid, aldrig anmassende, men jeg ser det som en del af mit job at hjælpe folk forbi den modstand, der holder dem fast. Jeg bygger bro og opfordrer til næste skridt.",
      packagesLabel: "Dine programmer og priser",
      packagesHelper:
        "Tilføj de pakker, du rent faktisk sælger. Jo bedre AI'en forstår din pris- og tilbudstrappe, jo bedre kan den pege på det rette næste skridt — eller et lettere et — når et lead tøver. Kun et navn er påkrævet.",
      packagesEmpty: "Ingen pakker tilføjet endnu.",
      addPackage: "Tilføj en pakke",
      removePackage: "Fjern pakke",
      pkgNamePlaceholder: "Programnavn, f.eks. 12-ugers 1:1-forløb",
      pkgPricePlaceholder: "Pris, f.eks. 30.000 kr. eller 3× 5.000 kr./md.",
      pkgFormatPlaceholder: "Format og varighed, f.eks. 12 uger, ugentlige 60-min. samtaler + Voxer",
      pkgIncludesPlaceholder:
        "Hvad er inkluderet, f.eks. arbejdsbog, 2 live-intensiver, privat fællesskab",
      pkgIdealPlaceholder: "Ideel til, f.eks. selvstændige, der sidder fast under 75.000 kr./md.",
      optionsEmpty: "Intet tilføjet endnu.",
      remove: "Fjern",
      bridgesLabel: "Broer",
      bridgesHelper:
        "Måder, du lukker afstanden på, når et lead er interesseret men hænger fast i en indvending — f.eks. en betalingsordning eller en lettere udgave af programmet.",
      bridgeNamePlaceholder: "f.eks. Betalingsordning (delt over 3 måneder)",
      bridgeWhenPlaceholder:
        "Hvornår du tilbyder den, f.eks. hvis prisen er indvendingen, men interessen er ægte",
      addBridge: "Tilføj en bro",
      downsellsLabel: "Lettere tilbud",
      downsellsHelper:
        "Lettere eller kortere tilbud, du kan falde tilbage på, når det fulde forløb er for stor en beslutning lige nu.",
      downsellNamePlaceholder: "f.eks. 4-ugers intensiv",
      downsellWhenPlaceholder:
        "Hvornår du tilbyder det, f.eks. hvis det fulde program føles som en for lang forpligtelse",
      addDownsell: "Tilføj et lettere tilbud",
      leverageLabel: "Løftestænger",
      leverageHelper:
        "Det, du finder ud af på en afklarende samtale, så AI'en ved, hvad den kan trække på, når den håndterer en indvending (f.eks. den indtjening, situationen koster dem lige nu, eller det afkast de forventer af at arbejde med dig).",
      leveragePlaceholder:
        "f.eks. Jeg spørger altid, hvad deres nuværende situation koster dem hver måned, og hvad en løst version ville være værd.",
      overrideLabel: "Finjustér din salgstilgang",
      overrideHelper:
        "Valgfrit, og de fleste coaches får aldrig brug for det. Hvis den tilgang, du valgte, ikke helt rammer, hvordan du sælger, så beskriv forskellen her med dine egne ord. Det tilsidesætter standardvejledningen, hvor de er uenige.",
      overridePlaceholder:
        "f.eks. Jeg nævner aldrig pris, før de spørger. Jeg åbner altid med et spørgsmål om, hvor de er lige nu — ikke hvor de gerne vil hen.",
    },
    sequence: {
      description: "Antal dage fra forløbets start for hvert kontaktpunkt. Adskilt med komma.",
      noShowLabel: "Kontaktpunkter ved udeblivelse",
      callCompletedLabel: "Kontaktpunkter efter gennemført samtale",
      save: "Gem kadence",
      saving: "Gemmer…",
      saved: "Kadencen er gemt.",
      saveError: "Vi kunne ikke gemme. Prøv igen.",
    },
    signOut: {
      title: "Log ud",
      signedInAs: "Logget ind som",
      description: "Log ud for at skifte konto eller afslutte denne session.",
      button: "Log ud",
    },
    danger: {
      title: "Farezone",
      description: "Uoprettelige handlinger. Alle kræver, at du bekræfter med den præcise sætning.",
      actions: {
        disconnectGmailLabel: "Afbryd Gmail",
        disconnectGmailDescription:
          "Fjerner adgangen til Gmail. Dine forløb sættes på pause, indtil du forbinder igen.",
        disconnectSlackLabel: "Afbryd Slack",
        disconnectSlackDescription:
          "Fjerner Slack-notifikationer. Notifikationer i overblikket er stadig aktive.",
        disconnectTwilioLabel: "Afbryd Twilio",
        disconnectTwilioDescription: "Fjerner WhatsApp- og SMS-notifikationer.",
        deleteAccountLabel: "Slet konto",
        deleteAccountDescription:
          "Sletter din konto og alle data permanent. Det kan ikke fortrydes.",
      },
      typeToConfirmBefore: "Skriv",
      typeToConfirmAfter: "for at bekræfte",
      cancel: "Annullér",
      confirm: "Bekræft",
      processing: "Behandler…",
      accountDeleted: "Kontoen er slettet",
      disconnected: "Afbrudt",
      actionFailed: "Handlingen mislykkedes",
      somethingWentWrong: "Noget gik galt",
    },
    languageSection: {
      danishSub: "Kør hele værktøjet og dine udkast på dansk.",
      englishSub: "Run the whole tool and your drafts in English.",
    },
    errors: {
      insufficientScopes:
        "Vi skal have lov til at sende og læse e-mails. Forbind Gmail igen, og giv adgang til alt det, vi beder om.",
      oauthNoRefreshToken:
        "Google sendte ikke et refresh-token retur. Fjern appens adgang i din Google-konto, og prøv at forbinde igen.",
      oauthVaultFailed: "Vi kunne ikke gemme dine tokens sikkert. Prøv igen om lidt.",
      oauthExchangeFailed: "Vi kunne ikke fuldføre Google-login. Prøv at forbinde igen.",
      oauthMissingParams: "Forbindelsesforespørgslen var forkert. Prøv igen.",
      calendarUnknownProvider:
        "Den kalenderudbyder understøttes ikke. Vælg en fra listen.",
      calendarWrongAuthType:
        "Den udbyder bruger en API-nøgle i stedet for et login. Åbn den fra kalendervælgeren.",
      calendarOauthNotConfigured:
        "Denne kalenderudbyder er ikke sat op hos os endnu. Prøv en anden for nu.",
      calendarOauthStartFailed:
        "Vi kunne ikke starte kalenderforbindelsen. Prøv igen om lidt.",
      calendarMissingParams:
        "Kalenderudbyderen sendte ikke det, vi havde brug for, retur. Prøv at forbinde igen.",
      calendarStateInvalid:
        "Dit forbindelseslink er udløbet. Start kalenderforbindelsen igen.",
      calendarOauthExchangeFailed: "Vi kunne ikke fuldføre kalender-login. Prøv igen.",
      calendarVaultFailed:
        "Vi kunne ikke gemme dine kalenderoplysninger sikkert. Prøv igen om lidt.",
      calendarOauthGeneric: (detail: string) => `Kalenderforbindelsen mislykkedes: ${detail}`,
      generic: "Forbindelsen mislykkedes. Prøv igen.",
    },
  },
});
