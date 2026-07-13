"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Ajouté le 2026-07-12 (bug remonté par Bourama : impossible de cadrer/
// recadrer l'image de vitrine ou l'avatar de profil — l'image uploadée
// était utilisée telle quelle, "object-cover" décidait tout seul quelle
// partie garder). Ce composant s'intercale entre la sélection du fichier
// et l'upload (voir ChampImage.tsx) : l'utilisateur choisit la zone
// exacte, on exporte UNIQUEMENT cette zone en image finale avant l'envoi.
//
// Volontairement sans librairie externe (pas de nouvelle dépendance npm à
// installer) : juste un <img> déplacé/zoomé par transform CSS dans une
// fenêtre de taille fixe, puis un <canvas> hors-écran pour découper la
// zone visible au moment de valider. Le calcul du rectangle source repose
// sur le fait que le décalage/zoom affichés correspondent directement à
// une zone en pixels réels de l'image d'origine (voir calculerRectangleSource).

const LARGEUR_APERCU = 320;

export function RecadreurImage({
  fichier,
  aspect,
  onValider,
  onAnnuler,
}: {
  fichier: File;
  /** Largeur / hauteur souhaitée, ex. 16/9 pour une vitrine, 1 pour un avatar rond. */
  aspect: number;
  onValider: (resultat: Blob) => void;
  onAnnuler: () => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const glisseRef = useRef<{ x: number; y: number } | null>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const hauteurApercu = LARGEUR_APERCU / aspect;

  // Charge le fichier choisi dans une vraie balise <img> (nécessaire pour
  // connaître ses dimensions naturelles et pour drawImage plus tard).
  useEffect(() => {
    const url = URL.createObjectURL(fichier);
    const img = new window.Image();
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setDecalage({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  // Échelle de base : la plus grande des deux (largeur/hauteur) qui fait
  // que l'image couvre entièrement la fenêtre d'aperçu, sans bande vide —
  // même principe que CSS object-cover, mais qu'on peut ensuite dépasser
  // avec le zoom.
  const echelleBase = image
    ? Math.max(LARGEUR_APERCU / image.naturalWidth, hauteurApercu / image.naturalHeight)
    : 1;
  const echelle = echelleBase * zoom;

  const bornerDecalage = useCallback(
    (dx: number, dy: number, ech: number) => {
      if (!image) return { x: 0, y: 0 };
      const largeurAffichee = image.naturalWidth * ech;
      const hauteurAffichee = image.naturalHeight * ech;
      const minX = LARGEUR_APERCU - largeurAffichee;
      const minY = hauteurApercu - hauteurAffichee;
      return {
        x: Math.min(0, Math.max(minX, dx)),
        y: Math.min(0, Math.max(minY, dy)),
      };
    },
    [image, hauteurApercu]
  );

  useEffect(() => {
    setDecalage((d) => bornerDecalage(d.x, d.y, echelle));
    // On ne veut recalculer que quand l'échelle change, pas à chaque
    // frame de bornerDecalage lui-même.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echelle]);

  function debutGlisse(x: number, y: number) {
    glisseRef.current = { x: x - decalage.x, y: y - decalage.y };
  }
  function pendantGlisse(x: number, y: number) {
    if (!glisseRef.current) return;
    setDecalage(bornerDecalage(x - glisseRef.current.x, y - glisseRef.current.y, echelle));
  }
  function finGlisse() {
    glisseRef.current = null;
  }

  function valider() {
    if (!image) return;
    // Rectangle source dans l'image ORIGINALE : le point (0,0) de la
    // fenêtre d'aperçu correspond au pixel (-decalage.x/echelle,
    // -decalage.y/echelle) de l'image, et la fenêtre entière fait
    // (LARGEUR_APERCU/echelle) x (hauteurApercu/echelle) pixels réels.
    const sx = -decalage.x / echelle;
    const sy = -decalage.y / echelle;
    const sw = LARGEUR_APERCU / echelle;
    const sh = hauteurApercu / echelle;

    // Résolution de sortie : on garde une taille raisonnable plutôt que
    // le fichier original (souvent bien plus gros que nécessaire pour un
    // avatar 64px ou une carte de 320px de large) — 960px de large max,
    // l'aspect ratio demandé décide de la hauteur.
    const largeurSortie = Math.min(960, sw);
    const hauteurSortie = largeurSortie / aspect;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(largeurSortie);
    canvas.height = Math.round(hauteurSortie);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) onValider(blob);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-dj-bordure bg-dj-surface p-4">
        <p className="mb-3 text-sm font-medium text-dj-texte">Cadre ton image</p>

        <div
          ref={conteneurRef}
          className="relative mx-auto touch-none select-none overflow-hidden rounded-lg border border-dj-bordure-forte bg-dj-surface-haute"
          style={{ width: LARGEUR_APERCU, height: hauteurApercu, cursor: "grab" }}
          onMouseDown={(e) => debutGlisse(e.clientX, e.clientY)}
          onMouseMove={(e) => pendantGlisse(e.clientX, e.clientY)}
          onMouseUp={finGlisse}
          onMouseLeave={finGlisse}
          onTouchStart={(e) => debutGlisse(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => pendantGlisse(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={finGlisse}
        >
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: decalage.x,
                top: decalage.y,
                width: image.naturalWidth * echelle,
                height: image.naturalHeight * echelle,
                maxWidth: "none",
              }}
            />
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-dj-texte-muet">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onAnnuler}
            className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte-muet transition-colors hover:border-dj-bordure-forte"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={valider}
            disabled={!image}
            className="rounded-full bg-dj-gradient px-4 py-2 text-xs font-medium text-dj-texte disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
