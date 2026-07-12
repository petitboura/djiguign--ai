"use server";

import { revalidatePath } from "next/cache";

// Le portfolio public (`/u/[id]`) est mis en cache 30s côté serveur
// (voir lib/api-serveur.ts, `next: { revalidate: 30 }`) pour ne pas
// taper l'API à chaque visite -- mais ça veut dire que juste après avoir
// sauvegardé son profil sur /dashboard, la page publique pouvait montrer
// la version d'avant pendant jusqu'à 30 secondes (bug remonté par
// Bourama). Plutôt que de supprimer le cache (le portfolio redeviendrait
// une requête API à chaque visite, y compris pour un simple visiteur),
// on invalide À LA DEMANDE juste cette page précise dès que sa sauvegarde
// réussit -- le cache reste utile pour tout le monde, mais ne ment
// jamais à la personne qui vient de modifier son propre profil.
export async function revaliderPortfolioPublic(userId: string) {
  revalidatePath(`/u/${userId}`);
}
