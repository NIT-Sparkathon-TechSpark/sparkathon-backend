import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// The site's text font. It keeps the variable name the theme in globals.css already reads.
const sans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Centaur Test",
  description: "Would you notice if the AI was wrong? Answer a few questions, see what an AI says, and find out. Takes about 8 minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Browser extensions add attributes to <html> before React loads; this silences that false alarm.
      suppressHydrationWarning
      // `light` pins the light theme, whatever the device is set to (see globals.css).
      className={`${sans.variable} ${geistMono.variable} light h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
