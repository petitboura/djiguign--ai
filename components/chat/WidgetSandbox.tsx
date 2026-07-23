"use client";

import { useEffect, useState } from "react";
import { AppWindow } from "lucide-react";
import { usePanneau } from "./PanneauContext";

// Bloc ```html ou ```widget du markdown -- le modèle peut générer un
// mini-outil autonome (calculateur, formulaire, mini-jeu) en HTML/CSS/JS
// complet. Depuis le panneau latéral (2026-07-20, demande de Bourama :
// "même système que Claude" -- voir PanneauContext.tsx), ce composant
// n'affiche plus l'iframe en ligne dans le fil : il ouvre AUTOMATIQUEMENT
// le widget dans le panneau dès son arrivée (comme un artifact Claude.ai)
// et laisse dans le fil une carte compacte pour le rouvrir/le refocaliser
// si le panneau a été fermé entretemps. Le rendu réel de l'iframe vit
// dans PanneauPreview.tsx (construireDocumentWidget), pas ici.
export function construireDocumentWidget(code: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      html,body{margin:0;padding:12px;background:#161210;color:#F5ECE0;
        font-family:Inter,system-ui,sans-serif;}
      *{box-sizing:border-box;}
      /* Style par défaut pour tout champ/bouton généré sans CSS propre --
         sans ça, un input/button hérite du blanc par défaut du
         navigateur, qui jure avec le reste de l'interface (repéré par
         Bourama sur un widget "solveur d'équations" avec des champs
         blancs au milieu d'une carte sombre). Le modèle peut toujours
         écraser ces règles avec son propre <style>, ceci n'est qu'un
         filet de sécurité. */
      input, select, textarea{
        background:#1E1813;color:#F5ECE0;border:1px solid rgba(255,255,255,0.14);
        border-radius:8px;padding:6px 10px;font:inherit;font-size:14px;
      }
      input:focus, select:focus, textarea:focus{
        outline:none;border-color:#E8934A;
      }
      button{
        background:linear-gradient(135deg,#F2A65A 0%,#D9631F 55%,#8A2E0A 100%);
        color:#1A0D02;border:none;border-radius:8px;padding:7px 14px;
        font:inherit;font-size:14px;font-weight:600;cursor:pointer;
      }
      button:hover{filter:brightness(1.08);}
      button:active{filter:brightness(0.95);}
      table{border-collapse:collapse;}
      td,th{border:1px solid rgba(255,255,255,0.14);padding:4px 8px;}
      a{color:#E8934A;}
      #dj-erreur-widget{
        display:none;margin-bottom:10px;padding:8px 10px;border-radius:8px;
        background:rgba(220,60,50,0.15);border:1px solid rgba(220,60,50,0.4);
        color:#F5ECE0;font-size:12px;font-family:monospace;white-space:pre-wrap;
      }
    </style>
    </head><body>
    <div id="dj-erreur-widget"></div>
    ${code}
    <script>
      // Sans ça, un widget qui casse (script.src externe bloqué,
      // erreur de syntaxe, référence à une variable inexistante...)
      // échoue en silence : le clic ne fait rien, aucun indice pour
      // diagnostiquer. Trouvé sur plusieurs widgets réels (2026-07-20)
      // où "rien ne se passe" cachait des causes différentes à chaque
      // fois -- ce bandeau rend l'erreur visible directement.
      (function () {
        var conteneur = document.getElementById('dj-erreur-widget');
        function afficher(texte) {
          conteneur.textContent = 'Erreur dans le widget : ' + texte;
          conteneur.style.display = 'block';
        }
        window.onerror = function (message, source, ligne) {
          afficher(message + (ligne ? ' (ligne ' + ligne + ')' : ''));
        };
        window.addEventListener('unhandledrejection', function (e) {
          afficher(String(e.reason));
        });
      })();
    </script>
    </body></html>`;
}

let compteurWidget = 0;

export function WidgetSandbox({ code }: { code: string }) {
  const { ouvrirDansPanneau, itemActif } = usePanneau();
  // Id stable pour la durée de vie du composant (un id par bloc ```widget
  // du message, pas par re-render) -- sert à savoir si CE widget précis
  // est l'élément actuellement affiché dans le panneau, pour changer le
  // libellé de la carte ("Ouvrir" vs "Affiché").
  const idRef = useMemoId();

  useEffect(() => {
    // Ouverture automatique à l'arrivée du widget, comme un artifact
    // Claude.ai -- pas besoin de cliquer pour voir un résultat qui vient
    // d'être généré. N'ouvre qu'une fois (dépendances : id+code stables).
    ouvrirDansPanneau({ id: idRef, type: "widget", titre: "Widget interactif", code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRef, code]);

  const estActif = itemActif?.id === idRef;

  return (
    <button
      onClick={() => ouvrirDansPanneau({ id: idRef, type: "widget", titre: "Widget interactif", code })}
      className="my-2 flex w-full max-w-sm animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-3 text-left transition-colors hover:border-dj-bordure-forte"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dj-gradient text-[#1A0D02]">
        <AppWindow size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-dj-texte">Widget interactif</span>
        <span className="block text-[11px] text-dj-texte-muet">{estActif ? "Affiché dans le panneau" : "Ouvrir dans le panneau"}</span>
      </span>
    </button>
  );
}

// useState (plutôt qu'un simple useRef(crypto.randomUUID())) garantit une
// valeur calculée une seule fois pour la vie du composant -- l'init
// inline d'un useRef n'est pas mémoïsée par React en mode strict/dev,
// donc pourrait générer un nouvel id à chaque render.
function useMemoId(): string {
  const [id] = useState(() => `widget-${++compteurWidget}-${Math.random().toString(36).slice(2)}`);
  return id;
}
