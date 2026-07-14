import type { Metadata } from "next";
import Link from "next/link";
import { LAST_UPDATED, POLICY_SECTIONS, type TPolicyBlock } from "./content";

export const metadata: Metadata = {
  title: "Privacy Policy — The Client Architecture",
  description:
    "What The Client Architecture collects, why, and how you can control it.",
};

function PolicyBlock({ block }: { block: TPolicyBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {block.text}
        </p>
      );
    case "subheading":
      return (
        <h3 className="pt-2 text-sm font-semibold text-foreground">
          {block.text}
        </h3>
      );
    case "list":
      return (
        <ul className="space-y-2 pl-5">
          {block.items.map((item) => (
            <li
              key={item}
              className="list-disc text-sm leading-relaxed text-muted-foreground marker:text-foreground/40"
            >
              {item}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {block.headers.map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr
                  key={row[0]}
                  className="border-b border-white/5 last:border-b-0"
                >
                  {row.map((cell, i) => (
                    <td
                      key={`${row[0]}-${i}`}
                      className="px-4 py-3 align-top leading-relaxed text-muted-foreground"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← The Client Architecture
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:p-10 dark:bg-white/5">
          <div className="space-y-10">
            {POLICY_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                {section.blocks.map((block, i) => (
                  <PolicyBlock key={`${section.id}-${i}`} block={block} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
