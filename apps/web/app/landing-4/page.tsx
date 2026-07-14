import type { Metadata } from "next";
import LandingHero from "./LandingHero";

export const metadata: Metadata = {
  title: "The Client Architecture",
  description:
    "Every sales call, followed through in your voice. AI follow-up for coaching businesses.",
};

export default function LandingPageVariant() {
  return (
    <main className="l4-root">
      <LandingHero />

      {/* /1 — The promise */}
      <section className="l4-section l4-section-promise" id="promise">
        <span className="l4-marker">/1</span>
        <h2 className="l4-display">
          The call is
          <br />
          <span className="l4-display-indent">the easy part.</span>
        </h2>
        <p className="l4-lede">
          You&rsquo;re not bad at follow-up. You&rsquo;re a coach — nobody
          signed up to spend Sunday night writing &ldquo;just checking
          in&rdquo; emails. So we built the part of the job you never applied
          for.
        </p>
        <div className="l4-promise-cards">
          <article className="l4-card">
            <span className="l4-card-no">01 — The draft</span>
            <p>
              The system reads the call. Not a form you fill out — the actual
              transcript. Within the day, the follow-up exists, written in the
              voice we studied from your real emails. Leads can&rsquo;t tell
              the difference, because there isn&rsquo;t one.
            </p>
          </article>
          <article className="l4-card">
            <span className="l4-card-no">02 — The nod</span>
            <p>
              Every draft lands in front of you a full day before it sends —
              on WhatsApp, Slack, email, or the dashboard. Approve it in one
              tap. Or flip on autopilot and never look at it again.
            </p>
          </article>
          <article className="l4-card">
            <span className="l4-card-no">03 — The send</span>
            <p>
              It goes out from your own Gmail, like every email you&rsquo;ve
              ever sent — because technically, it is one. No platform. No
              noreply@. Nothing between you and the person who almost said
              yes.
            </p>
          </article>
        </div>
      </section>

      {/* /2 — What coaches get back */}
      <section className="l4-section l4-section-numbers">
        <span className="l4-marker">/2</span>
        <h2 className="l4-display">
          The math you
          <br />
          <span className="l4-display-indent">actually care about</span>
        </h2>
        <ul className="l4-numbers">
          <li className="l4-number-row">
            <span className="l4-number">80%</span>
            <div className="l4-number-copy">
              <h3>Of sales take five or more follow-ups</h3>
              <p>
                And almost every coach quits after one. That gap — between the
                follow-up a lead needs and the one they get — is where your
                revenue quietly leaves.
              </p>
            </div>
          </li>
          <li className="l4-number-row">
            <span className="l4-number">4–7h</span>
            <div className="l4-number-copy">
              <h3>A workday back, every week</h3>
              <p>
                The writing, the remembering, the guilt — gone. Ask yourself
                what a full day of your time is worth. Now multiply it by
                fifty-two.
              </p>
            </div>
          </li>
          <li className="l4-number-row">
            <span className="l4-number">1–2</span>
            <div className="l4-number-copy">
              <h3>Recovered clients, every month</h3>
              <p>
                Not new leads. Leads you already had — and already paid for
                with ads, content, and referral goodwill — closed by follow-up
                that actually happens. At your prices, do that math.
              </p>
            </div>
          </li>
          <li className="l4-number-row">
            <span className="l4-number">0</span>
            <div className="l4-number-copy">
              <h3>Tools for you to learn</h3>
              <p>
                This is done-for-you, not do-it-yourself. We build your voice
                model, wire your calendar, connect your Gmail, and run the
                machine. Your entire job is tapping Approve.
              </p>
            </div>
          </li>
        </ul>
      </section>

      {/* /3 — The first 24 hours */}
      <section className="l4-section l4-section-day">
        <span className="l4-marker">/3</span>
        <h2 className="l4-display">
          The first
          <br />
          <span className="l4-display-indent">24 hours</span>
        </h2>
        <div className="l4-day-grid">
          <div className="l4-day-col">
            <article className="l4-step">
              <span className="l4-step-no">1</span>
              <h3>The call ends</h3>
              <p>
                You said goodbye an hour ago. Somewhere between this client and
                your next one, the transcript quietly lands.
              </p>
            </article>
            <article className="l4-step">
              <span className="l4-step-no">2</span>
              <h3>The studying</h3>
              <p>
                Before a word is written, the system reads how you write — your
                openers, your sign-offs, the words you&rsquo;d never use. The
                voice isn&rsquo;t invented. It&rsquo;s studied.
              </p>
            </article>
          </div>
          <figure className="l4-day-figure">
            <img
              src="/landing-4/frames/frame-0101.webp"
              alt="The interface lifting off the laptop screen as layered glass panels"
              loading="lazy"
            />
          </figure>
          <div className="l4-day-col">
            <article className="l4-step">
              <span className="l4-step-no">3</span>
              <h3>The draft appears</h3>
              <p>
                A follow-up in your voice, waiting in your queue — and on your
                phone. You read it in the time a coffee takes.
              </p>
            </article>
            <article className="l4-step">
              <span className="l4-step-no">4</span>
              <h3>The nod</h3>
              <p>
                One tap. It sends from your inbox at the right hour, in the
                right tone. The lead never knew you had a busy week.
              </p>
            </article>
          </div>
        </div>
        <p className="l4-day-coda">
          And after that? When they reply, it pauses and drafts your answer.
          When they no-show, it chases. When they go quiet, it re-engages.
          Every path a lead can take is already handled.
        </p>
      </section>

      {/* /4 — The modules */}
      <section className="l4-section-modules">
        <div className="l4-section l4-modules-inner">
          <span className="l4-marker">/4</span>
          <h2 className="l4-display l4-display-cream">
            This is
            <br />
            <span className="l4-display-indent">module one.</span>
          </h2>
          <p className="l4-modules-sub">
            The Intake Sequence is where every client relationship begins.
            It&rsquo;s not where it ends.
          </p>
          <div className="l4-modules-cards">
            <article className="l4-module l4-module-live">
              <span className="l4-module-tag">Module 1 — Live</span>
              <h3>The Intake Sequence</h3>
              <p>
                The follow-up system on this page. Every sales call, followed
                through in your voice — drafted, approved, sent.
              </p>
            </article>
            <article className="l4-module">
              <span className="l4-module-tag">Module 2</span>
              <h3>The Threshold Experience</h3>
              <p>
                Your client&rsquo;s first 48 hours, built from your sales call.
              </p>
              <a className="l4-module-cta" href="#book">
                Book a call
              </a>
            </article>
            <article className="l4-module">
              <span className="l4-module-tag">Module 3</span>
              <h3>The Continuation</h3>
              <p>
                Thirty days before they leave, we remind them why they stayed.
              </p>
              <a className="l4-module-cta" href="#book">
                Book a call
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* /5 — Final CTA */}
      <section className="l4-section l4-section-final" id="book">
        <h2 className="l4-display l4-final-display">
          You already paid
          <br />
          <span className="l4-display-indent">for these leads.</span>
        </h2>
        <p className="l4-final-sub">
          You can keep doing follow-up the way you do it now — which, be
          honest, is <em>sometimes</em>. Or every lead you ever talk to gets
          followed up like they&rsquo;re your only client. In your voice. On
          time. Forever. The next call you finish is the first one we follow.
        </p>
        <p className="l4-final-kicker">Let&rsquo;s go collect them.</p>
        <a
          className="l4-cta l4-cta-large"
          href="mailto:djn203040@gmail.com?subject=The%20Client%20Architecture%20—%20Book%20a%20call"
        >
          Book a call
        </a>
        <footer className="l4-footer">
          <span>The Client Architecture</span>
          <span className="l4-footer-din">
            Built by Sonorous Digital — The Modern Architect&rsquo;s Office
          </span>
          <a href="/privacy-policy">Privacy</a>
        </footer>
      </section>
    </main>
  );
}
