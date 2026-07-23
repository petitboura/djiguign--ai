"use client";

import { useEffect, useMemo, useState } from "react";
import { X, History, AppWindow, FileCode, FileText, Copy, Check, Download, Loader2 } from "lucide-react";
import hljs from "highlight.js";
import { usePanneau, ItemPanneau } from "./PanneauContext";
import { construireDocumentWidget } from "./WidgetSandbox";
import { extensionCode } from "./FichierCode";

const LANGAGE_PAR_EXTENSION: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  html: "xml", css: "css", sh: "bash", bash: "bash", sql: "sql", java: "java", c: "c",
  cpp: "cpp", go: "go", rs: "rust", php: "php", rb: "ruby", yml: "yaml", yaml: "yaml",
  md: "markdown", toml: "ini",
};

function VueCode({ href }: { href: string }) {
  const [contenu, setContenu] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    let annule = false;
    setContenu(null);
    setErreur(false);
    fetch(href)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((texte) => !annule && setContenu(texte))
      .catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
    };
  }, [href]);

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

  function copier() {
    if (!contenu) return;
    navigator.clipboard.writeText(contenu).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    });
  }

  if (erreur) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-dj-texte-muet">
        <p>Aperçu indisponible.</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-dj-accent-1 hover:text-dj-accent-2">
          <Download size={14} /> Télécharger le fichier
        </a>
      </div>
    );
  }

  if (contenu === null) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-dj-texte-muet">
        <Loader2 size={16} className="animate-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b border-dj-bordure px-2 py-1.5">
        <button onClick={copier} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-dj-texte-muet hover:text-dj-texte">
          {copie ? (
            <>
              <Check size={13} /> Copié
            </>
          ) : (
            <>
              <Copy size={13} /> Copier
            </>
          )}
        </button>
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-dj-texte-muet hover:text-dj-texte">
          <Download size={13} /> Télécharger
        </a>
      </div>
      <pre className="flex-1 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

function iconePour(type: ItemPanneau["type"]) {
  if (type === "widget") return AppWindow;
  if (type === "code") return FileCode;
  return FileText;
}

export function PanneauPreview() {
  const { ouvert, itemActif, historique, ouvrirDansPanneau, fermer } = usePanneau();
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

  if (!ouvert || !itemActif) return null;

  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-l border-dj-bordure bg-dj-fond">
      <div className="flex items-center gap-2 border-b border-dj-bordure px-3 py-2.5">
        <div className="relative">
          <button
            onClick={() => setHistoriqueOuvert((v) => !v)}
            disabled={historique.length <= 1}
            aria-label="Historique du panneau"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-dj-texte-muet hover:bg-dj-surface hover:text-dj-texte disabled:opacity-30"
          >
            <History size={16} />
          </button>
          {historiqueOuvert && historique.length > 1 && (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 animate-dj-fade-in rounded-xl border border-dj-bordure bg-dj-surface-haute py-1 shadow-lg">
              {historique.map((item) => {
                const Icone = iconePour(item.type);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      ouvrirDansPanneau(item);
                      setHistoriqueOuvert(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-dj-surface ${
                      item.id === itemActif.id ? "text-dj-accent-1" : "text-dj-texte"
                    }`}
                  >
                    <Icone size={14} className="shrink-0" />
                    <span className="truncate">{item.titre}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <span className="flex-1 truncate text-sm font-medium text-dj-texte">{itemActif.titre}</span>
        <button onClick={fermer} aria-label="Fermer le panneau" className="flex h-8 w-8 items-center justify-center rounded-lg text-dj-texte-muet hover:bg-dj-surface hover:text-dj-texte">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {itemActif.type === "widget" && (
          <iframe
            key={itemActif.id}
            sandbox="allow-scripts allow-forms allow-modals"
            srcDoc={construireDocumentWidget(itemActif.code)}
            className="h-full w-full"
            title={itemActif.titre}
          />
        )}
        {itemActif.type === "code" && <VueCode key={itemActif.id} href={itemActif.href} />}
        {itemActif.type === "pdf" && (
          <iframe key={itemActif.id} src={itemActif.href} className="h-full w-full" title={itemActif.titre} />
        )}
      </div>
    </aside>
  );
}
