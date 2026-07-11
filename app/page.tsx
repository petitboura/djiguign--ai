"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appelerApi } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { AgentCard, type AgentResume } from "@/components/AgentCard";

// Étape D.2 (pivot social) : "/" est le feed PUBLIC (voir tableau des pages
// dans PIVOT_SOCIAL.md), pas une page qui exige une connexion — c'est un
// changement par rapport à l'ancienne page.tsx de l'Étape D.1, qui
// redirigeait tout visiteur non connecté vers /connexion. Cette vérification
// de session (E2E Supabase -> FastAPI) avait rempli son rôle de preuve de
// fonctionnement ; elle n'est plus nécessaire comme page d'accueil.

const LIMITE = 20;

type EtatFeed =
  | { statut: "chargement" }
  | { statut: "ok"; agents: AgentResume[]; page: number; total: number }
  | { statut: "erreur"; message: string };

type EtatRecherche =
  | { statut: "inactif" }
  | { statut: "chargement" }
  | { statut: "ok"; agents: AgentResume[]; createurs: { user_id: string; nom_affiche: string }[] }
  | { statut: "erreur"; message: string };

export default function PageAccueil() {
  const [feed, setFeed] = useState<EtatFeed>({ statut: "chargement" });
  const [page, setPage] = useState(1);

  const [requete, setRequete] = useState("");
  const [recherche, setRecherche] = useState<EtatRecherche>({ statut: "inactif" });

  useEffect(() => {
    let annule = false;
    setFeed({ statut: "chargement" });

    appelerApi(`/api/feed?page=${page}&limite=${LIMITE}`)
      .then((reponse) => {
        if (annule) return;
        setFeed({ statut: "ok", agents: reponse.agents, page: reponse.page, total: reponse.total });
      })
      .catch((e) => {
        if (annule) return;
        setFeed({
          statut: "erreur",
          message: e instanceof Error ? e.message : "Erreur inconnue",
        });
      });

    return () => {
      annule = true;
    };
  }, [page]);

  // Recherche débouncée : on attend que la personne arrête de taper
  // (300ms) avant d'appeler l'API, et on annule une recherche en vol si une
  // nouvelle frappe arrive entre-temps (évite qu'une réponse lente écrase
  // le résultat d'une requête plus récente).
  useEffect(() => {
    const q = requete.trim();
    if (q.length < 2) {
      setRecherche({ statut: "inactif" });
      return;
    }

    let annule = false;
    setRecherche({ statut: "chargement" });

    const minuteur = setTimeout(() => {
      appelerApi(`/api/search?q=${encodeURIComponent(q)}`)
        .then((reponse) => {
          if (annule) return;
          setRecherche({ statut: "ok", agents: reponse.agents, createurs: reponse.createurs });
        })
        .catch((e) => {
          if (annule) return;
          setRecherche({
            statut: "erreur",
            message: e instanceof Error ? e.message : "Erreur inconnue",
          });
        });
    }, 300);

    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [requete]);

  const rechercheActive = requete.trim().length >= 2;

  return (
    <>
      <TopBar />

      <main className="mx-auto max-w-5xl px-5 py-14">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-dj-texte sm:text-4xl">
            Découvre les agents IA de la communauté
          </h1>
          <p className="mt-3 text-dj-texte-muet">
            Cherche un agent par nom, ou explore ceux publiés récemment.
          </p>

          <div className="mt-7">
            <input
              type="search"
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder="Chercher un agent ou un créateur…"
              className="w-full rounded-full border border-dj-bordure bg-dj-surface px-5 py-3 text-dj-texte placeholder:text-dj-texte-muet outline-none focus:border-dj-accent-1"
            />
          </div>
        </div>

        <div className="mt-12">
          {rechercheActive ? (
            <ResultatsRecherche etat={recherche} />
          ) : (
            <GrilleFeed etat={feed} page={page} onChangerPage={setPage} />
          )}
        </div>
      </main>
    </>
  );
}

function GrilleFeed({
  etat,
  page,
  onChangerPage,
}: {
  etat: EtatFeed;
  page: number;
  onChangerPage: (p: number) => void;
}) {
  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement des agents…" />;
  }

  if (etat.statut === "erreur") {
    return (
      <EtatVide
        message="Impossible de charger le feed pour le moment."
        details={etat.message}
      />
    );
  }

  if (etat.agents.length === 0) {
    return <EtatVide message="Aucun agent publié pour l'instant." />;
  }

  const dernierePage = Math.ceil(etat.total / LIMITE);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {etat.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {dernierePage > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => onChangerPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-dj-texte-muet">
            Page {page} / {dernierePage}
          </span>
          <button
            onClick={() => onChangerPage(Math.min(dernierePage, page + 1))}
            disabled={page >= dernierePage}
            className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </>
  );
}

function ResultatsRecherche({ etat }: { etat: EtatRecherche }) {
  if (etat.statut === "chargement" || etat.statut === "inactif") {
    return <EtatVide message="Recherche…" />;
  }

  if (etat.statut === "erreur") {
    return <EtatVide message="La recherche a échoué." details={etat.message} />;
  }

  const rienTrouve = etat.agents.length === 0 && etat.createurs.length === 0;
  if (rienTrouve) {
    return <EtatVide message="Aucun résultat pour cette recherche." />;
  }

  return (
    <div className="space-y-10">
      {etat.agents.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-dj-texte-muet">
            Agents
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {etat.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {etat.createurs.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-dj-texte-muet">
            Créateurs
          </h2>
          <div className="flex flex-col gap-2">
            {etat.createurs.map((c) => (
              <Link
                key={c.user_id}
                href={`/u/${c.user_id}`}
                className="rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3 text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                {c.nom_affiche || "Créateur sans nom"}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EtatVide({ message, details }: { message: string; details?: string }) {
  return (
    <div className="rounded-2xl border border-dj-bordure bg-dj-surface px-6 py-14 text-center">
      <p className="text-dj-texte-muet">{message}</p>
      {details && <p className="mt-2 text-xs text-dj-texte-muet/70">{details}</p>}
    </div>
  );
}
