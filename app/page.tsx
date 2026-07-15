"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { AgentCard, type AgentResume } from "@/components/AgentCard";
import { CreateurCard, type CreateurResume } from "@/components/CreateurCard";
import { PopupCategories, type Categorie } from "@/components/PopupCategories";

// Étape D.2 (pivot social) : "/" est le feed PUBLIC (voir tableau des pages
// dans PIVOT_SOCIAL.md), pas une page qui exige une connexion — c'est un
// changement par rapport à l'ancienne page.tsx de l'Étape D.1, qui
// redirigeait tout visiteur non connecté vers /connexion. Cette vérification
// de session (E2E Supabase -> FastAPI) avait rempli son rôle de preuve de
// fonctionnement ; elle n'est plus nécessaire comme page d'accueil.
//
// Onglet Créateurs ajouté le 2026-07-13 (demande de Bourama) : à côté du
// feed d'agents existant, un second onglet liste les créateurs de la
// plateforme (GET /api/creators, nouveau). Un seul état de page actif à
// la fois (`ongletActif`) — les deux feeds gardent leur propre état de
// pagination indépendant pour ne pas perdre la position en changeant
// d'onglet puis en y revenant.

const LIMITE = 20;

type Onglet = "agents" | "createurs";

type EtatFeed =
  | { statut: "chargement" }
  | { statut: "ok"; agents: AgentResume[]; page: number; total: number }
  | { statut: "erreur"; message: string };

type EtatFeedCreateurs =
  | { statut: "chargement" }
  | { statut: "ok"; createurs: CreateurResume[]; page: number; total: number }
  | { statut: "erreur"; message: string };

type EtatRecherche =
  | { statut: "inactif" }
  | { statut: "chargement" }
  | { statut: "ok"; agents: AgentResume[]; createurs: CreateurResume[] }
  | { statut: "erreur"; message: string };

export default function PageAccueil() {
  const [ongletActif, setOngletActif] = useState<Onglet>("agents");

  const [feed, setFeed] = useState<EtatFeed>({ statut: "chargement" });
  const [page, setPage] = useState(1);
  // Filtre par catégorie (Bourama, 2026-07-15) : "pas tout en même temps"
  // -- clic sur une catégorie dans le popup, filtre le feed SUR PLACE
  // (pas de nouvelle page/route), remet la pagination à 1.
  const [categorieFiltre, setCategorieFiltre] = useState<Categorie | null>(null);
  const [popupCategoriesOuvert, setPopupCategoriesOuvert] = useState(false);

  const [feedCreateurs, setFeedCreateurs] = useState<EtatFeedCreateurs>({ statut: "chargement" });
  const [pageCreateurs, setPageCreateurs] = useState(1);

  const [requete, setRequete] = useState("");
  const [recherche, setRecherche] = useState<EtatRecherche>({ statut: "inactif" });

  useEffect(() => {
    let annule = false;
    setFeed({ statut: "chargement" });

    const filtreCategorie = categorieFiltre ? `&categorie=${encodeURIComponent(categorieFiltre.id)}` : "";
    appelerApi(`/api/feed?page=${page}&limite=${LIMITE}${filtreCategorie}`)
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
  }, [page, categorieFiltre]);

  useEffect(() => {
    if (ongletActif !== "createurs") return;

    let annule = false;
    setFeedCreateurs({ statut: "chargement" });

    appelerApi(`/api/creators?page=${pageCreateurs}&limite=${LIMITE}`)
      .then((reponse) => {
        if (annule) return;
        setFeedCreateurs({
          statut: "ok",
          createurs: reponse.createurs,
          page: reponse.page,
          total: reponse.total,
        });
      })
      .catch((e) => {
        if (annule) return;
        setFeedCreateurs({
          statut: "erreur",
          message: e instanceof Error ? e.message : "Erreur inconnue",
        });
      });

    return () => {
      annule = true;
    };
  }, [ongletActif, pageCreateurs]);

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
            <>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setOngletActif("agents")}
                  className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                    ongletActif === "agents"
                      ? "bg-dj-gradient font-medium text-[#1A0D02]"
                      : "border border-dj-bordure text-dj-texte-muet hover:border-dj-bordure-forte"
                  }`}
                >
                  Agents
                </button>
                <button
                  onClick={() => setOngletActif("createurs")}
                  className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                    ongletActif === "createurs"
                      ? "bg-dj-gradient font-medium text-[#1A0D02]"
                      : "border border-dj-bordure text-dj-texte-muet hover:border-dj-bordure-forte"
                  }`}
                >
                  Créateurs
                </button>

                {/* Bouton catégories : volontairement carré/à icône, PAS
                    en pilule comme Agents/Créateurs ci-dessus (Bourama :
                    "un bouton qui ne ressemble pas au bouton créateurs ou
                    agent") -- pour signaler visuellement que ce n'est pas
                    un 3e onglet mais un filtre à part. */}
                <button
                  onClick={() => setPopupCategoriesOuvert(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-sm text-dj-texte-muet transition-colors hover:border-dj-accent-1 hover:text-dj-texte"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  {categorieFiltre ? categorieFiltre.nom : "Catégories"}
                </button>

                {categorieFiltre && (
                  <button
                    onClick={() => {
                      setCategorieFiltre(null);
                      setPage(1);
                    }}
                    aria-label="Retirer le filtre de catégorie"
                    className="text-dj-texte-muet transition-colors hover:text-dj-texte"
                  >
                    ✕
                  </button>
                )}
              </div>

              <PopupCategories
                ouvert={popupCategoriesOuvert}
                onFermer={() => setPopupCategoriesOuvert(false)}
                categorieActuelleId={categorieFiltre?.id}
                seulementUtilisees
                onChoisir={(c) => {
                  setCategorieFiltre(c);
                  setPage(1);
                  setOngletActif("agents");
                }}
              />

              {ongletActif === "agents" ? (
                <GrilleFeed etat={feed} page={page} onChangerPage={setPage} />
              ) : (
                <GrilleCreateurs
                  etat={feedCreateurs}
                  page={pageCreateurs}
                  onChangerPage={setPageCreateurs}
                />
              )}
            </>
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

function GrilleCreateurs({
  etat,
  page,
  onChangerPage,
}: {
  etat: EtatFeedCreateurs;
  page: number;
  onChangerPage: (p: number) => void;
}) {
  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement des créateurs…" />;
  }

  if (etat.statut === "erreur") {
    return (
      <EtatVide
        message="Impossible de charger les créateurs pour le moment."
        details={etat.message}
      />
    );
  }

  if (etat.createurs.length === 0) {
    return <EtatVide message="Aucun créateur pour l'instant." />;
  }

  const dernierePage = Math.ceil(etat.total / LIMITE);

  return (
    <>
      <div className="flex flex-col gap-3">
        {etat.createurs.map((createur) => (
          <CreateurCard key={createur.user_id} createur={createur} />
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
          <div className="flex flex-col gap-3">
            {etat.createurs.map((c) => (
              <CreateurCard key={c.user_id} createur={c} />
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
