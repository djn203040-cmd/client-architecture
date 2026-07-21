import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { cookies, headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Client Architecture",
  description: "AI follow-up system for coaches",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "";
  // The Danish landing (theclientarchitecture.dk, rewritten to /da) is the
  // one route whose document language differs from the app default.
  const pathname = (await headers()).get("x-pathname");
  const lang = pathname === "/da" ? "da" : "en";

  return (
    <html lang={lang} className={theme} suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
