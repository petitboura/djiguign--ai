"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { revaliderPortfolioPublic } from "@/app/actions";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { ChampImage } from "@/components/ChampImage";

// Formulaire d'édition de profil, déplacé depuis app/dashboard/page.tsx
// le 2026-07-12 (Bourama : "Mon espace" doit maintenant ressembler au
// portfolio public vu par tout le monde, plus 4 boutons ["Modifier le
// profil", "Modifier un agent", "Publier un article", "Amis et
// Analytique"] pas encore branchés -- on les branche un par un). Le code
// de ce formulaire ne change pas, fonctionnel tel quel, juste déplacé
// pour ne pas le perdre : PAS ENCORE LIÉ depuis le bouton "Modifier le
// profil" de /dashboard, qui affiche pour l'instant un simple message
// (voir docstring de /dashboard). Prochaine étape : faire pointer ce
// bouton vers cette page.

type ProfilMoi = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
};

export default function PageModifierProfil() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [nomAffiche, setNomAffiche] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageProfil, setMessageProfil] = useState<string | null>(null);

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
    appelerApi(`/api/profiles/${session.user.id}`)
      .then((r: ProfilMoi) => {
        setNomAffiche(r.nom_affiche || "");
        setBio(r.bio || "");
        setAvatarUrl(r.avatar_url || "");
      })
      .catch(() => {
        // 404 tolérée : pas encore de ligne `profiles` pour ce compte
        // tant que PATCH /me n'a jamais été appelé -- formulaire vide.
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
      // app/actions.ts. Try séparé : la sauvegarde a déjà réussi
      // juste au-dessus, un souci sur la seule revalidation ne doit pas
      // faire croire à un échec de sauvegarde.
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

  if (session === undefined || session === null) return null;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10">
        <BoutonRetour />
        <h1 className="font-display text-2xl font-bold text-dj-texte">Modifier le profil</h1>

        <form
          onSubmit={enregistrerProfil}
          className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6"
        >
          <div>
            <label className="block text-sm font-medium text-dj-texte-muet">Nom affiché</label>
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
            {messageProfil && <span className="text-sm text-dj-texte-muet">{messageProfil}</span>}
          </div>
        </form>
      </main>
    </div>
  );
}
