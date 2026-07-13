import Link from "next/link";
import Image from "next/image";

// Ajouté le 2026-07-13 (demande de Bourama) : contrepartie de AgentCard
// pour les créateurs, mais volontairement plus compacte — "une bulle
// rectangulaire, coins très arrondis, photo à gauche, nom, nombre
// d'agents créés, début de la bio si elle est longue". Pas de grande
// image de vitrine comme AgentCard : c'est une liste à parcourir
// rapidement, pas des vignettes à admirer une par une.
export type CreateurResume = {
  user_id: string;
  nom_affiche: string;
  bio?: string;
  avatar_url?: string | null;
  nombre_agents: number;
};

export function CreateurCard({ createur }: { createur: CreateurResume }) {
  const nom = createur.nom_affiche || "Créateur sans nom";

  return (
    <Link
      href={`/u/${createur.user_id}`}
      className="flex items-center gap-4 rounded-[2rem] border border-dj-bordure bg-dj-surface px-5 py-4 transition-colors hover:border-dj-bordure-forte"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-dj-surface-haute">
        {createur.avatar_url ? (
          <Image
            src={createur.avatar_url}
            alt={nom}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl">🙂</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-base font-bold text-dj-texte">{nom}</h3>
        <p className="text-xs text-dj-texte-muet">
          {createur.nombre_agents} agent{createur.nombre_agents !== 1 ? "s" : ""} créé
          {createur.nombre_agents !== 1 ? "s" : ""}
        </p>
        {createur.bio && (
          <p className="mt-1 line-clamp-1 text-sm text-dj-texte-muet">{createur.bio}</p>
        )}
      </div>
    </Link>
  );
}
