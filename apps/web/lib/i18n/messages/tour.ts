import { defineMessages } from "./util";

/** The product tour / spotlight walkthrough chrome, controls and per-step copy.
 * Step title/body are keyed by the TourStep `id` in lib/tour/steps.ts (which
 * keeps only the structural config); the overlay resolves them by id. */
export const tour = defineMessages({
  en: {
    launcher: "Take a tour",
    preparingDemo: "Preparing your demo lead…",
    stepLabel: (current: number, total: number) => `Step ${current} of ${total}`,
    closeTour: "Close tour",
    skipTour: "Skip tour",
    back: "Back",
    next: "Next",
    finish: "Finish",
    nextChapter: "Next chapter →",
    seedFailed: "Couldn't load the demo lead, showing the rest of the tour.",
    steps: {
      welcome: {
        title: "Welcome to The Client Architecture",
        body: "This is where every lead from your sales calls turns into perfectly-timed, in-your-voice follow-up. Take two minutes and I'll show you how the pieces fit together.",
      },
      sidebar: {
        title: "Everything lives in the sidebar",
        body: "Dashboard is your daily overview. Leads is your pipeline. Drafts is your approval queue. Calls is where you log how each booked call went. Click any item to jump there.",
      },
      "dashboard-cards": {
        title: "Your day, at a glance",
        body: "The dashboard surfaces what needs you first, how many leads are in flight and how many drafts are waiting for a yes. Nothing important slips while you're heads-down with clients.",
      },
      "goto-leads": {
        title: "Let's look at a lead",
        body: "Click Leads in the sidebar to open your pipeline.",
      },
      "leads-table": {
        title: "Every lead lands here",
        body: "Leads flow in automatically from your calendar and calls. Each row shows their stage at a glance. I've added a demo lead, Alex Rivera, so you can see a full profile. Let's open it.",
      },
      "lead-description": {
        title: "The AI keeps a living description",
        body: "This description is written and re-written automatically, from the call transcript, every email reply, and each new signal. You never update it by hand; it's always current when you open the lead.",
      },
      "generate-draft": {
        title: "Need a message now? Make a draft",
        body: "Most follow-ups are generated for you on a schedule, but any time you want one, hit Generate draft and the AI writes it in your voice from everything it knows about this lead.",
      },
      "lead-draft": {
        title: "Review, tweak, and approve",
        body: "Here's a draft the AI already wrote for Alex, in your voice. Read it, edit inline if you'd like, then Approve to send, or Hold to park it. Tip: press A to approve, H to hold. Try approving this one.",
      },
      sequence: {
        title: "The follow-up runs on rails",
        body: "Every lead is enrolled in a sequence, a timed series of touchpoints. This panel shows which message is next and when it sends, so nothing is ever forgotten. You can pause, restart, or override the stage here.",
      },
      "lead-tabs": {
        title: "The full picture, in one place",
        body: "Their entire email conversation lives here, synced live through Gmail, so replies land automatically and feed the next draft. Alongside it: a complete activity timeline, and a private Notes tab only you ever see.",
      },
      "goto-drafts": {
        title: "Your approval queue",
        body: "Scheduled follow-ups collect in one place. Click Drafts in the sidebar.",
      },
      "drafts-queue": {
        title: "One queue, one keystroke each",
        body: "Every scheduled message across all your leads surfaces here 24 hours before it sends, like Alex's next touchpoint. Fly through them with A to approve, S to skip, H to hold, or edit any draft first. (If you already approved Alex's, it's on its way.)",
      },
      "goto-calls": {
        title: "After the call",
        body: "Click Calls in the sidebar, this is the one bit of upkeep the system asks of you.",
      },
      calls: {
        title: "Log each call in one tap",
        body: "After every booked call, tell the system how it went, converted, no-show, or not yet. That single tap decides whether the lead keeps getting nurtured or graduates to a client.",
      },
      "goto-settings": {
        title: "Make it sound like you",
        body: "Last stop. Click Settings in the sidebar.",
      },
      settings: {
        title: "Your voice, your rules",
        body: "You set most of this up during onboarding, but everything stays changeable. Let me point out where each piece lives, for the day you want to adjust something.",
      },
      "settings-notifications": {
        title: "Choose where we ping you",
        body: "When a draft is ready or a lead replies, you get a heads-up. Decide here which alerts reach you and where, email, Slack, or WhatsApp, so the system finds you where you actually look.",
      },
      "settings-autonomous": {
        title: "Decide how much runs on its own",
        body: "The trust dial. Approve every draft yourself, let unreviewed drafts send themselves after their 24-hour window, or go fully hands-off. You picked a mode during onboarding, and this is where you change your mind as trust grows.",
      },
      "settings-voice": {
        title: "Your voice profile lives here",
        body: "Everything the AI writes is shaped by this: your tone, your go-to phrases, and real examples of how you write. It was built during onboarding, but it isn't locked, if your style evolves or something reads off, adjust it here.",
      },
      "voice-refine": {
        title: "It learns when a draft sounds off",
        body: "The AI writes in your voice, and it keeps getting closer. If a draft ever sounds slightly not-you, paste it here with a quick note on what's wrong. It turns that into a rule every future draft follows, so it sounds more like you the more you use it.",
      },
      "settings-sales": {
        title: "How you sell, on record",
        body: "Your sales approach, your programs and pricing, and how you bridge objections. When a lead hesitates, the AI draws on all of this to respond the way you would. Keep it current whenever your offers change.",
      },
      "settings-calendar": {
        title: "Where new leads come from",
        body: "Your booking calendar feeds leads in automatically the moment a call is booked. If you ever switch booking tools, or a connection needs a nudge, this is where you fix it.",
      },
      "settings-integrations": {
        title: "One glance at the plumbing",
        body: "Gmail sends every follow-up as you and pulls replies back in. This panel shows the health of each connection, and if anything ever shows as disconnected, one click here brings it back.",
      },
      feedback: {
        title: "This megaphone shapes the product",
        body: "One last thing, and it matters. This button follows you on every page. Something confusing, broken, or brilliant? Open it, write a line or two, hit send. It lands directly with us, along with the page you were on. It's the fastest way to make this fit you better, so use it freely.",
      },
      done: {
        title: "That's the whole tour",
        body: "You've seen the loop: leads arrive, the AI drafts in your voice, you approve, and calls get logged. You can replay this tour any time from the sidebar. Now go turn conversations into clients.",
      },
    } as Record<string, { title: string; body: string }>,
  },
  da: {
    launcher: "Tag en rundvisning",
    preparingDemo: "Gør dit demo-lead klar…",
    stepLabel: (current: number, total: number) => `Trin ${current} af ${total}`,
    closeTour: "Luk rundvisningen",
    skipTour: "Spring rundvisningen over",
    back: "Tilbage",
    next: "Videre",
    finish: "Færdig",
    nextChapter: "Næste kapitel →",
    seedFailed: "Vi kunne ikke hente demo-leadet — du får resten af rundvisningen.",
    steps: {
      welcome: {
        title: "Velkommen til The Client Architecture",
        body: "Det er her, hvert lead fra dine salgssamtaler bliver til opfølgning, der rammer på det helt rigtige tidspunkt og lyder som dig. Giv mig to minutter, så viser jeg dig, hvordan brikkerne spiller sammen.",
      },
      sidebar: {
        title: "Alt bor i menuen",
        body: "Overblik er dit daglige udgangspunkt. Leads er din pipeline. Udkast er din godkendelseskø. Samtaler er der, hvor du noterer, hvordan hver booket samtale gik. Klik på et punkt for at hoppe derhen.",
      },
      "dashboard-cards": {
        title: "Din dag på ét blik",
        body: "Overblikket viser dig først det, der har brug for dig, hvor mange leads der er i gang, og hvor mange udkast der venter på et ja. Intet vigtigt smutter, mens du er fordybet i dine klienter.",
      },
      "goto-leads": {
        title: "Lad os kigge på et lead",
        body: "Klik på Leads i menuen for at åbne din pipeline.",
      },
      "leads-table": {
        title: "Alle leads lander her",
        body: "Leads kommer ind automatisk fra din kalender og dine samtaler. Hver række viser deres stadie med det samme. Jeg har lagt et demo-lead ind, Alex Rivera, så du kan se en fuld profil. Lad os åbne den.",
      },
      "lead-description": {
        title: "AI'en holder en levende beskrivelse",
        body: "Beskrivelsen skrives og skrives om helt automatisk, ud fra samtaleudskriften, hvert svar på mail og hvert nyt signal. Du opdaterer den aldrig i hånden — den er altid opdateret, når du åbner leadet.",
      },
      "generate-draft": {
        title: "Brug for en besked nu? Lav et udkast",
        body: "De fleste opfølgninger bliver lavet for dig efter en plan, men når som helst du vil have en, trykker du på Lav udkast, og AI'en skriver den i din stemme ud fra alt, den ved om dette lead.",
      },
      "lead-draft": {
        title: "Gennemgå, justér og godkend",
        body: "Her er et udkast, AI'en allerede har skrevet til Alex i din stemme. Læs det, redigér direkte hvis du vil, og tryk så Godkend for at sende, eller Sæt på hold for at parkere det. Tip: tryk A for at godkende, H for at sætte på hold. Prøv at godkende dette.",
      },
      sequence: {
        title: "Opfølgningen kører på skinner",
        body: "Hvert lead er sat på et forløb, en tidsstyret række af kontaktpunkter. Panelet her viser, hvilken besked der er den næste, og hvornår den sendes, så intet bliver glemt. Du kan sætte på pause, starte forfra eller ændre stadiet her.",
      },
      "lead-tabs": {
        title: "Hele billedet ét sted",
        body: "Hele deres mailkorrespondance ligger her, synkroniseret live via Gmail, så svar lander automatisk og føder det næste udkast. Ved siden af: en komplet aktivitetstidslinje og en privat Noter-fane, kun du kan se.",
      },
      "goto-drafts": {
        title: "Din godkendelseskø",
        body: "Planlagte opfølgninger samler sig ét sted. Klik på Udkast i menuen.",
      },
      "drafts-queue": {
        title: "Én kø, ét tastetryk hver",
        body: "Hver planlagt besked på tværs af alle dine leads dukker op her 24 timer før, den sendes, som Alex' næste kontaktpunkt. Flyv igennem dem med A for at godkende, S for at springe over, H for at sætte på hold, eller redigér et udkast først. (Har du allerede godkendt Alex', er den på vej.)",
      },
      "goto-calls": {
        title: "Efter samtalen",
        body: "Klik på Samtaler i menuen — det er den ene ting, systemet beder dig om at holde ved lige.",
      },
      calls: {
        title: "Notér hver samtale med ét tryk",
        body: "Efter hver booket samtale fortæller du systemet, hvordan det gik, konverteret, udeblevet eller ikke endnu. Det ene tryk afgør, om leadet bliver ved med at blive fulgt op, eller om det bliver til en klient.",
      },
      "goto-settings": {
        title: "Få det til at lyde som dig",
        body: "Sidste stop. Klik på Indstillinger i menuen.",
      },
      settings: {
        title: "Din stemme, dine regler",
        body: "Det meste her satte du op under opsætningen, men alt kan ændres. Lad mig vise dig, hvor hver del bor, til den dag du vil justere noget.",
      },
      "settings-notifications": {
        title: "Vælg, hvor vi giver dig besked",
        body: "Når et udkast er klar, eller et lead svarer, får du besked. Her bestemmer du, hvilke beskeder der når dig, og hvor, mail, Slack eller WhatsApp, så systemet fanger dig der, hvor du faktisk kigger.",
      },
      "settings-autonomous": {
        title: "Bestem, hvor meget der kører af sig selv",
        body: "Tillidsknappen. Godkend hvert udkast selv, lad ugennemsete udkast sende sig selv efter deres 24-timers vindue, eller slip tøjlerne helt. Du valgte en tilstand under opsætningen, og det er her, du ombestemmer dig, efterhånden som tilliden vokser.",
      },
      "settings-voice": {
        title: "Din stemmeprofil bor her",
        body: "Alt, hvad AI'en skriver, er formet af det her: din tone, dine faste vendinger og rigtige eksempler på, hvordan du skriver. Den blev bygget under opsætningen, men den er ikke låst, udvikler din stil sig, eller lyder noget forkert, justerer du den her.",
      },
      "voice-refine": {
        title: "Den lærer, når et udkast lyder forkert",
        body: "AI'en skriver i din stemme, og den rammer tættere og tættere. Hvis et udkast nogensinde lyder en anelse ikke-dig, indsæt det her med en kort note om, hvad der er galt. Den laver det om til en regel, som alle fremtidige udkast følger, så det lyder mere som dig, jo mere du bruger det.",
      },
      "settings-sales": {
        title: "Sådan sælger du, sort på hvidt",
        body: "Din salgstilgang, dine programmer og priser, og hvordan du bygger bro over indvendinger. Når et lead tøver, trækker AI'en på alt det her for at svare, som du ville gøre det. Hold det opdateret, når dine tilbud ændrer sig.",
      },
      "settings-calendar": {
        title: "Her kommer nye leads fra",
        body: "Din bookingkalender sender leads ind automatisk, i samme øjeblik en samtale bliver booket. Skifter du bookingværktøj, eller skal en forbindelse have et puf, er det her, du ordner det.",
      },
      "settings-integrations": {
        title: "Ét blik på maskinrummet",
        body: "Gmail sender hver opfølgning som dig og henter svar tilbage ind. Panelet her viser, hvordan hver forbindelse har det, og står noget som afbrudt, henter ét klik den tilbage.",
      },
      feedback: {
        title: "Megafonen her former produktet",
        body: "Én sidste ting, og den er vigtig. Knappen her følger med dig på alle sider. Noget forvirrende, noget i stykker eller noget genialt? Åbn den, skriv et par linjer og send. Det lander direkte hos os, sammen med hvilken side du stod på. Det er den hurtigste vej til, at det her passer bedre til dig, så brug den flittigt.",
      },
      done: {
        title: "Det var hele rundvisningen",
        body: "Du har set kredsløbet: leads kommer ind, AI'en skriver udkast i din stemme, du godkender, og samtaler bliver noteret. Du kan altid tage rundvisningen igen fra menuen. Gå nu ud og lav samtaler om til klienter.",
      },
    } as Record<string, { title: string; body: string }>,
  },
});
