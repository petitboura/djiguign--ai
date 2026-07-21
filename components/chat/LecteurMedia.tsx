const EXTENSIONS_AUDIO = ["mp3", "wav", "ogg", "m4a"];
const EXTENSIONS_VIDEO = ["mp4", "webm", "mov"];

export function typeMedia(href: string): "audio" | "video" | null {
  const ext = href.split("?")[0].split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (EXTENSIONS_AUDIO.includes(ext)) return "audio";
  if (EXTENSIONS_VIDEO.includes(ext)) return "video";
  return null;
}

// Lecteur natif HTML5 (pas de dépendance externe) pour les liens markdown
// qui pointent vers un fichier audio/vidéo -- le composant `a` custom de
// BulleMessage.tsx bascule ici quand `typeMedia()` reconnaît l'extension.
export function LecteurMedia({ href, type }: { href: string; type: "audio" | "video" }) {
  return (
    <span className="my-2 block animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface p-2">
      {type === "audio" ? (
        <audio controls src={href} className="w-full" />
      ) : (
        <video controls src={href} className="max-h-80 w-full rounded-lg" />
      )}
    </span>
  );
}
