import { createClient } from "@supabase/supabase-js";

// Décision d'architecture (voir api/PLAN.md, point 1) : Next.js parle
// DIRECTEMENT à Supabase Auth via ce client JS. Le backend FastAPI ne gère
// jamais de mot de passe — il ne fait que vérifier le token envoyé.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cleAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !cleAnon) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis (voir .env.local.example)."
  );
}

// Un seul client, réutilisé partout — évite de recréer une connexion à
// chaque appel et garde la session (stockée par supabase-js) cohérente
// entre les pages.
export const supabase = createClient(url, cleAnon);
