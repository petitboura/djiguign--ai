import { supabase } from "./supabase";

// URL du backend FastAPI (voir api/main.py). En local pendant le dev :
// http://localhost:8000. Une fois déployé sur Railway : l'URL publique de
// ce service (pas encore un domaine définitif tant que djiguigne.com n'est
// pas branché — voir RAILWAY_DEPLOY.md du dépôt assistant-etudiants).
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL est requis (voir .env.local.example).");
}

/**
 * Appelle l'API avec le token Supabase de la session en cours, si elle
 * existe. N'échoue pas si personne n'est connecté : certaines routes sont
 * publiques (ex: /api/feed, /api/search) et n'ont pas besoin de token.
 */
export async function appelerApi(chemin: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const entetes = new Headers(options.headers);
  entetes.set("Content-Type", "application/json");
  if (session?.access_token) {
    entetes.set("Authorization", `Bearer ${session.access_token}`);
  }

  const reponse = await fetch(`${API_URL}${chemin}`, {
    ...options,
    headers: entetes,
  });

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Erreur API ${reponse.status} sur ${chemin} : ${detail}`);
  }

  // Certaines routes (ex: POST .../rating) renvoient 204 No Content —
  // aucun corps à parser. Sans ce garde-fou, response.json() plante avec
  // "Unexpected end of JSON input" (bug remonté par Bourama, 2026-07-12,
  // sur le clic étoile de la note). content-length à "0" couvre aussi le
  // cas d'un corps vide envoyé avec un autre code que 204.
  if (reponse.status === 204 || reponse.headers.get("content-length") === "0") {
    return null;
  }

  return reponse.json();
}

/**
 * Variante de appelerApi pour l'upload de fichiers (multipart/form-data).
 * Ajoutée pour le fix du 2026-07-12 (champs URL image remplacés par un
 * vrai upload, voir components/ChampImage.tsx). Pas de
 * Content-Type manuel : le navigateur doit le fixer lui-même avec le
 * boundary du FormData, le mettre à la main casse l'upload.
 */
export async function appelerApiFichier(chemin: string, fichier: File) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer une image.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);

  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Erreur API ${reponse.status} sur ${chemin} : ${detail}`);
  }

  return reponse.json();
}
