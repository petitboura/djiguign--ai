"use client";

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

// Panneau latéral de prévisualisation -- demande de Bourama (2026-07-20) :
// "même système que Claude" (le panneau Artifacts de Claude.ai). Reste
// ouvert pendant la conversation, se met à jour au fil des échanges :
// le fil de discussion à gauche montre une carte compacte pour tout
// élément "panneau-able" (widget interactif, fichier de code, document),
// le contenu complet vit ici, à droite.
//
// Types couverts pour l'instant : widget, code, pdf. Extensible -- ajouter
// un type ici + son rendu dans PanneauPreview.tsx suffit pour en couvrir
// un nouveau (site déployé, modèle 3D...), pas besoin de toucher au
// contexte lui-même.
export type ItemPanneau =
  | { id: string; type: "widget"; titre: string; code: string }
  | { id: string; type: "code"; titre: string; href: string }
  | { id: string; type: "pdf"; titre: string; href: string };

type PanneauContextValeur = {
  ouvert: boolean;
  itemActif: ItemPanneau | null;
  historique: ItemPanneau[];
  ouvrirDansPanneau: (item: ItemPanneau) => void;
  fermer: () => void;
  reinitialiser: () => void;
};

const PanneauContext = createContext<PanneauContextValeur | null>(null);

export function PanneauProvider({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const [itemActif, setItemActif] = useState<ItemPanneau | null>(null);
  const [historique, setHistorique] = useState<ItemPanneau[]>([]);

  const ouvrirDansPanneau = useCallback((item: ItemPanneau) => {
    setItemActif(item);
    setOuvert(true);
    setHistorique((prec) => {
      // Un même id (ex: widget déjà ouvert plus tôt dans le fil) remonte
      // en tête plutôt que de dupliquer l'entrée -- l'historique reste
      // une liste d'éléments distincts, pas un journal de clics.
      const sansDoublon = prec.filter((i) => i.id !== item.id);
      return [item, ...sansDoublon];
    });
  }, []);

  const fermer = useCallback(() => setOuvert(false), []);

  // Appelé au changement de fil de conversation (voir ChatAgentClient.tsx)
  // -- l'historique du panneau appartenait au fil précédent, pas de sens
  // à le garder après avoir changé de conversation.
  const reinitialiser = useCallback(() => {
    setOuvert(false);
    setItemActif(null);
    setHistorique([]);
  }, []);

  const valeur = useMemo(
    () => ({ ouvert, itemActif, historique, ouvrirDansPanneau, fermer, reinitialiser }),
    [ouvert, itemActif, historique, ouvrirDansPanneau, fermer, reinitialiser]
  );

  return <PanneauContext.Provider value={valeur}>{children}</PanneauContext.Provider>;
}

export function usePanneau() {
  const ctx = useContext(PanneauContext);
  if (!ctx) throw new Error("usePanneau() doit être utilisé sous PanneauProvider");
  return ctx;
}
