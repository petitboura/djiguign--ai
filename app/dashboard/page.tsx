"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { revaliderPortfolioPublic } from "@/app/actions";
import { AgentCard, type AgentResume } from "@/components/AgentCard";
import { TopBar } from "@/components/TopBar";
import { ChampImage } from "@/components/ChampImage";

// Étape D.5 (pivot social). Dashboard PRIVÉ, existe pour tout compte
// connecté dès l'inscription (voir PIVOT_SOCIAL.md, section "Compte
// unifié" — pas de rôle "créateur" séparé). Client Component (pas de SSR
// possible ici : la session Supabase vit dans le localStorage du
// navigateur, pas dans un cookie lisible côté serveur — même contrainte
// que app/connexion/page.tsx).
//
// VOLONTAIREMENT PAS INCLUS ICI : connexion aux outils externes (Notion).
// Le OAuth Notion (démarrer_connexion_notion, finaliser_connexion_notion)
// n'existe qu'en Streamlit (connexions/notion.py), rien n'est exposé par
// l'API FastAPI pour l'instant — construire ce pont (callback OAuth,
// redirect URI à revoir) est un morceau à part, pas fait ici. En
// attendant, la connexion Notion reste possible via le fallback déjà prévu
// dans le chat Streamlit (voir PIVOT_SOCIAL.md, "Chemin de connexion à un
// outil externe"). Prochaine IA : ne pas improviser ce pont sans en
// discuter avec Bourama d'abord, le redirect URI OAuth enregistré chez
// Notion pointe probablement encore vers l'app Streamlit en prod.

type ProfilMoi = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
};

export default function PageDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [profil, setProfil] = useState<ProfilMoi | null>(null);
  const [nomAffiche, setNomAffiche] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageProfil, setMessageProfil] = useState<string | null>(null);

  const [agents, setAgents] = useState<AgentResume[] | null>(null);

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
    const monId = session.user.id;

    // GET /api/profiles/{user_id} sert aussi bien au portfolio public
    // (Étape D.4) qu'ici pour "Mes agents" : même endpoint, mêmes
    // données, pas besoin d'un endpoint dédié. 404 tolérée (pas encore de
    // ligne `profiles` pour ce compte tant que PATCH /me n'a jamais été
    // appelé, voir PIVOT_SOCIAL.md) — dans ce cas, formulaire vide et
    // liste d'agents vide plutôt qu'une erreur.
    appelerApi(`/api/profiles/${monId}`)
      .then((r: ProfilMoi & { agents: AgentResume[] }) => {
        setProfil(r);
        setNomAffiche(r.nom_affiche || "");
        setBio(r.bio || "");
        setAvatarUrl(r.avatar_url || "");
        setAgents(r.agents || []);
      })
      .catch(() => {
        setAgents([]);
      });
  }, [session]);

  async function enregistrerProfil(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setMessageProfil(null);
    try {
      await appelerApi("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({
          nom_affiche: nomAffiche,
          bio,
          avatar_url: avatarUrl || null,
        }),
      });
      // Sans ça, /u/[id] pouvait montrer l'ancienne version jusqu'à 30s
      // après la sauvegarde (cache de lib/api-serveur.ts) -- voir
      // app/actions.ts pour le détail. `session` est garanti non-null ici
      // (le formulaire n'est rendu qu'après vérification de la session).
      // Try séparé : la sauvegarde elle-même a déjà réussi juste au-dessus,
      // un souci sur la seule revalidation ne doit pas faire croire à un
      // échec de sauvegarde.
      try {
        await revaliderPortfolioPublic(session!.user.id);
      } catch (erreurRevalidation) {
        console.error("Revalidation du portfolio public échouée :", erreurRevalidation);
      }
      setMessageProfil("Profil enregistré.");
    } catch (e) {
      setMessageProfil(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnregistrement(false);
    }
  }

  if (session === undefined) return null; // Session pas encore vérifiée.
  if (session === null) return null; // Redirection en cours.

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-10">
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-bold text-dj-texte">Mon profil</h1>

          <form
            onSubmit={enregistrerProfil}
            className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6"
          >
            <div>
              <label className="block text-sm font-medium text-dj-texte-muet">
                Nom affiché
              </label>
              <input
                value={nomAffiche}
                onChange={(e) => setNomAffiche(e.target.value)}
                className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dj-texte-muet">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1"
              />
            </div>

            <ChampImage label="Avatar" valeur={avatarUrl} onChange={setAvatarUrl} rond />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              {messageProfil && (
                <span className="text-sm text-dj-texte-muet">{messageProfil}</span>
              )}
            </div>
          </form>

          {profil && (
            <Link
              href={`/u/${profil.user_id}`}
              className="self-start text-sm text-dj-accent-1 transition-colors hover:text-dj-accent-2"
            >
              Voir mon portfolio public →
            </Link>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-dj-texte">Mes agents</h2>
            <Link
              href="/dashboard/agents/nouveau"
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              + Créer un agent
            </Link>
          </div>

          {agents === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
          {agents?.length === 0 && (
            <p className="text-sm text-dj-texte-muet">Aucun agent créé pour l'instant.</p>
          )}
          {agents && agents.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex flex-col gap-2">
                  <AgentCard agent={agent} />
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/agents/${agent.id}/modifier`}
                      className="self-start text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
                    >
                      Modifier →
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(`${window.location.origin}/agent/${agent.id}`)
                      }
                      className="self-start text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
                    >
                      Copier le lien
                    </button>
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
