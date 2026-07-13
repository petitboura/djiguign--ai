"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { AgentCard, type AgentResume } from "@/components/AgentCard";
import { TopBar } from "@/components/TopBar";
import { BoutonFollow } from "@/components/BoutonFollow";
import { BoutonPartager } from "@/components/BoutonPartager";

// Refonte du 2026-07-12 (Bourama) : "Mon espace" doit ressembler
// EXACTEMENT au portfolio public tel que tout le monde le voit
// (/u/[id]) -- même avatar/nom/bio/agents -- sauf que :
// - pas de bouton "Suivre" (on ne se suit pas soi-même, déjà géré par
//   BoutonFollow lui-même, voir components/BoutonFollow.tsx)
// - le nombre d'abonnés reste visible (bug corrigé le même jour :
//   BoutonFollow masquait aussi le compteur pour son propre profil,
//   pas seulement le bouton)
//
// 4 boutons ajoutés ("Modifier le profil", "Modifier un agent",
// "Publier un article", "Amis et Analytique") : AUCUN n'est branché
// pour l'instant, sur demande explicite de Bourama ("pour l'instant met
// les boutons, et un message qui s'affiche avant branchement, en gros ce
// que les gens vont voir" -- on les branche un par un après). Cliquer
// affiche juste un message, ne navigue nulle part. Le formulaire
// d'édition de profil qui vivait ici avant existe toujours, déplacé vers
// app/dashboard/profil/modifier/page.tsx, prêt à être lié depuis
// "Modifier le profil" quand ce sera son tour.

type ProfilMoi = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
  agents: AgentResume[];
};

const BOUTONS_ESPACE = [
  "Modifier le profil",
  "Modifier un agent",
  "Publier un article",
  "Amis",
  "Analytique",
] as const;

export default function PageDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);
  const [profil, setProfil] = useState<ProfilMoi | null>(null);
  const [messageBouton, setMessageBouton] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/connexion");
        return;
      }
      setSession(session);
    });
  }, [router]);

  useEffect(() => {
    if (!session) return;
    // GET /api/profiles/{user_id} sert aussi bien au portfolio public
    // (Étape D.4) qu'ici -- même endpoint, mêmes données. 404 tolérée
    // (pas encore de ligne `profiles` tant que la page
    // /dashboard/profil/modifier n'a jamais été enregistrée) : profil
    // vide plutôt qu'une erreur bloquante.
    appelerApi(`/api/profiles/${session.user.id}`)
      .then((r: ProfilMoi) => setProfil(r))
      .catch(() =>
        setProfil({
          user_id: session.user.id,
          nom_affiche: "",
          bio: "",
          avatar_url: null,
          agents: [],
        })
      );
  }, [session]);

  function cliquerBouton(libelle: string) {
    setMessageBouton(`« ${libelle} » arrive bientôt, pas encore branché.`);
  }

  if (session === undefined || session === null) return null;

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-dj-bordure bg-dj-surface-haute">
            {profil?.avatar_url ? (
              <Image
                src={profil.avatar_url}
                alt={profil.nom_affiche || "Moi"}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-dj-texte">
            {profil?.nom_affiche || "Mon espace"}
          </h1>

          {profil?.bio && <p className="max-w-md text-dj-texte-muet">{profil.bio}</p>}

          {profil && (
            <div className="flex items-center gap-3">
              <BoutonFollow creatorId={profil.user_id} />
              <BoutonPartager
                chemin={`/u/${profil.user_id}`}
                titre={profil.nom_affiche || "Mon portfolio"}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-3">
            {BOUTONS_ESPACE.map((libelle) => (
              <button
                key={libelle}
                type="button"
                onClick={() => cliquerBouton(libelle)}
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                {libelle}
              </button>
            ))}
          </div>
          {messageBouton && (
            <p className="text-sm text-dj-texte-muet">{messageBouton}</p>
          )}
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-dj-texte">
              Agents créés ({profil?.agents.length ?? 0})
            </h2>
            <Link
              href="/dashboard/agents/nouveau"
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              + Créer un agent
            </Link>
          </div>

          {profil === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
          {profil?.agents.length === 0 && (
            <p className="text-sm text-dj-texte-muet">Aucun agent créé pour l'instant.</p>
          )}
          {profil && profil.agents.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {profil.agents.map((agent) => (
                <div key={agent.id} className="flex flex-col gap-2">
                  <AgentCard agent={agent} />
                  <div className="flex items-center gap-3">
                    <BoutonPartager
                      chemin={`/agent/${agent.id}`}
                      titre={agent.nom}
                      libelle="Partager"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
