import { NextRequest, NextResponse } from "next/server";

// Récupère les métadonnées Open Graph (titre, image, description) d'une
// URL externe -- utilisé par components/chat/LinkPreview.tsx pour afficher
// un aperçu de lien dans le chat au lieu d'un lien souligné brut (demande
// de Bourama, 2026-07-20 : "n'importe quel lien génère un aperçu... comme
// dans n'importe quelle plateforme").
//
// Pourquoi une route serveur et pas un fetch direct côté client : la
// quasi-totalité des sites ne renvoient aucun en-tête CORS sur leur page
// HTML (normal, ce n'est pas fait pour être lu depuis un autre site) --
// un fetch() client vers une URL arbitraire échoue donc systématiquement.
// Le serveur, lui, n'est pas soumis à CORS.
export const runtime = "nodejs";

const DELAI_MAX_MS = 5000;
const TAILLE_MAX_OCTETS = 2 * 1024 * 1024; // 2 Mo -- largement assez pour le <head>, pas besoin de toute la page

// Garde-fou SSRF minimal : ce endpoint accepte n'importe quelle URL fournie
// par le modèle dans une réponse de chat, donc potentiellement non fiable.
// On bloque les cibles réseau internes évidentes plutôt que de les laisser
// atteindre l'infra interne (Supabase/Railway sur le même réseau privé).
// Pas une protection SSRF complète (pas de résolution DNS vérifiée), mais
// couvre le cas direct (URL littéralement interne).
function hoteInterne(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "0.0.0.0" ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === "::1"
  );
}

function extraireMeta(html: string, propriete: string): string | null {
  // Deux ordres d'attributs possibles (property="og:title" content="..."
  // OU content="..." property="og:title") -- les deux existent en pratique
  // selon comment le site a généré son HTML.
  const motifs = [
    new RegExp(`<meta[^>]+property=["']${propriete}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${propriete}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${propriete}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${propriete}["']`, "i"),
  ];
  for (const motif of motifs) {
    const trouve = html.match(motif);
    if (trouve?.[1]) return trouve[1];
  }
  return null;
}

export async function GET(request: NextRequest) {
  const urlBrute = request.nextUrl.searchParams.get("url");
  if (!urlBrute) {
    return NextResponse.json({ erreur: "Paramètre url manquant" }, { status: 400 });
  }

  let cible: URL;
  try {
    cible = new URL(urlBrute);
  } catch {
    return NextResponse.json({ erreur: "URL invalide" }, { status: 400 });
  }

  if (cible.protocol !== "http:" && cible.protocol !== "https:") {
    return NextResponse.json({ erreur: "Protocole non autorisé" }, { status: 400 });
  }
  if (hoteInterne(cible.hostname)) {
    return NextResponse.json({ erreur: "Cible non autorisée" }, { status: 400 });
  }

  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), DELAI_MAX_MS);

  try {
    const reponse = await fetch(cible.toString(), {
      signal: controleur.signal,
      redirect: "follow",
      headers: {
        // Beaucoup de sites servent une page allégée (voire bloquent) sans
        // en-tête User-Agent ressemblant à un navigateur.
        "User-Agent":
          "Mozilla/5.0 (compatible; DjiguigneLinkPreview/1.0; +https://djiguigne.com)",
        Accept: "text/html",
      },
    });

    if (!reponse.ok || !reponse.body) {
      return NextResponse.json({ erreur: `Cible a répondu ${reponse.status}` }, { status: 502 });
    }

    // Lecture bornée : on n'a besoin que du <head>, jamais de toute la
    // page (certaines pages font plusieurs Mo).
    const lecteur = reponse.body.getReader();
    let recu = 0;
    let html = "";
    const decodeur = new TextDecoder();
    while (recu < TAILLE_MAX_OCTETS) {
      const { done, value } = await lecteur.read();
      if (done) break;
      recu += value.byteLength;
      html += decodeur.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    controleur.abort(); // on a ce qu'il faut, pas la peine de continuer le téléchargement

    const titre = extraireMeta(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || null;
    let image = extraireMeta(html, "og:image");
    const description = extraireMeta(html, "og:description") || extraireMeta(html, "description");
    const siteName = extraireMeta(html, "og:site_name") || cible.hostname.replace(/^www\./, "");

    // og:image est parfois une URL relative -- rare mais arrive.
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, cible.toString()).toString();
      } catch {
        image = null;
      }
    }

    if (!titre && !image) {
      // Rien d'exploitable -- LinkPreview.tsx retombe sur le lien brut.
      return NextResponse.json({ erreur: "Aucune métadonnée trouvée" }, { status: 404 });
    }

    return NextResponse.json(
      { titre, image, description, siteName, url: cible.toString() },
      { headers: { "Cache-Control": "public, max-age=3600" } } // 1h : les métadonnées d'une page changent rarement
    );
  } catch {
    return NextResponse.json({ erreur: "Échec de récupération" }, { status: 502 });
  } finally {
    clearTimeout(delai);
  }
}
