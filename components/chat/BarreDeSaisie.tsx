"use client";

import { useRef, useState } from "react";
import { Pin, Mic, AudioLines, ArrowUp, X } from "lucide-react";

export type LongueurReponse = "courte" | "moyenne" | "longue";

export function BarreDeSaisie({
  onEnvoyer,
  desactive,
}: {
  onEnvoyer: (texte: string, longueur: LongueurReponse, fichier: File | null) => void;
  desactive?: boolean;
}) {
  const [texte, setTexte] = useState("");
  const [longueur, setLongueur] = useState<LongueurReponse>("moyenne");
  const [fichier, setFichier] = useState<File | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  function pasDisponible() {
    alert("Pas disponible pour le moment.");
  }

  function envoyer() {
    if (!texte.trim() || desactive) return;
    onEnvoyer(texte, longueur, fichier);
    setTexte("");
    setFichier(null);
  }

  return (
    <div className="w-full">
      {/* Vignette d'aperçu du fichier uploadé, avant envoi -- section 3.3 */}
      {fichier && (
        <div className="mb-2 flex w-fit items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs text-dj-texte-muet">
          <span className="max-w-[180px] truncate">{fichier.name}</span>
          <button onClick={() => setFichier(null)} aria-label="Retirer le fichier" className="hover:text-dj-texte">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Rectangle à coins arrondis (plus une pilule ovale complète), tous
          les éléments alignés en bas -- voir section 3.3. */}
      <div className="rounded-3xl border border-dj-bordure bg-dj-surface-haute px-4 py-3 focus-within:border-dj-bordure-forte">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          placeholder="Pose ta question..."
          rows={1}
          className="max-h-40 w-full resize-none bg-transparent text-[15px] text-dj-texte outline-none placeholder:text-dj-texte-muet"
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Punaise (remplace le "+"), contour monochrome, même fonction
                (upload fichier) -- section 3.3. */}
            <button
              onClick={() => inputFichierRef.current?.click()}
              aria-label="Joindre un fichier"
              className="text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <Pin size={18} />
            </button>
            <input
              ref={inputFichierRef}
              type="file"
              className="hidden"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />

            {/* Sélecteur Courte/Moyenne/Longue (remplace "Sonnet 5/Moyen"),
                modifiable à chaque message -- section 3.3. */}
            <select
              value={longueur}
              onChange={(e) => setLongueur(e.target.value as LongueurReponse)}
              className="rounded-md bg-transparent text-xs text-dj-texte-muet outline-none"
            >
              <option value="courte">Courte</option>
              <option value="moyenne">Moyenne</option>
              <option value="longue">Longue</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {texte.trim() ? (
              <button
                onClick={envoyer}
                disabled={desactive}
                aria-label="Envoyer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-dj-gradient text-[#1A0D02] disabled:opacity-60"
              >
                <ArrowUp size={16} />
              </button>
            ) : (
              <>
                {/* Micro (fixe) = dictée vocale. Waveform = mode vocal
                    complet. Deux boutons distincts, pas un seul qui change
                    d'état -- section 3.3. Pas encore branchés (section 4). */}
                <button onClick={pasDisponible} aria-label="Dictée vocale" className="text-dj-texte-muet transition-colors hover:text-dj-texte">
                  <Mic size={18} />
                </button>
                <button onClick={pasDisponible} aria-label="Mode vocal" className="text-dj-texte-muet transition-colors hover:text-dj-texte">
                  <AudioLines size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
