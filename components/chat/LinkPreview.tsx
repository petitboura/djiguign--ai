"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Play } from "lucide-react";

// Aperçu de lien dans le chat -- demande de Bourama (2026-07-20) : "n'importe
// quel lien génère un aperçu... comme dans n'importe quelle plateforme"
// (comparaison explicite avec la miniature YouTube). Utilisé par le
// composant `a` custom de BulleMessage.tsx pour tout lien qui n'est ni un
// fichier téléchargeable (FichierChip) ni un média direct (LecteurMedia).
//
// Deux chemins :
//   - YouTube : l'oEmbed public (https://www.youtube.com/oembed) renvoie
//     déjà les en-têtes CORS nécessaires pour un fetch() direct côté
//     client -- pas besoin de passer par notre route serveur pour ce cas.
//   - Générique : passe par /api/apercu-lien (voir ce fichier) qui
//     récupère les balises Open Graph côté serveur (CORS bloquerait un
//     fetch direct pour la quasi-totalité des sites).
//
// Repli : si aucune métadonnée n'est trouvée (site qui bloque, erreur
// réseau, timeout...), on retombe sur un lien texte classique -- jamais de
// carte vide ou cassée. Pendant le chargement, un squelette discret plutôt
// qu'un vide brutal (cohérent avec la demande de fluidité de Bourama).
function idYoutube(href: string): string | null {
  const motifs = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const motif of motifs) {
    const trouve = href.match(motif);
    if (trouve) return trouve[1];
  }
  return null;
}

type Apercu = { titre: string | null; image: string | null; description: string | null; siteName: string };

export function LinkPreview({ href, texteLien }: { href: string; texteLien: string }) {
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [echec, setEchec] = useState(false);
  const [charge, setCharge] = useState(false);
  const idVideo = idYoutube(href);

  useEffect(() => {
    let annule = false;

    if (idVideo) {
      fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(href)}&format=json`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          if (annule) return;
          setApercu({
            titre: data.title || null,
            image: `https://img.youtube.com/vi/${idVideo}/hqdefault.jpg`,
            description: data.author_name ? `YouTube · ${data.author_name}` : "YouTube",
            siteName: "YouTube",
          });
        })
        .catch(() => !annule && setEchec(true))
        .finally(() => !annule && setCharge(true));
      return () => {
        annule = true;
      };
    }

    fetch(`/api/apercu-lien?url=${encodeURIComponent(href)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => !annule && setApercu(data))
      .catch(() => !annule && setEchec(true))
      .finally(() => !annule && setCharge(true));

    return () => {
      annule = true;
    };
  }, [href, idVideo]);

  // Repli : lien texte classique, tant que rien n'est chargé ou si l'aperçu
  // a échoué -- jamais de carte vide affichée.
  if (echec || (charge && !apercu)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-dj-accent-1 underline hover:text-dj-accent-2">
        {texteLien}
      </a>
    );
  }

  if (!charge) {
    return (
      <span className="my-2 flex h-20 w-full max-w-sm animate-pulse items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-3">
        <span className="h-14 w-14 shrink-0 rounded-lg bg-dj-surface-haute" />
        <span className="flex-1 space-y-2">
          <span className="block h-3 w-3/4 rounded bg-dj-surface-haute" />
          <span className="block h-3 w-1/2 rounded bg-dj-surface-haute" />
        </span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 flex w-full max-w-sm animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-2 no-underline transition-colors hover:border-dj-bordure-forte"
    >
      {apercu!.image && (
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-dj-surface-haute">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu externe (og:image / miniature YouTube), pas un asset local */}
          <img src={apercu!.image} alt="" className="h-full w-full object-cover" />
          {idVideo && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <Play size={16} className="fill-white text-white" />
            </span>
          )}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-dj-texte">{apercu!.titre || texteLien}</span>
        <span className="block truncate text-[11px] text-dj-texte-muet">{apercu!.siteName}</span>
      </span>
      <ExternalLink size={13} className="shrink-0 text-dj-texte-muet" />
    </a>
  );
}
