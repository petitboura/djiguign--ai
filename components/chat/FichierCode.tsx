"use client";

import { useMemo, useState } from "react";
import { FileCode, ChevronDown, ChevronUp, Copy, Check, Download, Loader2 } from "lucide-react";
import hljs from "highlight.js";

// Extensions de code reconnues -> langage highlight.js. Volontairement
// distinct de FichierChip.tsx (documents bureautiques/archives/données) :
// un fichier de code livré seul (depuis le fix de generer_code, voir
// core/generation_code.py côté backend, 2026-07-20 -- un .py seul n'est
// plus forcé dans un .zip) mérite un vrai aperçu coloré, pas juste une
// carte "télécharger" comme un PDF.
const LANGAGE_PAR_EXTENSION: Record<string, string> = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  html: "xml",
  css: "css",
  sh: "bash",
  bash: "bash",
  sql: "sql",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  rs: "rust",
  php: "php",
  rb: "ruby",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  toml: "ini",
};

export function extensionCode(href: string): string | null {
  const match = href.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in LANGAGE_PAR_EXTENSION ? ext : null;
}

export function FichierCode({ href, nom }: { href: string; nom: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [contenu, setContenu] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [copie, setCopie] = useState(false);

  const extension = extensionCode(href) || "";
  const langage = LANGAGE_PAR_EXTENSION[extension] || "plaintext";

  const html = useMemo(() => {
    if (!contenu) return "";
    try {
      return hljs.getLanguage(langage) ? hljs.highlight(contenu, { language: langage }).value : hljs.highlightAuto(contenu).value;
    } catch {
      return contenu.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    }
  }, [contenu, langage]);

  async function basculer() {
    if (!ouvert && contenu === null && !chargement) {
      setChargement(true);
      try {
        const reponse = await fetch(href);
        if (!reponse.ok) throw new Error();
        setContenu(await reponse.text());
      } catch {
        setErreur(true);
      } finally {
        setChargement(false);
      }
    }
    setOuvert((v) => !v);
  }

  function copier() {
    if (!contenu) return;
    navigator.clipboard.writeText(contenu).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    });
  }

  return (
    <div className="my-2 max-w-full animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface-haute">
      <button onClick={basculer} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dj-gradient text-[#1A0D02]">
          <FileCode size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-dj-texte">{nom}</span>
          <span className="block text-[11px] uppercase text-dj-texte-muet">{extension}</span>
        </span>
        {chargement ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-dj-texte-muet" />
        ) : ouvert ? (
          <ChevronUp size={16} className="shrink-0 text-dj-texte-muet" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-dj-texte-muet" />
        )}
      </button>

      {ouvert && (
        <div className="border-t border-dj-bordure">
          {erreur ? (
            <div className="flex items-center justify-between px-3 py-3 text-xs text-dj-texte-muet">
              <span>Aperçu indisponible.</span>
              <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-dj-accent-1 hover:text-dj-accent-2">
                <Download size={13} /> Télécharger
              </a>
            </div>
          ) : contenu !== null ? (
            <>
              <div className="flex items-center justify-end gap-1 border-b border-dj-bordure px-2 py-1">
                <button
                  onClick={copier}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
                >
                  {copie ? (
                    <>
                      <Check size={12} /> Copié
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copier
                    </>
                  )}
                </button>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
                >
                  <Download size={12} /> Télécharger
                </a>
              </div>
              <pre className="max-h-96 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
                <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
              </pre>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
