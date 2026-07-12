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
      language: "Language",
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
      // The shared objection every style example answers, so the three are
      // directly comparable. Localized display copy only — the model-facing
      // steer lives separately in ai-engine and is unaffected.
      scenario:
        'A warm lead replies: "I love this, but $4,000 is a stretch for me right now."',
      styles: {
        guide: {
          label: "The Guide",
          tagline: "Nurturing and unhurried",
          description:
            "You lead with genuine curiosity and let people arrive at the decision themselves. Lots of questions, real listening, and only a gentle nudge when someone hesitates. You never push.",
          bestFor:
            "Transformation, life, health, and relationship coaches, and anyone whose audience recoils from feeling 'sold to'.",
          example:
            "I completely hear you, and there's zero rush on my end. Can I ask, when you picture having this fully handled a few months from now, what changes for you? Sometimes 'it's a stretch' is really 'is now the right time,' and I'd rather help you get clear on that than talk you into anything. If it helps, we could also start smaller and see how it feels.",
        },
        closer: {
          label: "The Closer",
          tagline: "Direct and decisive",
          description:
            "You diagnose the problem quickly, then name the objection out loud and make a clear, confident ask. Honest urgency, no dancing around it, you help people stop overthinking and commit.",
          bestFor:
            "Business, sales, mindset, and fitness coaches whose clients respect straight talk and short decision cycles.",
          example:
            "Fair, and thanks for saying it straight. Honest question: is the money genuinely not there, or are you just not sure yet it's worth it? Those are two different problems. If it's worth-it, that's the real thing for us to work through. And if it's timing, it doesn't have to be one big hit, we can split it into three payments. Which of those is closer to the truth for you?",
        },
        strategist: {
          label: "The Strategist",
          tagline: "Value architect",
          description:
            "You win on the offer itself: stack the value, lower the risk, present the right package, and reach for the payment plan or lighter option that removes the exact obstacle, so saying yes becomes the obvious move.",
          bestFor:
            "Coaches with tiered programs and clear pricing ladders, and higher-ticket offers where structure and ROI matter most.",
          example:
            "Makes sense, let's look at it properly. The full program is $4,000 for the 12 weeks and everything in it. Lined up against what staying stuck is costing you, the math usually flips. But if cash flow is the real constraint, I'd rather keep your momentum than lose it, so we could do a 3-payment plan, or start with the 4-week intensive and roll it into the full thing. Which feels right?",
        },
      },
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
      language: "Sprog",
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
      scenario:
        'Et varmt lead svarer: "Jeg elsker det, men 30.000 kr. er lige i overkanten for mig lige nu."',
      styles: {
        guide: {
          label: "Guiden",
          tagline: "Nærværende og uden hastværk",
          description:
            "Du går til det med ægte nysgerrighed og lader folk selv nå frem til beslutningen. Masser af spørgsmål, rigtig lytning, og kun et blidt skub, når nogen tøver. Du presser aldrig.",
          bestFor:
            "Transformations-, livs-, sundheds- og parcoaches, og alle, hvis publikum får kuldegysninger af at føle sig 'solgt til'.",
          example:
            "Jeg forstår dig fuldstændig, og der er slet ingen hast fra min side. Må jeg spørge: når du forestiller dig, at det her er helt på plads om et par måneder, hvad ændrer sig så for dig? Nogle gange betyder 'det er lige i overkanten' i virkeligheden 'er det det rigtige tidspunkt', og jeg vil hellere hjælpe dig med at blive klar på det end tale dig til noget. Hvis det hjælper, kan vi også starte i det små og mærke, hvordan det føles.",
        },
        closer: {
          label: "Afslutteren",
          tagline: "Direkte og beslutsom",
          description:
            "Du finder problemet hurtigt, sætter så ord på indvendingen højt og kommer med en klar, selvsikker opfordring. Ærlig fornemmelse af, at det haster, ingen omsvøb — du hjælper folk med at holde op med at overtænke og træffe beslutningen.",
          bestFor:
            "Business-, salgs-, mindset- og fitnesscoaches, hvis kunder respekterer ligefrem tale og korte beslutningsforløb.",
          example:
            "Fair nok, og tak fordi du siger det ligeud. Ærligt spørgsmål: er pengene der reelt ikke, eller er du bare ikke sikker på, at det er det værd endnu? Det er to forskellige problemer. Handler det om, hvorvidt det er det værd, så er det lige præcis det, vi skal have styr på sammen. Og handler det om timing, behøver det ikke være ét stort beløb — vi kan dele det op i tre rater. Hvad af det ligger tættest på sandheden for dig?",
        },
        strategist: {
          label: "Strategen",
          tagline: "Værdiarkitekt",
          description:
            "Du vinder på selve tilbuddet: byg værdien op, sænk risikoen, præsentér den rigtige pakke, og grib fat i ratebetalingen eller den lettere løsning, der fjerner netop den forhindring, så et ja bliver det oplagte valg.",
          bestFor:
            "Coaches med trinvise programmer og klare pristrapper, og dyrere tilbud, hvor struktur og udbytte betyder mest.",
          example:
            "Giver god mening, lad os kigge ordentligt på det. Hele programmet er 30.000 kr. for de 12 uger og alt, hvad der er i det. Holdt op mod, hvad det koster dig at blive stående, hvor du er, vender regnestykket som regel. Men hvis likviditeten er den reelle udfordring, vil jeg hellere holde dit momentum end miste det, så vi kan lave en 3-rate-plan, eller starte med det 4-ugers intensivforløb og rulle det ind i det fulde. Hvad føles rigtigt?",
        },
      },
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
