"use client";

import { MapPin, ExternalLink } from "lucide-react";

// Rend un bloc ```carte du markdown -- convention : JSON
//   { "lat": number, "lng": number, "label"?: string }
//
// LIMITE ASSUMÉE : pas de tuiles cartographiques interactives (Mapbox/
// Google Maps JS) ici -- ça demande une clé API à configurer côté
// .env.local + facturation potentielle, décision qui revient à Bourama.
// En attendant, carte stylée cohérente avec la charte + lien direct vers
// Google Maps (fonctionne sans clé, sans dépendance). Mieux vaut ça
// qu'un composant qui a l'air interactif mais ne l'est pas.
export function CarteMessage({ code }: { code: string }) {
  let lieu: { lat: number; lng: number; label?: string } | null = null;
  try {
    lieu = JSON.parse(code);
  } catch {
    return (
      <div className="my-3 flex h-20 items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface px-4 text-xs text-dj-texte-muet">
        <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-accent-1" />
        Localisation du lieu...
      </div>
    );
  }

  if (!lieu || typeof lieu.lat !== "number" || typeof lieu.lng !== "number") {
    return (
      <div className="my-3 rounded-xl border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        Coordonnées invalides.
      </div>
    );
  }

  const urlMaps = `https://www.google.com/maps/search/?api=1&query=${lieu.lat},${lieu.lng}`;

  return (
    <a
      href={urlMaps}
      target="_blank"
      rel="noopener noreferrer"
      className="my-3 flex animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:border-dj-bordure-forte"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dj-gradient text-[#1A0D02]">
        <MapPin size={18} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-dj-texte">{lieu.label || "Lieu"}</span>
        <span className="block text-xs text-dj-texte-muet">
          {lieu.lat.toFixed(5)}, {lieu.lng.toFixed(5)}
        </span>
      </span>
      <ExternalLink size={14} className="text-dj-texte-muet" />
    </a>
  );
}
