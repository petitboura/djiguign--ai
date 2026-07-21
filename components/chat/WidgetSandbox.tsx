"use client";

import { useState } from "react";

// Rend un bloc ```html ou ```widget du markdown dans un <iframe
// sandbox="allow-scripts allow-forms allow-modals"> -- le modèle peut
// générer un mini-outil autonome (calculateur, formulaire, mini-jeu) en
// HTML/CSS/JS complet, affiché isolé du reste de la page (pas d'accès au
// localStorage, cookies, ou DOM parent : voir attribut sandbox,
// volontairement SANS "allow-same-origin" pour empêcher tout accès aux
// données de session de l'utilisateur connecté).
//
// allow-modals (2026-07-20, ajouté après un test réel de Bourama) :
// sans ça, alert()/confirm()/prompt() sont bloqués SILENCIEUSEMENT par le
// navigateur -- aucune erreur console, le clic déclenche bien le script,
// mais rien à l'écran. Symptôme trompeur ("le bouton ne fait rien") pour
// un widget généré par le modèle qui utilise souvent alert() en premier
// réflexe pour un exemple simple.
//
// Chargement fluide : l'iframe est montée immédiatement mais cachée
// (opacity 0) tant que son onLoad n'est pas déclenché, pour éviter un
// flash de contenu vide/blanc qui casserait la sensation de fluidité
// pendant le reste du streaming.
export function WidgetSandbox({ code }: { code: string }) {
  const [charge, setCharge] = useState(false);

  const document = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      html,body{margin:0;padding:12px;background:#161210;color:#F5ECE0;
        font-family:Inter,system-ui,sans-serif;}
      *{box-sizing:border-box;}
    </style>
    </head><body>${code}</body></html>`;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface">
      <div className="border-b border-dj-bordure px-3 py-1.5 text-[11px] uppercase tracking-wide text-dj-texte-muet">
        Widget interactif
      </div>
      <iframe
        sandbox="allow-scripts allow-forms allow-modals"
        srcDoc={document}
        onLoad={() => setCharge(true)}
        className={`h-72 w-full transition-opacity duration-500 ${charge ? "opacity-100" : "opacity-0"}`}
        title="Widget interactif généré"
      />
    </div>
  );
}
