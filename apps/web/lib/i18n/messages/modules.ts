import { defineMessages } from "./util";

/**
 * Module 2/3 lock + sell screens (The Threshold Experience, The Continuation).
 *
 * These are premium upsell/sell pages. The Danish is idiomatic and evocative,
 * NOT a literal translation — read the English for meaning and phrase it the
 * way a Dane actually would (du-form). The product NAMES ("The Threshold
 * Experience", "The Continuation") are kept in English as brand titles; the
 * surrounding copy is fully translated.
 */
export const modules = defineMessages({
  en: {
    // Shared chrome across both sell pages
    shared: {
      howItWorksHeading: "How it works",
      pickTime: "Pick a time that works.",
      talkFirst: "Talk to Daniel first →",
      bookIntro: "Book your intro call",
    },

    threshold: {
      eyebrow: "Module 2",
      title: "The Threshold Experience",
      tagline: "your client's first 48 hours, built from your sales call.",
      whatItIs: {
        heading: "The moment that determines everything",
        p1: "Most coaches have a great sales call. Then their client goes quiet for 48 hours, and the doubt sets in. That silence is expensive, it's where momentum dies and refund requests are born.",
        p2: "The Threshold Experience closes that gap. Using the transcript and notes from your sales call, we craft a sequence of highly personalised touchpoints, delivered in your voice, that welcome your client across the threshold and into the work.",
        p3: "By the time they show up to session one, they're not just enrolled. They're activated.",
      },
      howItWorks: {
        step1Title: "Your call ends",
        step1Body:
          "We ingest the transcript, surface the key commitments your client made, and identify the emotional tone they entered the relationship with.",
        step2Title: "We craft 48 hours of touchpoints",
        step2Body:
          "Emails, follow-ups, and micro-moments, sequenced and written in your exact voice, arrive at precisely the right intervals.",
        step3Title: "Your client crosses the threshold",
        step3Body:
          "Onboarded, oriented, and certain. They arrive to session one already aligned with the transformation they signed up for.",
      },
      whyItMatters: {
        heading: "The cost of a cold first 48 hours",
        stat: "68%",
        statLabel: "of buyer's remorse surfaces in 48h",
        body: "The first two days after a coaching sale are the highest-risk window in the entire engagement. A client who feels unseen or unguided will quietly begin to second-guess their decision, and that doubt compounds. The Threshold Experience doesn't just prevent churn; it accelerates the transformation they paid for, making every subsequent session more effective.",
      },
      socialProof: {
        quote:
          "I used to dread the post-call silence. Now my clients feel held from the first hour. Session one is completely different.",
        attribution: "Early access coach, name to be confirmed before launch",
      },
      cta: {
        headline: "Book your intro call",
      },
      mailSubject: "The Threshold Experience",
      metaTitle: "The Threshold Experience, The Client Architecture",
    },

    continuation: {
      eyebrow: "Module 3",
      title: "The Continuation",
      tagline: "thirty days before they leave, we remind them why they stayed.",
      whatItIs: {
        heading: "The renewal window no one is watching",
        p1: "Thirty days before a coaching engagement ends, most clients quietly begin disengaging, not because the work wasn't valuable, but because no one helped them articulate its value back to themselves.",
        p2: "The Continuation monitors that window. Drawing on everything we know about your client, their goals, their language, their breakthrough moments, we surface the right message at the right time, written in your voice.",
        p3: "Your client renews before they consciously consider not to.",
      },
      howItWorks: {
        step1Title: "Day −30",
        step1Body:
          "The system detects the approaching end of engagement and begins assembling the re-enrollment sequence from your client's history.",
        step2Title: "We surface the reason they stayed",
        step2Body:
          "From prior call transcripts and engagement signals, we identify the transformation your client most values, and reflect it back to them.",
        step3Title: "They renew",
        step3Body:
          "Before the doubt window even opens, your client has already reconnected with why this work matters. The conversation about continuing is easy.",
      },
      whyItMatters: {
        heading: "The compounding cost of silent endings",
        stat: "3×",
        statLabel: "easier to retain than to re-acquire",
        body: "Acquiring a new coaching client costs three times what it costs to retain an existing one, yet most coaches invest all their energy in the front end of the relationship and almost none in the back end. The Continuation rebalances that equation: it protects your revenue, deepens your impact, and turns endings into beginnings.",
      },
      socialProof: {
        quote:
          "A client renewed who I was certain was finished. I hadn't sent anything, the system had. That was the moment I understood what this is.",
        attribution: "Early access coach, name to be confirmed before launch",
      },
      cta: {
        headline: "Book your intro call",
      },
      mailSubject: "The Continuation",
      metaTitle: "The Continuation, The Client Architecture",
    },
  },

  da: {
    shared: {
      howItWorksHeading: "Sådan fungerer det",
      pickTime: "Vælg et tidspunkt, der passer dig.",
      talkFirst: "Tal med Daniel først →",
      bookIntro: "Book din introsamtale",
    },

    threshold: {
      eyebrow: "Modul 2",
      title: "The Threshold Experience",
      tagline: "din klients første 48 timer, bygget ud fra din salgssamtale.",
      whatItIs: {
        heading: "Øjeblikket, der afgør det hele",
        p1: "De fleste coaches har en god salgssamtale. Så bliver klienten tavs i 48 timer, og tvivlen sniger sig ind. Den stilhed er dyr — det er dér, momentum dør, og ønsket om pengene tilbage bliver født.",
        p2: "The Threshold Experience lukker det hul. Ud fra udskriften og noterne fra din salgssamtale bygger vi et forløb af nøje personlige kontaktpunkter — leveret i din stemme — der byder din klient velkommen over tærsklen og ind i arbejdet.",
        p3: "Når de møder op til session ét, er de ikke bare tilmeldt. De er tændt.",
      },
      howItWorks: {
        step1Title: "Din samtale slutter",
        step1Body:
          "Vi henter udskriften ind, finder de vigtigste løfter, din klient gav, og aflæser den følelse, de trådte ind i relationen med.",
        step2Title: "Vi bygger 48 timers kontaktpunkter",
        step2Body:
          "E-mails, opfølgninger og små øjeblikke — sat i rækkefølge og skrevet i præcis din stemme — lander på de helt rigtige tidspunkter.",
        step3Title: "Din klient krydser tærsklen",
        step3Body:
          "Ombord, på plads og sikker i sagen. De ankommer til session ét allerede afstemt med den forandring, de sagde ja til.",
      },
      whyItMatters: {
        heading: "Prisen for kolde første 48 timer",
        stat: "68%",
        statLabel: "af købstvivlen dukker op inden for 48 timer",
        body: "De første to dage efter et coaching-salg er hele forløbets mest sårbare vindue. En klient, der føler sig overset eller uden retning, begynder stille at tvivle på sin beslutning — og tvivlen vokser. The Threshold Experience forhindrer ikke bare frafald; den fremskynder den forandring, de har betalt for, og gør hver eneste session bagefter mere effektiv.",
      },
      socialProof: {
        quote:
          "Jeg plejede at frygte stilheden efter samtalen. Nu føler mine klienter sig holdt fra første time. Session ét er noget helt andet.",
        attribution: "Early access-coach, navn bekræftes inden lancering",
      },
      cta: {
        headline: "Book din introsamtale",
      },
      mailSubject: "The Threshold Experience",
      metaTitle: "The Threshold Experience, The Client Architecture",
    },

    continuation: {
      eyebrow: "Modul 3",
      title: "The Continuation",
      tagline: "tredive dage før de går, minder vi dem om, hvorfor de blev.",
      whatItIs: {
        heading: "Fornyelsesvinduet, ingen holder øje med",
        p1: "Tredive dage før et coaching-forløb slutter, begynder de fleste klienter stille at koble fra — ikke fordi arbejdet ikke var værdifuldt, men fordi ingen hjalp dem med at sætte ord på værdien over for sig selv.",
        p2: "The Continuation holder øje med netop det vindue. Ud fra alt, hvad vi ved om din klient — deres mål, deres sprog, deres gennembrud — finder vi den rigtige besked på det rigtige tidspunkt, skrevet i din stemme.",
        p3: "Din klient fornyer, før de bevidst overvejer at lade være.",
      },
      howItWorks: {
        step1Title: "Dag −30",
        step1Body:
          "Systemet opdager, at forløbet nærmer sig sin slutning, og begynder at samle fornyelsesforløbet ud fra din klients historik.",
        step2Title: "Vi finder grunden til, at de blev",
        step2Body:
          "Ud fra tidligere udskrifter og signaler om engagement finder vi den forandring, din klient sætter højest, og spejler den tilbage til dem.",
        step3Title: "De fornyer",
        step3Body:
          "Før tvivlsvinduet overhovedet åbner, har din klient allerede genfundet, hvorfor arbejdet betyder noget. Samtalen om at fortsætte bliver let.",
      },
      whyItMatters: {
        heading: "Den voksende pris for tavse afslutninger",
        stat: "3×",
        statLabel: "lettere at fastholde end at vinde på ny",
        body: "At vinde en ny coaching-klient koster tre gange så meget som at fastholde en, du allerede har — alligevel lægger de fleste coaches al deres energi i begyndelsen af relationen og næsten ingen i slutningen. The Continuation retter op på den ubalance: den beskytter din omsætning, uddyber din effekt og gør afslutninger til nye begyndelser.",
      },
      socialProof: {
        quote:
          "En klient, jeg var sikker på var færdig, fornyede. Jeg havde ikke sendt noget — det havde systemet. Det var i det øjeblik, jeg forstod, hvad det her er.",
        attribution: "Early access-coach, navn bekræftes inden lancering",
      },
      cta: {
        headline: "Book din introsamtale",
      },
      mailSubject: "The Continuation",
      metaTitle: "The Continuation, The Client Architecture",
    },
  },
});
