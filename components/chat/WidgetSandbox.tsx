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
