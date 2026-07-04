import type { Metadata } from "next";
import { Newsreader, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/lib/app-state";
import { AppShell } from "@/components/layout/app-shell";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "zen.",
  description: "Personal productivity dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${newsreader.variable} ${instrumentSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
