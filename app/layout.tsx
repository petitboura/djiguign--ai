import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Étape D.1 (pivot social) : les 3 polices de la marque, chargées ici à
// l'identique de djiguigne-frontend/app/layout.tsx (next/font, auto-
// hébergées, zéro requête Google au runtime), exposées en variables CSS
// consommées par tailwind.config.ts.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Djiguignè AI",
  description: "Crée ton propre assistant IA, sans coder.",
};

export default function RacineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-dj-fond font-sans text-dj-texte antialiased">
        {children}
      </body>
    </html>
  );
}
// force-redeploy 2026-07-13
