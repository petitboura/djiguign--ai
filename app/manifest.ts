import type { MetadataRoute } from "next";

// Demande de Bourama (2026-07-15) : "que les gens puissent la télécharger
// sur internet, sans passer par Play Store ou App Store" -- une PWA.
// Next.js génère automatiquement /manifest.webmanifest à partir de ce
// fichier (App Router, aucun package supplémentaire nécessaire). Couplé
// à public/sw.js + ServiceWorkerRegistration.tsx pour l'installabilité.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Djiguignè AI",
    short_name: "Djiguignè",
    description: "Plateforme sociale pour agents IA.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0908",
    theme_color: "#0b0908",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
