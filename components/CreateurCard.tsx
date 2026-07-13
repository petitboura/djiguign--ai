import Link from "next/link";
import Image from "next/image";
import { BoutonFollow } from "@/components/BoutonFollow";

// Ajouté le 2026-07-13 (demande de Bourama), ajusté le même jour suite à
// son retour sur le premier essai :
// - "X agents créés" -> juste "X Agent(s)" (mot "créé(s)" retiré)
// - le nombre passe dans une bulle à bordure colorée, juste devant le nom
//   (plus une ligne de texte séparée en dessous)
// - bouton Suivre ajouté à l'autre bout de la carte
//
// La carte n'est plus un unique <Link> comme au premier essai : le bouton
// Suivre a sa propre logique de clic (BoutonFollow) qui ne doit pas
// déclencher la navigation vers /u/[id] en même temps. Seule la partie
// avatar + nom + bio est cliquable (enveloppée dans son propre Link) ;
// le bouton Suivre est un frère, pas un enfant du Link.
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
    <div className="flex items-center gap-4 rounded-[2rem] border border-dj-bordure bg-dj-surface px-5 py-4 transition-colors hover:border-dj-bordure-forte">
      <Link href={`/u/${createur.user_id}`} className="flex min-w-0 flex-1 items-center gap-4">
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
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full border border-dj-accent-1 px-2 py-0.5 text-xs font-medium text-dj-accent-1">
              {createur.nombre_agents} Agent{createur.nombre_agents !== 1 ? "s" : ""}
            </span>
            <h3 className="truncate font-display text-base font-bold text-dj-texte">{nom}</h3>
          </div>
          {createur.bio && (
            <p className="mt-1 line-clamp-1 text-sm text-dj-texte-muet">{createur.bio}</p>
          )}
        </div>
      </Link>

      <div className="shrink-0">
        <BoutonFollow creatorId={createur.user_id} />
      </div>
    </div>
  );
}
