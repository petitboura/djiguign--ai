"use client";

import { useEffect, useRef, useState } from "react";

// Rend un diagramme Mermaid (flowchart, sequence, gantt, state...) à
// partir du texte source d'un bloc ```mermaid détecté dans BlocCode.tsx.
//
// mermaid.js manipule le DOM lui-même et n'est pas conçu pour le SSR --
// import dynamique + rendu uniquement après montage (useEffect), comme
// tout composant "client-only" dans ce projet Next.js. Pendant que
// mermaid.render() tourne (souvent <100ms mais peut prendre plus sur un
// gros diagramme), on affiche un espace réservé discret de la même
// famille visuelle que les autres blocs -- jamais le texte source
// ```mermaid brut à l'écran, jamais de saut de layout quand le SVG
// apparaît (le conteneur est déjà là, on fait juste un fondu dessus).
//
// definitionsRendues : le texte source arrive progressivement pendant le
// streaming (voir throttling dans BulleMessage.tsx) -- on ne relance
// mermaid.render() que quand le texte a fini de changer pendant 400ms,
// pas à chaque caractère (un diagramme incomplet ne parse de toute façon
// pas, et re-render en boucle est coûteux).
export function Mermaid({ definition }: { definition: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let annule = false;
    const delai = setTimeout(async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "#161210",
            primaryColor: "#1E1813",
            primaryTextColor: "#F5ECE0",
            primaryBorderColor: "#E8934A",
            lineColor: "#A79A8C",
            secondaryColor: "#161210",
            tertiaryColor: "#0B0908",
          },
          fontFamily: "var(--font-inter), sans-serif",
        });
        const { svg: svgRendu } = await mermaid.render(idRef.current, definition);
        if (!annule) {
          setSvg(svgRendu);
          setErreur(false);
        }
      } catch {
        // Diagramme incomplet (encore en streaming) ou syntaxe invalide --
        // pas d'erreur affichée tant qu'on n'a pas de version stable ;
        // voir rendu ci-dessous, on garde juste le dernier SVG valide.
        if (!annule) setErreur(true);
      }
    }, 400);

    return () => {
      annule = true;
      clearTimeout(delai);
    };
  }, [definition]);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-dj-bordure bg-dj-surface p-4">
      {svg ? (
        <div
          className="animate-dj-fade-in [&_svg]:mx-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex items-center gap-2 text-xs text-dj-texte-muet">
          <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-accent-1" />
          {erreur ? "Diagramme en cours de construction..." : "Rendu du diagramme..."}
        </div>
      )}
    </div>
  );
}
