import LandingHero from "./LandingHero";
import type { TLandingCopy } from "./copy";

export default function LandingPage({ copy }: { copy: TLandingCopy }) {
  const bookHref = `mailto:djn203040@gmail.com?subject=${encodeURIComponent(copy.final.mailtoSubject)}`;

  return (
    <main className="l4-root">
      <LandingHero copy={copy.hero} />

      {/* /1 — The promise */}
      <section className="l4-section l4-section-promise" id="promise">
        <span className="l4-marker">/1</span>
        <h2 className="l4-display">
          {copy.promise.displayLine1}
          <br />
          <span className="l4-display-indent">{copy.promise.displayLine2}</span>
        </h2>
        <p className="l4-lede">{copy.promise.lede}</p>
        <div className="l4-promise-cards">
          {copy.promise.cards.map((card) => (
            <article className="l4-card" key={card.tag}>
              <span className="l4-card-no">{card.tag}</span>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* /2 — What coaches get back */}
      <section className="l4-section l4-section-numbers">
        <span className="l4-marker">/2</span>
        <h2 className="l4-display">
          {copy.numbers.displayLine1}
          <br />
          <span className="l4-display-indent">{copy.numbers.displayLine2}</span>
        </h2>
        <ul className="l4-numbers">
          {copy.numbers.rows.map((row) => (
            <li className="l4-number-row" key={row.figure}>
              <span className="l4-number">{row.figure}</span>
              <div className="l4-number-copy">
                <h3>{row.heading}</h3>
                <p>{row.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* /3 — The first 24 hours */}
      <section className="l4-section l4-section-day">
        <span className="l4-marker">/3</span>
        <h2 className="l4-display">
          {copy.day.displayLine1}
          <br />
          <span className="l4-display-indent">{copy.day.displayLine2}</span>
        </h2>
        <div className="l4-day-grid">
          <div className="l4-day-col">
            {copy.day.steps.slice(0, 2).map((step) => (
              <article className="l4-step" key={step.no}>
                <span className="l4-step-no">{step.no}</span>
                <h3>{step.heading}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <figure className="l4-day-figure">
            <img
              src="/landing-4/frames/frame-0101.webp"
              alt={copy.day.figureAlt}
              loading="lazy"
            />
          </figure>
          <div className="l4-day-col">
            {copy.day.steps.slice(2).map((step) => (
              <article className="l4-step" key={step.no}>
                <span className="l4-step-no">{step.no}</span>
                <h3>{step.heading}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
        <p className="l4-day-coda">{copy.day.coda}</p>
      </section>

      {/* /4 — The modules */}
      <section className="l4-section-modules">
        <div className="l4-section l4-modules-inner">
          <span className="l4-marker">/4</span>
          <h2 className="l4-display l4-display-cream">
            {copy.modules.displayLine1}
            <br />
            <span className="l4-display-indent">{copy.modules.displayLine2}</span>
          </h2>
          <p className="l4-modules-sub">{copy.modules.sub}</p>
          <div className="l4-modules-cards">
            {copy.modules.items.map((mod, i) => (
              <article
                className={i === 0 ? "l4-module l4-module-live" : "l4-module"}
                key={mod.heading}
              >
                <span className="l4-module-tag">{mod.tag}</span>
                <h3>{mod.heading}</h3>
                <p>{mod.body}</p>
                {mod.cta ? (
                  <a className="l4-module-cta" href="#book">
                    {mod.cta}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* /5 — Final CTA */}
      <section className="l4-section l4-section-final" id="book">
        <h2 className="l4-display l4-final-display">
          {copy.final.displayLine1}
          <br />
          <span className="l4-display-indent">{copy.final.displayLine2}</span>
        </h2>
        <p className="l4-final-sub">
          {copy.final.subBeforeEm}
          <em>{copy.final.subEm}</em>
          {copy.final.subAfterEm}
        </p>
        <p className="l4-final-kicker">{copy.final.kicker}</p>
        <a className="l4-cta l4-cta-large" href={bookHref}>
          {copy.final.cta}
        </a>
        <footer className="l4-footer">
          <span>The Client Architecture</span>
          <span className="l4-footer-din">
            Built by Sonorous Digital — The Modern Architect&rsquo;s Office
          </span>
          <a href="/privacy-policy">{copy.final.privacy}</a>
        </footer>
      </section>
    </main>
  );
}
