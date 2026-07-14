"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";

export default function PageInscription() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
    });

    setEnCours(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="Djiguignè AI" width={36} height={36} priority />
          <span className="font-display text-lg font-bold tracking-tight text-dj-texte">
            Djiguignè <span className="text-dj-accent-1">AI</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          <h1 className="font-display text-xl font-bold text-dj-texte">Créer un compte</h1>

          <form onSubmit={gererSoumission} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dj-texte-muet">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1"
              />
            </div>

            <ChampMotDePasse
              id="mot-de-passe"
              value={motDePasse}
              onChange={setMotDePasse}
              autoComplete="new-password"
            />

            {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded-full bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {enCours ? "Création…" : "Créer mon compte"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-dj-texte-muet">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-dj-accent-1 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
