/**
 * Landing page copy, per locale. The .com serves English, the .dk serves
 * Danish (middleware rewrites / → /da on the .dk host). Danish follows the
 * register in lib/i18n/GLOSSARY.md: du-form, idiomatic, no calques.
 */

export type TLandingHeroCopy = {
  ghostLine1: string;
  ghostLine2: string;
  /** Screen-reader-only first sentence of the H1 (matches the ghost headline). */
  srTitle: string;
  /** Visible remainder of the H1. */
  title: string;
  sub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  login: string;
  hint: string;
  canvasAria: string;
};

export type TLandingCard = { tag: string; body: string };
export type TLandingNumber = { figure: string; heading: string; body: string };
export type TLandingStep = { no: string; heading: string; body: string };
export type TLandingModule = {
  tag: string;
  heading: string;
  body: string;
  cta?: string;
};

export type TLandingCopy = {
  metaTitle: string;
  metaDescription: string;
  hero: TLandingHeroCopy;
  promise: {
    displayLine1: string;
    displayLine2: string;
    lede: string;
    cards: TLandingCard[];
  };
  numbers: {
    displayLine1: string;
    displayLine2: string;
    rows: TLandingNumber[];
  };
  day: {
    displayLine1: string;
    displayLine2: string;
    steps: TLandingStep[];
    figureAlt: string;
    coda: string;
  };
  modules: {
    displayLine1: string;
    displayLine2: string;
    sub: string;
    items: TLandingModule[];
  };
  final: {
    displayLine1: string;
    displayLine2: string;
    subBeforeEm: string;
    subEm: string;
    subAfterEm: string;
    kicker: string;
    cta: string;
    mailtoSubject: string;
    privacy: string;
  };
};

export const landingCopy: Record<"en" | "da", TLandingCopy> = {
  en: {
    metaTitle: "The Client Architecture",
    metaDescription:
      "Every sales call, followed through in your voice. AI follow-up for coaching businesses.",
    hero: {
      ghostLine1: "Leads",
      ghostLine2: "don’t die",
      srTitle: "Leads don’t die.",
      title: "They get abandoned.",
      sub: "You already paid for them: the ads, the content, the call itself. Then the week gets loud, the follow-up slips, and a yes becomes a stranger. We write the follow-up in your voice, wait for your nod, and send it from your own inbox. Every call. Every time.",
      ctaPrimary: "Book a call",
      ctaSecondary: "See the system",
      login: "Login",
      hint: "Scroll",
      canvasAria:
        "A laptop resting on a branch; its interface lifts off the screen as you scroll",
    },
    promise: {
      displayLine1: "The call is",
      displayLine2: "the easy part.",
      lede: "You’re not bad at follow-up. You’re a coach. Nobody signed up to spend Sunday night writing “just checking in” emails. So we built the part of the job you never applied for.",
      cards: [
        {
          tag: "01 · The draft",
          body: "The system reads the call. Not a form you fill out, but the actual transcript. Within the day, the follow-up exists, written in the voice we studied from your real emails. Leads can’t tell the difference, because there isn’t one.",
        },
        {
          tag: "02 · The nod",
          body: "Every draft lands in front of you a full day before it sends, on WhatsApp, Slack, email, or the dashboard. Approve it in one tap. Or flip on autopilot and never look at it again.",
        },
        {
          tag: "03 · The send",
          body: "It goes out from your own Gmail, like every email you’ve ever sent. Because technically, it is one. No platform. No noreply@. Nothing between you and the person who almost said yes.",
        },
      ],
    },
    numbers: {
      displayLine1: "The math you",
      displayLine2: "actually care about",
      rows: [
        {
          figure: "80%",
          heading: "Of sales take five or more follow-ups",
          body: "And almost every coach quits after one. The gap between the follow-up a lead needs and the one they get is where your revenue quietly leaves.",
        },
        {
          figure: "4–7h",
          heading: "A workday back, every week",
          body: "The writing, the remembering, the guilt: gone. Ask yourself what a full day of your time is worth. Now multiply it by 52.",
        },
        {
          figure: "1–2",
          heading: "Recovered clients, every month",
          body: "Not new leads. Leads you already had, and already paid for with ads, content, and referral goodwill, closed by follow-up that actually happens. At your prices, do that math.",
        },
        {
          figure: "0",
          heading: "Tools for you to learn",
          body: "This is done-for-you, not do-it-yourself. We build your voice model, wire your calendar, connect your Gmail, and run the machine. Your entire job is tapping Approve.",
        },
      ],
    },
    day: {
      displayLine1: "The first",
      displayLine2: "24 hours",
      steps: [
        {
          no: "1",
          heading: "The call ends",
          body: "You said goodbye an hour ago. Somewhere between this client and your next one, the transcript quietly lands.",
        },
        {
          no: "2",
          heading: "The studying",
          body: "Before a word is written, the system reads how you write: your openers, your sign-offs, the words you’d never use. The voice isn’t invented. It’s studied.",
        },
        {
          no: "3",
          heading: "The draft appears",
          body: "A follow-up in your voice, waiting in your queue and on your phone. You read it in the time a coffee takes.",
        },
        {
          no: "4",
          heading: "The nod",
          body: "One tap. It sends from your inbox at the right hour, in the right tone. The lead never knew you had a busy week.",
        },
      ],
      figureAlt:
        "The interface lifting off the laptop screen as layered glass panels",
      coda: "And after that? When they reply, it pauses and drafts your answer. When they no-show, it chases. When they go quiet, it re-engages. Every path a lead can take is already handled.",
    },
    modules: {
      displayLine1: "This is",
      displayLine2: "module one.",
      sub: "The Intake Sequence is where every client relationship begins. It’s not where it ends.",
      items: [
        {
          tag: "Module 1 · Live",
          heading: "The Intake Sequence",
          body: "The follow-up system on this page. Every sales call, followed through in your voice: drafted, approved, sent.",
        },
        {
          tag: "Module 2",
          heading: "The Threshold Experience",
          body: "Your client’s first 48 hours, built from your sales call.",
          cta: "Book a call",
        },
        {
          tag: "Module 3",
          heading: "The Continuation",
          body: "Thirty days before they leave, we remind them why they stayed.",
          cta: "Book a call",
        },
      ],
    },
    final: {
      displayLine1: "You already paid",
      displayLine2: "for these leads.",
      subBeforeEm:
        "You can keep doing follow-up the way you do it now, which, be honest, is ",
      subEm: "sometimes",
      subAfterEm:
        ". Or every lead you ever talk to gets followed up like they’re your only client. In your voice. On time. Forever. The next call you finish is the first one we follow.",
      kicker: "Let’s go collect them.",
      cta: "Book a call",
      mailtoSubject: "The Client Architecture: Book a call",
      privacy: "Privacy",
    },
  },
  da: {
    metaTitle: "The Client Architecture",
    metaDescription:
      "Hver salgssamtale, fulgt til dørs med din stemme. AI-opfølgning for coaching-forretninger.",
    hero: {
      ghostLine1: "Leads",
      ghostLine2: "dør ikke",
      srTitle: "Leads dør ikke.",
      title: "De bliver opgivet.",
      sub: "Du har allerede betalt for dem: annoncerne, indholdet, selve samtalen. Så bliver ugen travl, opfølgningen glider, og et ja bliver til en fremmed. Vi skriver opfølgningen med din stemme, venter på dit nik og sender den fra din egen indbakke. Hver samtale. Hver gang.",
      ctaPrimary: "Book en samtale",
      ctaSecondary: "Se systemet",
      login: "Log ind",
      hint: "Scroll",
      canvasAria:
        "En bærbar på en gren; interfacet løfter sig fra skærmen, mens du scroller",
    },
    promise: {
      displayLine1: "Samtalen er",
      displayLine2: "den nemme del.",
      lede: "Du er ikke dårlig til opfølgning. Du er coach. Ingen har meldt sig til at bruge søndag aften på at skrive »jeg ville lige høre«-mails. Så vi byggede den del af jobbet, du aldrig søgte.",
      cards: [
        {
          tag: "01 · Udkastet",
          body: "Systemet læser samtalen. Ikke en formular, du udfylder, men det, der faktisk blev sagt. Inden dagen er omme, ligger opfølgningen klar, skrevet med den stemme, vi har lært af dine rigtige mails. Leads kan ikke se forskellen, for der er ingen.",
        },
        {
          tag: "02 · Nikket",
          body: "Hvert udkast lander foran dig et helt døgn før det sendes, på WhatsApp, Slack, e-mail eller i appen. Godkend med ét tryk. Eller slå autopiloten til, og se aldrig på det igen.",
        },
        {
          tag: "03 · Afsendelsen",
          body: "Den sendes fra din egen Gmail, som enhver anden mail, du nogensinde har sendt. For teknisk set er det én. Ingen platform. Ingen noreply@. Intet mellem dig og personen, der næsten sagde ja.",
        },
      ],
    },
    numbers: {
      displayLine1: "Regnestykket du",
      displayLine2: "faktisk går op i",
      rows: [
        {
          figure: "80%",
          heading: "Af alle salg kræver fem eller flere opfølgninger",
          body: "Og næsten alle coaches stopper efter én. Hullet mellem den opfølgning, et lead har brug for, og den, de får, er dér, hvor din omsætning stille forsvinder.",
        },
        {
          figure: "4–7t",
          heading: "En arbejdsdag tilbage, hver uge",
          body: "Skrivningen, huskeriet, den dårlige samvittighed: væk. Spørg dig selv, hvad en hel dag af din tid er værd. Gang det så med 52.",
        },
        {
          figure: "1–2",
          heading: "Genvundne klienter, hver måned",
          body: "Ikke nye leads. Leads, du allerede havde og allerede har betalt for med annoncer, indhold og anbefalinger, lukket af opfølgning, der faktisk sker. Regn selv efter med dine priser.",
        },
        {
          figure: "0",
          heading: "Værktøjer du skal lære",
          body: "Det her er done-for-you, ikke gør-det-selv. Vi bygger din stemmemodel, kobler din kalender, forbinder din Gmail og driver maskinen. Hele dit job er at trykke Godkend.",
        },
      ],
    },
    day: {
      displayLine1: "De første",
      displayLine2: "24 timer",
      steps: [
        {
          no: "1",
          heading: "Samtalen slutter",
          body: "Du sagde farvel for en time siden. Et sted mellem denne klient og din næste lander samtalen stille i systemet.",
        },
        {
          no: "2",
          heading: "Forarbejdet",
          body: "Før der skrives ét ord, læser systemet, hvordan du skriver: dine indledninger, dine afslutninger, ordene du aldrig ville bruge. Stemmen er ikke opfundet. Den er studeret.",
        },
        {
          no: "3",
          heading: "Udkastet lander",
          body: "En opfølgning med din stemme venter i din kø og på din telefon. Du læser den, mens kaffen bliver lavet.",
        },
        {
          no: "4",
          heading: "Nikket",
          body: "Ét tryk. Den sendes fra din indbakke på det rigtige tidspunkt, i den rigtige tone. Leadet opdagede aldrig, at du havde en travl uge.",
        },
      ],
      figureAlt:
        "Interfacet løfter sig fra den bærbares skærm som lag af glaspaneler",
      coda: "Og derefter? Når de svarer, sætter systemet på pause og skriver et udkast til dit svar. Når de udebliver, følger det op. Når de bliver stille, tager det kontakt igen. Enhver vej et lead kan tage, er allerede håndteret.",
    },
    modules: {
      displayLine1: "Det her er",
      displayLine2: "modul ét.",
      sub: "The Intake Sequence er der, hvor enhver klientrelation begynder. Det er ikke der, den slutter.",
      items: [
        {
          tag: "Modul 1 · Live",
          heading: "The Intake Sequence",
          body: "Opfølgningssystemet på denne side. Hver salgssamtale fulgt til dørs med din stemme: skrevet, godkendt, sendt.",
        },
        {
          tag: "Modul 2",
          heading: "The Threshold Experience",
          body: "Din klients første 48 timer, bygget ud fra jeres salgssamtale.",
          cta: "Book en samtale",
        },
        {
          tag: "Modul 3",
          heading: "The Continuation",
          body: "Tredive dage før de smutter, minder vi dem om, hvorfor de blev.",
          cta: "Book en samtale",
        },
      ],
    },
    final: {
      displayLine1: "Du har allerede betalt",
      displayLine2: "for de leads.",
      subBeforeEm:
        "Du kan blive ved med at følge op, som du gør nu, hvilket, helt ærligt, er ",
      subEm: "nogle gange",
      subAfterEm:
        ". Eller også bliver hvert eneste lead, du taler med, fulgt op, som var de din eneste klient. Med din stemme. Til tiden. Altid. Den næste samtale, du afslutter, er den første, vi følger op på.",
      kicker: "Lad os hente dem hjem.",
      cta: "Book en samtale",
      mailtoSubject: "The Client Architecture: Book en samtale",
      privacy: "Privatliv",
    },
  },
};
