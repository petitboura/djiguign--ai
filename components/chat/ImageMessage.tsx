"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Remplace le <img> par défaut de ReactMarkdown (![alt](url) en markdown).
// Deux problèmes réglés par rapport au <img> nu :
//   1. Saut de layout : rien ne réserve d'espace tant que l'image n'a pas
//      chargé -> les messages en dessous "sautent" au chargement. Ici on
//      démarre invisible (opacity-0) et on ne fait le fondu qu'au onLoad,
//      dans un conteneur qui a déjà sa taille max définie.
//   2. Zoom : clic pour agrandir en plein écran (lightbox), pratique pour
//      lire un diagramme ou un tableau capturé en image.
export function ImageMessage({ src, alt }: { src?: string; alt?: string }) {
  const [chargee, setChargee] = useState(false);
  const [ouverte, setOuverte] = useState(false);

  if (!src) return null;

  return (
    <>
      <button
        onClick={() => setOuverte(true)}
        className="my-2 block max-h-96 overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface"
        aria-label={alt || "Agrandir l'image"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- source dynamique fournie par le modèle, pas un asset local optimisable */}
        <img
          src={src}
          alt={alt || ""}
          onLoad={() => setChargee(true)}
          className={`max-h-96 w-auto transition-opacity duration-500 ${chargee ? "opacity-100" : "opacity-0"}`}
        />
      </button>

      {ouverte && (
        <div
          className="fixed inset-0 z-50 flex animate-dj-fade-in items-center justify-center bg-black/85 p-6"
          onClick={() => setOuverte(false)}
        >
          <button
            aria-label="Fermer"
            className="absolute right-5 top-5 text-dj-texte-muet hover:text-dj-texte"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt || ""} className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}
