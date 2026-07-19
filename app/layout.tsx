import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thockpit",
  description:
    "A typing test with a 3D mechanical keyboard, real switch sounds, and your stats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full antialiased`}>
      {/* Browser extensions (ad blockers, Bitdefender, Grammarly…) inject
          attributes into <body> before React hydrates; this stops those from
          being reported as hydration mismatches. */}
      <body className="min-h-full flex flex-col bg-[#0f0f0f] font-mono" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
