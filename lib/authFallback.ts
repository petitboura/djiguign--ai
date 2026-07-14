import { supabase } from "@/lib/supabase";
import type { AuthError, Session, User } from "@supabase/supabase-js";

export type IdentifiantsAuth = { email: string; password: string } | { phone: string; password: string };

export type ResultatAuth = {
  session: Session | null;
  user: User | null;
  error: AuthError | null;
};

/**
 * Supabase masque volontairement si un compte existe déjà (pour éviter
 * l'énumération d'emails/numéros) : signUp() sur un identifiant déjà utilisé
 * ne renvoie PAS d'erreur explicite, juste une réponse sans session active.
 * C'est le seul signal fiable qu'on a pour détecter "ce compte existe déjà".
 */

/** Page inscription : si le compte existe déjà, tente une connexion avec les mêmes identifiants. */
export async function inscrireOuConnecter(identifiants: IdentifiantsAuth): Promise<ResultatAuth> {
  const { data, error } = await supabase.auth.signUp(identifiants);

  if (error) return { session: null, user: null, error };
  if (data.session) return { session: data.session, user: data.user, error: null };

  // Pas d'erreur mais pas de session : le compte existe déjà. On retente en connexion.
  const resultat = await supabase.auth.signInWithPassword(identifiants);
  return { session: resultat.data.session, user: resultat.data.user, error: resultat.error };
}

/** Page connexion : si aucun compte n'existe, crée le compte avec les mêmes identifiants. */
export async function connecterOuInscrire(identifiants: IdentifiantsAuth): Promise<ResultatAuth> {
  const resultatConnexion = await supabase.auth.signInWithPassword(identifiants);
  if (!resultatConnexion.error) {
    return {
      session: resultatConnexion.data.session,
      user: resultatConnexion.data.user,
      error: null,
    };
  }

  const resultatInscription = await supabase.auth.signUp(identifiants);

  if (resultatInscription.error) {
    // Erreur de connexion d'origine, plus parlante pour la personne.
    return { session: null, user: null, error: resultatConnexion.error };
  }

  if (resultatInscription.data.session) {
    // Aucun compte n'existait : on vient d'en créer un, la personne est connectée.
    return { session: resultatInscription.data.session, user: resultatInscription.data.user, error: null };
  }

  // Un compte existait déjà (signUp n'a pas ouvert de session) : l'échec de
  // connexion d'origine était donc un vrai mauvais mot de passe.
  return { session: null, user: null, error: resultatConnexion.error };
}
