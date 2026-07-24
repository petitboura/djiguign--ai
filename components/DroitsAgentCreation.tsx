"use client";

import { useEffect, useState } from "react";
import { lireRegistreOutils } from "@/lib/api";

// Variante de DroitsAgent.tsx pour le formulaire de CRÉATION : l'agent
// n'existe pas encore, donc pas d'agentId, pas de lecture "coche" déjà
// enregistrée, pas d'appel PATCH. Ce composant se contente de proposer
// les cases (toujours depuis registre_outils_plateforme en direct) et
// de faire remonter la sélection au formulaire parent via onChange, qui
// l'inclut dans le payload de POST /api/agents (outils_generation_choisis,
// serveurs_choisis) -- même création, même requête, comme tous les
// autres champs du formulaire.

type OutilPlateforme = {
  nom_outil: string;
  categorie: number;
  nom_serveur: string;
  disponible: boolean;
};

export function DroitsAgentCreation({
  onChange,
}: {
  onChange: (droits: { outilsGeneration: string[]; serveurs: string[] }) => void;
}) {
  const [registre, setRegistre] = useState<{ generation: OutilPlateforme[]; serveurs: OutilPlateforme[] } | null>(
    null
  );
  const [genererCoches, setGenererCoches] = useState<Set<string>>(new Set());
  const [serveursCoches, setServeursCoches] = useState<Set<string>>(new Set());
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    lireRegistreOutils()
      .then(setRegistre)
      .catch((e) => setErreur(e.message || "Impossible de charger les outils disponibles."));
  }, []);

  useEffect(() => {
    onChange({ outilsGeneration: Array.from(genererCoches), serveurs: Array.from(serveursCoches) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genererCoches, serveursCoches]);

  function basculerGeneration(nomOutil: string) {
    setGenererCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(nomOutil)) suivant.delete(nomOutil);
      else suivant.add(nomOutil);
      return suivant;
    });
  }

  function basculerServeur(nomServeur: string) {
    setServeursCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(nomServeur)) suivant.delete(nomServeur);
      else suivant.add(nomServeur);
      return suivant;
    });
  }

  if (erreur) return <p className="text-sm text-red-500">{erreur}</p>;
  if (!registre) return <p className="text-sm text-dj-texte-muet">Chargement des droits…</p>;

  const serveursParNom = new Map<string, OutilPlateforme>();
  for (const s of registre.serveurs) serveursParNom.set(s.nom_serveur, s);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-dj-texte">Génération</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {registre.generation.map((outil) => (
            <label
              key={outil.nom_outil}
              className={`flex items-center gap-2 text-sm text-dj-texte ${!outil.disponible ? "opacity-40" : ""}`}
            >
              <input
                type="checkbox"
                disabled={!outil.disponible}
                checked={genererCoches.has(outil.nom_outil)}
                onChange={() => basculerGeneration(outil.nom_outil)}
              />
              {outil.nom_outil}
              {!outil.disponible && <span className="text-xs text-dj-texte-muet">(indisponible)</span>}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-dj-texte">Outils externes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from(serveursParNom.values()).map((serveur) => (
            <label
              key={serveur.nom_serveur}
              className={`flex items-center gap-2 text-sm text-dj-texte ${!serveur.disponible ? "opacity-40" : ""}`}
            >
              <input
                type="checkbox"
                disabled={!serveur.disponible}
                checked={serveursCoches.has(serveur.nom_serveur)}
                onChange={() => basculerServeur(serveur.nom_serveur)}
              />
              {serveur.nom_serveur}
              {serveur.categorie === 3 && (
                <span className="text-xs text-dj-texte-muet">(compte utilisateur requis)</span>
              )}
              {!serveur.disponible && <span className="text-xs text-dj-texte-muet">(indisponible)</span>}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
