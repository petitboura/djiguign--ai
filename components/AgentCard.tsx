import Link from "next/link";
import Image from "next/image";

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

export function AgentCard({ agent }: { agent: AgentResume }) {
  return (
    <Link
      href={`/agent/${agent.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface transition-colors hover:border-dj-bordure-forte"
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-dj-surface-haute">
        {agent.image_vitrine_url ? (
          <Image
            src={agent.image_vitrine_url}
            alt={agent.nom}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        ) : (
          <span className="text-4xl">{agent.icone_page ?? "🤖"}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{agent.icone_page ?? "🤖"}</span>
          <h3 className="font-display text-base font-bold text-dj-texte">{agent.nom}</h3>
        </div>
        {agent.description && (
          <p className="line-clamp-2 text-sm text-dj-texte-muet">{agent.description}</p>
        )}
      </div>
    </Link>
  );
}
