"use client";

import { useRouter } from "next/navigation";

// Bug remonté par Bourama (2026-07-11, capture d'écran /agent/[id]) :
// aucun bouton retour visible en ouvrant un agent. Le logo dans TopBar
// pointe déjà vers "/", mais ce n'est pas assez visible comme affordance
// de retour. router.back() plutôt qu'un lien fixe vers "/" : ramène là
// d'où on vient (feed, recherche, un autre agent), pas systématiquement
// à l'accueil.
export function BoutonRetour() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
    >
      <span aria-hidden>←</span> Retour
    </button>
  );
}
