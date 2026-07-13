"use client";

import { useRouter } from "next/navigation";

// Bug remonté par Bourama (2026-07-11, capture d'écran /agent/[id]) :
// aucun bouton retour visible en ouvrant un agent. Le logo dans TopBar
// pointe déjà vers "/", mais ce n'est pas assez visible comme affordance
// de retour. router.back() plutôt qu'un lien fixe vers "/" : ramène là
// d'où on vient (feed, recherche, un autre agent), pas systématiquement
// à l'accueil.
//
// Redesign du 2026-07-13 (Bourama) : cercle + flèche seule, sans texte
// "Retour" -- toujours accompagné de BoutonAccueil juste à côté (voir ce
// composant) partout où celui-ci apparaît.
export function BoutonRetour() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      aria-label="Retour"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-dj-bordure text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
    >
      ←
    </button>
  );
}
