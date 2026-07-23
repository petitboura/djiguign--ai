"use client";

import { FileCode } from "lucide-react";
import { usePanneau } from "./PanneauContext";

// Extensions de code reconnues -> langage highlight.js (utilisé aussi par
// PanneauPreview.tsx pour le rendu réel). Un fichier de code livré seul
// (voir le fix backend generation_code.py, 2026-07-20 : un .py seul n'est
// plus forcé dans un .zip) ouvre désormais le panneau latéral au lieu
// d'un mode repliable dans le fil -- cohérent avec les widgets, un seul
// endroit pour "voir en grand" (voir PanneauContext.tsx).
const EXTENSIONS_CODE = [
  "py", "js", "jsx", "ts", "tsx", "html", "css", "sh", "bash", "sql", "java",
  "c", "cpp", "go", "rs", "php", "rb", "yml", "yaml", "md", "toml",
];

export function extensionCode(href: string): string | null {
  const match = href.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && EXTENSIONS_CODE.includes(ext) ? ext : null;
}

export function FichierCode({ href, nom }: { href: string; nom: string }) {
  const { ouvrirDansPanneau, itemActif } = usePanneau();
  const extension = extensionCode(href) || "";
  const estActif = itemActif?.type === "code" && itemActif.href === href;

  return (
    <button
      onClick={() => ouvrirDansPanneau({ id: href, type: "code", titre: nom, href })}
      className="my-2 flex w-full max-w-sm animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface-haute p-3 text-left transition-colors hover:border-dj-bordure-forte"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dj-gradient text-[#1A0D02]">
        <FileCode size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-dj-texte">{nom}</span>
        <span className="block text-[11px] uppercase text-dj-texte-muet">
          {estActif ? "Affiché dans le panneau" : extension}
        </span>
      </span>
    </button>
  );
}
