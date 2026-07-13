"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { appelerApi, appelerApiFichier } from "@/lib/api";
import { RecadreurImage } from "@/components/RecadreurImage";

// Réutilisé par le feed (D.2), la recherche (D.2) et le portfolio créateur
// (D.4) — un seul endroit à faire évoluer si l'apparence d'une carte agent
// change. Les champs optionnels (image_vitrine_url, description) viennent
// de GET /api/feed ; GET /api/search ne renvoie que id/nom/icone_page,
// d'où leur caractère optionnel ici plutôt que requis.
export type AgentResume = {
  id: string;
  nom: string;
  icone_page?: string;
  image_vitrine_url?: string | null;
  description?: string;
};

// Édition en ligne ajoutée le 2026-07-12 (Bourama, capture d'écran "Mes
// agents" : "Pro Math" sans description ni image vitrine) : plutôt que de
// laisser ces champs vides sans rien dire, `editable` (utilisé UNIQUEMENT
// par le dashboard "Mes agents", jamais par le feed/recherche/portfolio
// public — voir app/dashboard/page.tsx) affiche des boutons "Écrire une
// description publique" / "Ajouter une image vitrine" pour pousser le
// créateur à les remplir, et un petit crayon sur l'icône. Cliquer dessus
// édite DIRECTEMENT dans la carte (PATCH /api/agents/{id}), PAS de
// redirection vers la page de modification complète -- c'est le point
// explicite de la demande ("ces parties se modifient directement").
//
// En mode editable, la carte n'est plus un <Link> englobant tout (les
// zones d'édition doivent pouvoir être cliquées sans déclencher une
// navigation) : c'est un <div> avec un clic sur le fond qui navigue vers
// /agent/{id}, et chaque zone éditable stoppe la propagation de son
// propre clic. En mode lecture seule (par défaut), comportement
// inchangé : un <Link> classique.
export function AgentCard({
  agent,
  editable = false,
}: {
  agent: AgentResume;
  editable?: boolean;
}) {
  const router = useRouter();
  const [donnees, setDonnees] = useState(agent);
  const [edition, setEdition] = useState<"description" | "icone" | null>(null);
  const [brouillonDescription, setBrouillonDescription] = useState(donnees.description ?? "");
  const [brouillonIcone, setBrouillonIcone] = useState(donnees.icone_page ?? "🤖");
  const [envoiDescription, setEnvoiDescription] = useState(false);
  const [envoiIcone, setEnvoiIcone] = useState(false);
  const [envoiImage, setEnvoiImage] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fichierACadrer, setFichierACadrer] = useState<File | null>(null);
  const inputImageRef = useRef<HTMLInputElement>(null);

  function stopper(e: { preventDefault: () => void; stopPropagation: () => void }) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function enregistrerDescription() {
    setEnvoiDescription(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: brouillonDescription }),
      });
      setDonnees((d) => ({ ...d, description: brouillonDescription }));
      setEdition(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnvoiDescription(false);
    }
  }

  async function enregistrerIcone() {
    const nouvelleIcone = brouillonIcone.trim() || "🤖";
    setEnvoiIcone(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ icone_page: nouvelleIcone }),
      });
      setDonnees((d) => ({ ...d, icone_page: nouvelleIcone }));
      setEdition(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnvoiIcone(false);
    }
  }

  async function envoyerImageCadree(blob: Blob) {
    setFichierACadrer(null);
    setEnvoiImage(true);
    setErreur(null);
    try {
      const fichierCadre = new File([blob], "vitrine.jpg", { type: "image/jpeg" });
      const upload = await appelerApiFichier("/api/uploads/image", fichierCadre);
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ image_vitrine_url: upload.url }),
      });
      setDonnees((d) => ({ ...d, image_vitrine_url: upload.url }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnvoiImage(false);
      if (inputImageRef.current) inputImageRef.current.value = "";
    }
  }

  const contenu = (
    <>
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-dj-surface-haute">
        {donnees.image_vitrine_url ? (
          <Image
            src={donnees.image_vitrine_url}
            alt={donnees.nom}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        ) : editable ? (
          <button
            type="button"
            onClick={(e) => {
              stopper(e);
              inputImageRef.current?.click();
            }}
            disabled={envoiImage}
            className="flex flex-col items-center gap-1.5 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-50"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            {envoiImage ? "Envoi…" : "Ajouter une image vitrine"}
          </button>
        ) : (
          <span className="text-4xl">{donnees.icone_page ?? "🤖"}</span>
        )}

        {editable && (
          <input
            ref={inputImageRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onClick={stopper}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFichierACadrer(f);
            }}
            className="hidden"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          {editable && edition === "icone" ? (
            <form
              onSubmit={(e) => {
                stopper(e);
                enregistrerIcone();
              }}
              onClick={stopper}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                value={brouillonIcone}
                onChange={(e) => setBrouillonIcone(e.target.value)}
                maxLength={4}
                className="w-12 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2 py-1 text-center text-lg outline-none focus:border-dj-accent-1"
              />
              <button type="submit" disabled={envoiIcone} className="text-xs text-dj-accent-1">
                {envoiIcone ? "…" : "OK"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  setEdition(null);
                }}
                className="text-xs text-dj-texte-muet"
              >
                Annuler
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                if (!editable) return;
                stopper(e);
                setBrouillonIcone(donnees.icone_page ?? "🤖");
                setEdition("icone");
              }}
              className={
                editable
                  ? "flex items-center gap-1 rounded px-1 -mx-1 transition-colors hover:bg-dj-surface-haute"
                  : "flex items-center gap-1"
              }
            >
              <span className="text-lg leading-none">{donnees.icone_page ?? "🤖"}</span>
              {editable && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-dj-texte-muet"
                  aria-hidden="true"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              )}
            </button>
          )}
          <h3 className="font-display text-base font-bold text-dj-texte">{donnees.nom}</h3>
        </div>

        {editable && edition === "description" ? (
          <div onClick={stopper} className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={brouillonDescription}
              onChange={(e) => setBrouillonDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-2 py-1.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  enregistrerDescription();
                }}
                disabled={envoiDescription}
                className="rounded-full bg-dj-gradient px-3 py-1 text-xs font-bold text-[#1A0D02] disabled:opacity-50"
              >
                {envoiDescription ? "…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  setEdition(null);
                }}
                className="text-xs text-dj-texte-muet"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : donnees.description ? (
          <p
            className={
              editable
                ? "line-clamp-2 cursor-text text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
                : "line-clamp-2 text-sm text-dj-texte-muet"
            }
            onClick={
              editable
                ? (e) => {
                    stopper(e);
                    setBrouillonDescription(donnees.description ?? "");
                    setEdition("description");
                  }
                : undefined
            }
          >
            {donnees.description}
          </p>
        ) : editable ? (
          <button
            type="button"
            onClick={(e) => {
              stopper(e);
              setBrouillonDescription("");
              setEdition("description");
            }}
            className="flex items-center gap-1.5 self-start text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Écrire une description publique
          </button>
        ) : null}

        {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}
      </div>
    </>
  );

  return (
    <>
      {editable ? (
        <div
          onClick={() => router.push(`/agent/${agent.id}`)}
          className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface transition-colors hover:border-dj-bordure-forte"
        >
          {contenu}
        </div>
      ) : (
        <Link
          href={`/agent/${agent.id}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface transition-colors hover:border-dj-bordure-forte"
        >
          {contenu}
        </Link>
      )}

      {fichierACadrer && (
        <RecadreurImage
          source={fichierACadrer}
          aspect={16 / 9}
          onValider={envoyerImageCadree}
          onAnnuler={() => {
            setFichierACadrer(null);
            if (inputImageRef.current) inputImageRef.current.value = "";
          }}
        />
      )}
    </>
  );
}
