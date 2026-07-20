import { FileText, FileSpreadsheet, Presentation, File, Download } from "lucide-react";

const EXTENSIONS_FICHIER: Record<string, { icone: typeof File; libelle: string }> = {
  pdf: { icone: FileText, libelle: "PDF" },
  doc: { icone: FileText, libelle: "Word" },
  docx: { icone: FileText, libelle: "Word" },
  xls: { icone: FileSpreadsheet, libelle: "Excel" },
  xlsx: { icone: FileSpreadsheet, libelle: "Excel" },
  csv: { icone: FileSpreadsheet, libelle: "CSV" },
  ppt: { icone: Presentation, libelle: "PowerPoint" },
  pptx: { icone: Presentation, libelle: "PowerPoint" },
};

// Détecte si un lien markdown pointe vers un fichier "document" (PDF,
// Word, Excel, PowerPoint...) via son extension d'URL, et si oui le
// remplace par une carte fichier au lieu d'un <a> souligné brut. Le
// composant `a` custom dans BulleMessage.tsx appelle `extensionFichier()`
// et bascule vers ce composant quand elle correspond, sinon rend le lien
// normal -- pas de régression sur les liens web classiques.
export function extensionFichier(href: string): string | null {
  const match = href.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in EXTENSIONS_FICHIER ? ext : null;
}

export function FichierChip({ href, nom }: { href: string; nom: string }) {
  const infos = extensionFichier(href);
  const { icone: Icone, libelle } = infos ? EXTENSIONS_FICHIER[infos] : { icone: File, libelle: "Fichier" };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 flex w-fit max-w-full animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2.5 no-underline transition-colors hover:border-dj-bordure-forte"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dj-gradient text-[#1A0D02]">
        <Icone size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-dj-texte">{nom}</span>
        <span className="block text-[11px] text-dj-texte-muet">{libelle}</span>
      </span>
      <Download size={14} className="ml-1 shrink-0 text-dj-texte-muet" />
    </a>
  );
}
