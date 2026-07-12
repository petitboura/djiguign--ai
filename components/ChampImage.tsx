"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { appelerApiFichier } from "@/lib/api";

// Fix du 2026-07-12 (bug remonté par Bourama, captures d'écran
// /dashboard/agents/nouveau et /dashboard) : les champs "URL image de
// vitrine" / "URL avatar" demandaient de coller un lien à la main — pas
// utilisable pour quelqu'un de non-technique. Remplacés par un vrai
// upload de fichier vers Supabase Storage, via le nouveau endpoint
// POST /api/uploads/image (voir api/uploads.py, ajouté à cette étape).

export function ChampImage({
  valeur,
  onChange,
  label,
  rond = false,
}: {
  valeur: string;
  onChange: (url: string) => void;
  label: string;
  rond?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function gererSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await appelerApiFichier("/api/uploads/image", fichier);
      onChange(reponse.url);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setEnvoi(false);
      // Permet de re-sélectionner le même fichier plus tard si besoin
      // (ex: après une erreur) — sans ça, un second choix du même fichier
      // ne redéclenche pas onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const formeApercu = rond ? "rounded-full" : "rounded-lg";

  return (
    <div>
      <label className="block text-sm font-medium text-dj-texte-muet">{label}</label>

      <div className="mt-1 flex items-center gap-4">
        <div
          className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-dj-bordure bg-dj-surface-haute ${formeApercu}`}
        >
          {valeur ? (
            <Image src={valeur} alt="" fill className="object-cover" sizes="64px" />
          ) : (
            <span className="text-xs text-dj-inactif">Aucune</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={envoi}
            onClick={() => inputRef.current?.click()}
            className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
          >
            {envoi ? "Envoi…" : valeur ? "Changer l'image" : "Choisir une image"}
          </button>
          {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={gererSelection}
          className="hidden"
        />
      </div>
    </div>
  );
}
