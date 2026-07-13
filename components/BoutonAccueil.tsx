"use client";

import Link from "next/link";

// Ajouté le 2026-07-13 (Bourama : "un bouton Accueil partout où il y a
// retour qui emmène directement à l'accueil"). Toujours affiché à côté de
// BoutonRetour (jamais seul) : Retour dépend de l'historique de
// navigation (router.back()), Accueil est une destination fixe ("/"),
// utile si l'historique ramène quelque part d'inattendu (ex: arrivée
// directe sur la page via un lien partagé, sans historique interne).
//
// Style corrigé le même jour (voir BoutonRetour.tsx, même cause : bordure
// à 8% d'opacité seule, sans fond, quasi invisible sur un petit cercle).
export function BoutonAccueil() {
  return (
    <Link
      href="/"
      aria-label="Accueil"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-base text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
    >
      🏠
    </Link>
  );
}
