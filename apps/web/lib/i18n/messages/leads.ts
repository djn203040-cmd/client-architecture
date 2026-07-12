import { defineMessages } from "./util";

/** Leads list + lead profile/detail. */
export const leads = defineMessages({
  en: {
    // Leads list page
    list: {
      title: "Leads",
      emptyNoLeadsTitle: "No leads yet",
      emptyNoLeadsBody:
        "Add your first lead to get started. They can come from Calendly, Cal.com, or anywhere you meet potential clients.",
      emptyFilteredTitle: "No leads match this filter",
      emptyFilteredBody: "Try a different status or clear your search.",
    },
    // Leads table headers
    table: {
      name: "Name",
      state: "State",
      source: "Source",
      lastActivity: "Last activity",
    },
    // Tabs + search controls
    controls: {
      tabActive: "Active",
      tabReplied: "Replied",
      tabWon: "Won",
      tabHeld: "Held",
      tabLost: "Lost",
      searchPlaceholder: "Search leads…",
      searchAria: "Search leads",
    },
    // Add lead sheet
    addLead: {
      trigger: "Add lead",
      title: "Add lead",
      name: "Name",
      email: "Email",
      phone: "Phone (optional)",
      source: "Source",
      notes: "Notes (optional)",
      notesPlaceholder: "Private notes, injected into every AI draft for this lead.",
      submit: "Add lead",
      submitting: "Adding…",
      saveError: "Couldn't save this lead. Check your connection and try again.",
      added: "Lead added",
    },
    // Lead lifecycle state labels (visible labels; enum values kept)
    status: {
      identified: "Identified",
      call_booked: "Call booked",
      no_show: "No show",
      call_completed: "Call completed",
      in_sequence: "In sequence",
      replied: "Replied",
      converted: "Converted",
      lost: "Lost",
      unsubscribed: "Unsubscribed",
      do_not_contact: "Do not contact",
      bounced: "Bounced",
    },
    // Lead profile page + header
    profile: {
      backToLeads: "Back to leads",
      threadTab: "Thread",
      timelineTab: "Timeline",
      notesTab: "Notes",
      doNotContact: "Do not contact",
      notFoundTitle: "Lead not found",
      notFoundBody: "This lead doesn't exist or you don't have access to it.",
    },
    // Manual state override + do-not-contact
    stateOverride: {
      trigger: "Update lead status",
      updateError: "Couldn't update status.",
      updated: "Status updated",
      dncTitle: (name: string) => `Mark ${name} as do-not-contact?`,
      dncDescription: "No further emails will ever be sent to this address.",
      dncCancel: "Cancel",
      dncConfirm: "Mark do-not-contact",
    },
    // Lift do-not-contact
    liftDnc: {
      lift: "Lift",
      title: (name: string) => `Lift Do-Not-Contact for ${name}?`,
      description:
        "This lead previously asked not to be contacted. Only lift this flag if they have explicitly opted back in. Their state will reset to Identified so you can re-engage them like a new lead.",
      cancel: "Cancel",
      confirm: "Yes, lift the flag",
      lifting: "Lifting…",
      success: (name: string) =>
        `${name} can be contacted again, state reset to Identified.`,
      error: "Couldn't lift the flag. Try again.",
    },
    // Delete lead
    deleteLead: {
      trigger: "Delete lead",
      title: (name: string) => `Delete ${name}?`,
      description:
        "This permanently removes the lead and all of their timeline, drafts, transcripts, and notes. This cannot be undone.",
      cancel: "Cancel",
      confirm: "Delete lead",
      deleting: "Deleting…",
      error: "Couldn't delete this lead. Try again.",
      success: (name: string) => `${name} deleted`,
    },
    // Coach notes field
    notes: {
      label: "Private notes, injected into every AI draft for this lead.",
      saveError: "Notes couldn't be saved. Your changes are still here, try again.",
      savedAt: (time: string) => `Saved ${time}`,
    },
    // Activity timeline
    timeline: {
      emptyTitle: "No activity yet",
      emptyBody:
        "Events will appear here as the sequence progresses, emails sent, replies received, state changes.",
      stateChanged: (to: string, from?: string) =>
        `State changed${from ? ` from ${from}` : ""} to ${to}`,
      stateChangedUnknown: "unknown",
      noteAdded: "Note added",
      emailSent: "Email sent",
      emailOpened: "Email opened",
      replied: "Lead replied",
      converted: "Converted to client",
    },
    // Sequence status panel
    sequenceStatus: {
      heading: "Sequence",
      stepsOf: (total: number) => `${total} of ${total} steps`,
      stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
      statusLabel: "Status",
      nextSend: "Next send",
      complete: "Complete",
      paused: "Paused",
      stopped: "Stopped",
      onHold: "On hold",
      stepLabel: (index: number) => `Step ${index}`,
      startError: "Couldn't start sequence. Try again.",
      started: "Intake sequence started.",
      start: "Start Intake Sequence",
      starting: "Starting…",
      startAria: "Start Intake Sequence",
    },
    // AI lead description / summary
    summary: {
      cardAria: "AI lead description",
      heading: "Lead description",
      empty: "No lead description yet. Generate a draft to build context.",
      editAria: "Edit AI lead description",
      editClickAria: "Click to edit AI lead description",
      cancel: "Cancel",
      save: "Save",
      saveError: "Couldn't save your edits. Try again.",
      editedByYou: "Edited by you",
      aiWritten: "AI-written",
    },
    // Generate draft button
    generate: {
      idle: "Generate draft",
      generating: "Generating...",
      genFailed: "Draft generation failed. Try again.",
      ready: "Draft ready, review it below.",
      timeout: "Still generating, refresh the queue in a moment.",
      failedFallback: "Generation failed. Try again.",
      networkError: "Network error. Try again.",
    },
    // Ad-hoc drafts panel
    drafts: {
      heading: "Drafts awaiting review",
      aria: "Drafts awaiting review",
    },
    // Call outcome panel
    callOutcome: {
      sectionAria: "Call outcome",
      awaitingHeading: "Awaiting your outcome",
      thresholdBody:
        ", your client's first 48 hours, built from your sales call.",
      thresholdTitle: "The Threshold Experience",
      bookACall: "Book a call",
    },
    // Email thread + rows
    emailThread: {
      loadError: "Couldn't load emails. Check your Gmail connection in Settings.",
      empty: "No emails yet.",
    },
    // Manual transcript upload
    transcript: {
      heading: "Call Transcript",
      latestCall: "Latest call",
      totalOnFile: (total: number) => ` · ${total} total on file`,
      collapse: "Collapse",
      expand: "Expand",
      deleteLatestAria: "Delete latest transcript",
      usesLatest:
        "Drafts use this latest call. Earlier calls stay on file for recap-style follow-ups.",
      addNewCall: "Add new call",
      showEarlier: (count: number) =>
        `Show ${count} earlier ${count === 1 ? "call" : "calls"}`,
      hideEarlier: (count: number) =>
        `Hide ${count} earlier ${count === 1 ? "call" : "calls"}`,
      deleteRowAria: (date: string) => `Delete transcript from ${date}`,
      placeholder: "Paste transcript text or upload a .txt file...",
      cancel: "Cancel",
      uploadTxt: "Upload .txt file",
      save: "Save transcript",
      saving: "Saving...",
      saveError: "Couldn't save the transcript. Try again.",
      deleteError: "Couldn't delete the transcript. Try again.",
      deleted: "Transcript deleted",
      deleteTitleLatest: "Delete the latest transcript?",
      deleteTitleThis: "Delete this transcript?",
      deleteCancel: "Cancel",
      deleteConfirm: "Delete transcript",
      deleting: "Deleting…",
      deleteBody: (
        date: string,
        opts: { isLatest: boolean; hasPrior: boolean }
      ) =>
        `This permanently removes the transcript from ${date}. ${
          opts.isLatest && opts.hasPrior
            ? "The next-most-recent call will become the latest and drive future drafts."
            : opts.isLatest
              ? "No transcripts will remain on this lead."
              : "Drafts will not be affected, they already use the latest call."
        } This cannot be undone.`,
    },
  },
  da: {
    list: {
      title: "Leads",
      emptyNoLeadsTitle: "Ingen leads endnu",
      emptyNoLeadsBody:
        "Tilføj dit første lead for at komme i gang. De kan komme fra Calendly, Cal.com eller hvor som helst du møder mulige klienter.",
      emptyFilteredTitle: "Ingen leads passer til dette filter",
      emptyFilteredBody: "Prøv en anden status eller ryd din søgning.",
    },
    table: {
      name: "Navn",
      state: "Tilstand",
      source: "Kilde",
      lastActivity: "Seneste aktivitet",
    },
    controls: {
      tabActive: "Aktive",
      tabReplied: "Har svaret",
      tabWon: "Vundet",
      tabHeld: "På hold",
      tabLost: "Tabt",
      searchPlaceholder: "Søg i leads…",
      searchAria: "Søg i leads",
    },
    addLead: {
      trigger: "Tilføj lead",
      title: "Tilføj lead",
      name: "Navn",
      email: "E-mail",
      phone: "Telefon (valgfrit)",
      source: "Kilde",
      notes: "Noter (valgfrit)",
      notesPlaceholder: "Private noter, som lægges ind i hvert AI-udkast for dette lead.",
      submit: "Tilføj lead",
      submitting: "Tilføjer…",
      saveError: "Vi kunne ikke gemme dette lead. Tjek din forbindelse og prøv igen.",
      added: "Lead tilføjet",
    },
    status: {
      identified: "Identificeret",
      call_booked: "Samtale booket",
      no_show: "Udeblevet",
      call_completed: "Gennemført samtale",
      in_sequence: "I forløb",
      replied: "Har svaret",
      converted: "Konverteret",
      lost: "Tabt",
      unsubscribed: "Afmeldt",
      do_not_contact: "Kontakt ikke",
      bounced: "Afvist",
    },
    profile: {
      backToLeads: "Tilbage til leads",
      threadTab: "Tråd",
      timelineTab: "Tidslinje",
      notesTab: "Noter",
      doNotContact: "Kontakt ikke",
      notFoundTitle: "Lead ikke fundet",
      notFoundBody: "Dette lead findes ikke, eller du har ikke adgang til det.",
    },
    stateOverride: {
      trigger: "Opdatér lead-status",
      updateError: "Vi kunne ikke opdatere status.",
      updated: "Status opdateret",
      dncTitle: (name: string) => `Markér ${name} som kontakt ikke?`,
      dncDescription: "Der bliver aldrig sendt flere e-mails til denne adresse.",
      dncCancel: "Annullér",
      dncConfirm: "Markér kontakt ikke",
    },
    liftDnc: {
      lift: "Ophæv",
      title: (name: string) => `Ophæv kontakt ikke for ${name}?`,
      description:
        "Dette lead har tidligere bedt om ikke at blive kontaktet. Ophæv kun dette flag, hvis de udtrykkeligt har sagt ja til at blive kontaktet igen. Deres tilstand nulstilles til Identificeret, så du kan tage fornyet kontakt til dem som et nyt lead.",
      cancel: "Annullér",
      confirm: "Ja, ophæv flaget",
      lifting: "Ophæver…",
      success: (name: string) =>
        `${name} kan kontaktes igen — tilstand nulstillet til Identificeret.`,
      error: "Vi kunne ikke ophæve flaget. Prøv igen.",
    },
    deleteLead: {
      trigger: "Slet lead",
      title: (name: string) => `Slet ${name}?`,
      description:
        "Dette fjerner leadet permanent sammen med hele tidslinjen, udkast, udskrifter og noter. Det kan ikke fortrydes.",
      cancel: "Annullér",
      confirm: "Slet lead",
      deleting: "Sletter…",
      error: "Vi kunne ikke slette dette lead. Prøv igen.",
      success: (name: string) => `${name} slettet`,
    },
    notes: {
      label: "Private noter, som lægges ind i hvert AI-udkast for dette lead.",
      saveError: "Vi kunne ikke gemme noterne. Dine ændringer er her stadig — prøv igen.",
      savedAt: (time: string) => `Gemt ${time}`,
    },
    timeline: {
      emptyTitle: "Ingen aktivitet endnu",
      emptyBody:
        "Begivenheder dukker op her, efterhånden som forløbet skrider frem — e-mails sendt, svar modtaget, tilstandsændringer.",
      stateChanged: (to: string, from?: string) =>
        `Tilstand ændret${from ? ` fra ${from}` : ""} til ${to}`,
      stateChangedUnknown: "ukendt",
      noteAdded: "Note tilføjet",
      emailSent: "E-mail sendt",
      emailOpened: "E-mail åbnet",
      replied: "Lead svarede",
      converted: "Konverteret til klient",
    },
    sequenceStatus: {
      heading: "Forløb",
      stepsOf: (total: number) => `${total} af ${total} trin`,
      stepOf: (current: number, total: number) => `Trin ${current} af ${total}`,
      statusLabel: "Status",
      nextSend: "Næste afsendelse",
      complete: "Færdigt",
      paused: "Sat på pause",
      stopped: "Stoppet",
      onHold: "På hold",
      stepLabel: (index: number) => `Trin ${index}`,
      startError: "Vi kunne ikke starte forløbet. Prøv igen.",
      started: "Intake-forløb startet.",
      start: "Start intake-forløb",
      starting: "Starter…",
      startAria: "Start intake-forløb",
    },
    summary: {
      cardAria: "AI-beskrivelse af lead",
      heading: "Lead-beskrivelse",
      empty: "Ingen lead-beskrivelse endnu. Lav et udkast for at opbygge kontekst.",
      editAria: "Redigér AI-beskrivelse af lead",
      editClickAria: "Klik for at redigere AI-beskrivelse af lead",
      cancel: "Annullér",
      save: "Gem",
      saveError: "Vi kunne ikke gemme dine ændringer. Prøv igen.",
      editedByYou: "Redigeret af dig",
      aiWritten: "Skrevet af AI'en",
    },
    generate: {
      idle: "Lav udkast",
      generating: "Laver udkast …",
      genFailed: "Udkastet kunne ikke laves. Prøv igen.",
      ready: "Udkast klar — se det nedenfor.",
      timeout: "Laver stadig — opdatér køen om et øjeblik.",
      failedFallback: "Kunne ikke laves. Prøv igen.",
      networkError: "Netværksfejl. Prøv igen.",
    },
    drafts: {
      heading: "Udkast til gennemsyn",
      aria: "Udkast til gennemsyn",
    },
    callOutcome: {
      sectionAria: "Samtaleresultat",
      awaitingHeading: "Afventer dit resultat",
      thresholdBody:
        " — din klients første 48 timer, bygget ud fra din salgssamtale.",
      thresholdTitle: "The Threshold Experience",
      bookACall: "Book en samtale",
    },
    emailThread: {
      loadError: "Vi kunne ikke hente e-mails. Tjek din Gmail-forbindelse under Indstillinger.",
      empty: "Ingen e-mails endnu.",
    },
    transcript: {
      heading: "Samtaleudskrift",
      latestCall: "Seneste samtale",
      totalOnFile: (total: number) => ` · ${total} i alt på fil`,
      collapse: "Fold sammen",
      expand: "Fold ud",
      deleteLatestAria: "Slet seneste udskrift",
      usesLatest:
        "Udkast bruger denne seneste samtale. Tidligere samtaler bliver liggende på fil til opsummerende opfølgninger.",
      addNewCall: "Tilføj ny samtale",
      showEarlier: (count: number) =>
        `Vis ${count} tidligere ${count === 1 ? "samtale" : "samtaler"}`,
      hideEarlier: (count: number) =>
        `Skjul ${count} tidligere ${count === 1 ? "samtale" : "samtaler"}`,
      deleteRowAria: (date: string) => `Slet udskrift fra ${date}`,
      placeholder: "Indsæt udskriftstekst eller upload en .txt-fil …",
      cancel: "Annullér",
      uploadTxt: "Upload .txt-fil",
      save: "Gem udskrift",
      saving: "Gemmer …",
      saveError: "Vi kunne ikke gemme udskriften. Prøv igen.",
      deleteError: "Vi kunne ikke slette udskriften. Prøv igen.",
      deleted: "Udskrift slettet",
      deleteTitleLatest: "Slet den seneste udskrift?",
      deleteTitleThis: "Slet denne udskrift?",
      deleteCancel: "Annullér",
      deleteConfirm: "Slet udskrift",
      deleting: "Sletter …",
      deleteBody: (
        date: string,
        opts: { isLatest: boolean; hasPrior: boolean }
      ) =>
        `Dette fjerner permanent udskriften fra ${date}. ${
          opts.isLatest && opts.hasPrior
            ? "Den næst-nyeste samtale bliver den seneste og driver fremtidige udkast."
            : opts.isLatest
              ? "Der vil ikke være flere udskrifter på dette lead."
              : "Udkast bliver ikke påvirket — de bruger allerede den seneste samtale."
        } Det kan ikke fortrydes.`,
    },
  },
});
