"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi, appelerApiFichier } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { ChampImage } from "@/components/ChampImage";
import { PopupCategories, chargerCategories, type Categorie } from "@/components/PopupCategories";

// Étape "modifier un agent" (2026-07-12, demande de Bourama : "on ne peut
// pas modifier ces agents créés" — gros morceau manquant depuis le début
// du pivot social). Consomme GET/PATCH /api/agents/{id}/edition et
// /api/agents/{id} (voir api/agents.py, ajoutés à cette étape).
//
// Le formulaire édite le `system_prompt` BRUT (textarea), pas des champs
// séparés ton/posture/comportements comme à la création : ces champs ne
// sont jamais persistés individuellement en base (voir AgentEditable côté
// backend), seul le texte composé final survit. Même choix que
// faces/vues/mes_agents.py fait déjà côté Streamlit.

type AgentEditable = {
  id: string;
  nom: string;
  icone_page: string;
  system_prompt: string;
  notion_page_id: string | null;
  texte_libre: string;
  image_vitrine_url: string | null;
  description: string;
  sous_titre: string;
  placeholder_saisie: string;
  actif: boolean;
  categorie_id: string | null;
};

type DocumentIndexe = { nom_stockage: string; nom_affiche: string; url: string };

export default function PageModifierAgent() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [iconePage, setIconePage] = useState("🤖");
  const [imageVitrineUrl, setImageVitrineUrl] = useState("");
  const [description, setDescription] = useState("");
  // Ajouté le 2026-07-12 (Bourama : "le dashboard de modification aussi
  // changer") -- même correctif que le formulaire de création, distinct
  // de `description` (taille libre).
  const [sousTitre, setSousTitre] = useState("");
  const [placeholderSaisie, setPlaceholderSaisie] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [lienNotion, setLienNotion] = useState("");
  const [texteLibre, setTexteLibre] = useState("");
  // Même correctif que la page de création (2026-07-12, Bourama).
  const [pleinEcranTexteLibre, setPleinEcranTexteLibre] = useState(false);
  const [actif, setActif] = useState(true);
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [popupCategorieOuvert, setPopupCategorieOuvert] = useState(false);

  const [documents, setDocuments] = useState<DocumentIndexe[] | null>(null);
  const [nouveauPdf, setNouveauPdf] = useState<File | null>(null);
  const [envoiPdf, setEnvoiPdf] = useState(false);

  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

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
    if (!session || !agentId) return;

    appelerApi(`/api/agents/${agentId}/edition`)
      .then((r: AgentEditable) => {
        setNom(r.nom);
        setIconePage(r.icone_page || "🤖");
        setImageVitrineUrl(r.image_vitrine_url || "");
        setDescription(r.description || "");
        setSousTitre(r.sous_titre || "");
        setPlaceholderSaisie(r.placeholder_saisie || "");
        setSystemPrompt(r.system_prompt || "");
        setLienNotion(r.notion_page_id || "");
        setTexteLibre(r.texte_libre || "");
        setActif(r.actif);
        if (r.categorie_id) {
          const idCategorie = r.categorie_id;
          chargerCategories()
            .then((toutes) => {
              const trouvee = toutes.find((cat) => cat.id === idCategorie);
              setCategorie(trouvee ?? { id: idCategorie, nom: idCategorie, mots_cles: [], parent_id: null });
            })
            .catch(() => setCategorie({ id: idCategorie, nom: idCategorie, mots_cles: [], parent_id: null }));
        }
      })
      .catch((e) => setErreurChargement(e instanceof Error ? e.message : "Erreur inconnue."))
      .finally(() => setChargement(false));

    chargerDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, agentId]);

  function chargerDocuments() {
    appelerApi(`/api/agents/${agentId}/documents`)
      .then((r: DocumentIndexe[]) => setDocuments(r))
      .catch(() => setDocuments([]));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setMessage(null);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          nom,
          icone_page: iconePage,
          system_prompt: systemPrompt,
          lien_notion: lienNotion || null,
          texte_libre: texteLibre,
          image_vitrine_url: imageVitrineUrl || null,
          description,
          sous_titre: sousTitre,
          placeholder_saisie: placeholderSaisie,
          actif,
          categorie_id: categorie?.id,
        }),
      });
      setMessage("Agent mis à jour.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnregistrement(false);
    }
  }

  async function ajouterPdf() {
    if (!nouveauPdf) return;
    setEnvoiPdf(true);
    try {
      await appelerApiFichier(`/api/agents/${agentId}/documents`, nouveauPdf);
      setNouveauPdf(null);
      chargerDocuments();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Échec de l'ajout du PDF.");
    } finally {
      setEnvoiPdf(false);
    }
  }

  async function supprimerPdf(nomStockage: string) {
    if (!window.confirm(`Supprimer « ${nomStockage.split("__").slice(1).join("__")} » ?`)) return;
    try {
      await appelerApi(`/api/agents/${agentId}/documents/${encodeURIComponent(nomStockage)}`, {
        method: "DELETE",
      });
      chargerDocuments();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Échec de la suppression.");
    }
  }

  if (session === undefined || session === null) return null;
  if (chargement) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <p className="px-5 py-10 text-dj-texte-muet">Chargement...</p>
      </div>
    );
  }
  if (erreurChargement) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <p className="px-5 py-10 text-[#F87171]">{erreurChargement}</p>
      </div>
    );
  }

  const champClasse =
    "mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1";
  const labelClasse = "block text-sm font-medium text-dj-texte-muet";

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-5 flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <h1 className="font-display text-2xl font-bold text-dj-texte">Modifier {nom}</h1>

        <form onSubmit={enregistrer} className="mt-6 flex flex-col gap-8">
          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">Vitrine publique</h2>

            <div>
              <label className={labelClasse}>Nom de l&apos;agent</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className={champClasse} />
            </div>

            <div>
              <label className={labelClasse}>Icône</label>
              <input
                value={iconePage}
                onChange={(e) => setIconePage(e.target.value)}
                maxLength={4}
                className={`${champClasse} w-20 text-center text-xl`}
              />
            </div>

            <ChampImage
              label="Image de vitrine"
              valeur={imageVitrineUrl}
              onChange={setImageVitrineUrl}
            />

            <div>
              <label className={labelClasse}>Description publique</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Le texte de présentation de l&apos;agent (fiche, recherche) — aucune
                limite de taille.
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Catégorie</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Ce qui permet aux visiteurs de trouver ton agent par thème.
              </p>
              <button
                type="button"
                onClick={() => setPopupCategorieOuvert(true)}
                className={`${champClasse} flex items-center justify-between text-left`}
              >
                <span className={categorie ? "text-dj-texte" : "text-dj-texte-muet"}>
                  {categorie ? categorie.nom : "Choisir une catégorie..."}
                </span>
                <span aria-hidden="true">▾</span>
              </button>
              <PopupCategories
                ouvert={popupCategorieOuvert}
                onFermer={() => setPopupCategorieOuvert(false)}
                categorieActuelleId={categorie?.id}
                onChoisir={setCategorie}
              />
            </div>

            <div>
              <label className={labelClasse}>Phrase d&apos;accueil</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Une phrase courte, affichée sous le titre au tout premier écran du
                chat, avant le premier message — distincte de la description
                publique ci-dessus.
              </p>
              <input
                value={sousTitre}
                onChange={(e) => setSousTitre(e.target.value)}
                placeholder="Ex : Je t'aide à structurer ton entraînement de la semaine."
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Texte de la barre de saisie</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Le texte affiché en fond dans le champ où l&apos;utilisateur écrit son
                message (avant qu&apos;il commence à taper).
              </p>
              <input
                value={placeholderSaisie}
                onChange={(e) => setPlaceholderSaisie(e.target.value)}
                placeholder="Pose ta question..."
                className={champClasse}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-dj-texte">
              <input
                type="checkbox"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
              />
              Agent actif (visible et utilisable publiquement)
            </label>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">Comportement</h2>
            <div>
              <label className={labelClasse}>System prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={10}
                className={`${champClasse} font-mono text-sm`}
              />
              <p className="mt-1 text-xs text-dj-texte-muet">
                C&apos;est le texte complet qui pilote le comportement de l&apos;agent — le
                modifier ici remplace directement ce qui avait été généré à la création.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              Base de connaissance
            </h2>

            <div>
              <label className={labelClasse}>Lien ou ID d&apos;une page Notion</label>
              <input
                value={lienNotion}
                onChange={(e) => setLienNotion(e.target.value)}
                placeholder="https://www.notion.so/..."
                className={champClasse}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClasse}>Connaissance libre</label>
                <button
                  type="button"
                  onClick={() => setPleinEcranTexteLibre(true)}
                  className="text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
                >
                  Plein écran ⤢
                </button>
              </div>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Pour une connaissance étendue que l&apos;agent doit avoir, mais qui
                n&apos;existe pas en PDF ou qui change souvent. Aucune limite de
                taille.
              </p>
              <textarea
                value={texteLibre}
                onChange={(e) => setTexteLibre(e.target.value)}
                rows={8}
                className={`${champClasse} resize-y`}
              />
            </div>

            {pleinEcranTexteLibre && (
              <div className="fixed inset-0 z-50 flex flex-col bg-dj-fond p-5">
                <div className="flex items-center justify-between pb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-dj-texte">
                      Connaissance libre
                    </h2>
                    <p className="text-xs text-dj-texte-muet">
                      Pour une connaissance étendue, pas en PDF, ou qui change
                      souvent. Aucune limite de taille.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPleinEcranTexteLibre(false)}
                    className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                  >
                    Fermer
                  </button>
                </div>
                <textarea
                  value={texteLibre}
                  onChange={(e) => setTexteLibre(e.target.value)}
                  autoFocus
                  className={`${champClasse} flex-1 resize-none font-mono text-sm`}
                />
              </div>
            )}
          </section>

          {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={enregistrement}
              className="rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
            {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
          </div>
        </form>

        <section className="mt-10 flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-dj-texte">Documents PDF indexés</h2>

          {documents === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
          {documents?.length === 0 && (
            <p className="text-sm text-dj-texte-muet">Aucun PDF indexé pour cet agent.</p>
          )}
          {documents && documents.length > 0 && (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <div
                  key={doc.nom_stockage}
                  className="flex items-center justify-between rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3"
                >
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-dj-accent-1 hover:text-dj-accent-2"
                  >
                    {doc.nom_affiche}
                  </a>
                  <button
                    onClick={() => supprimerPdf(doc.nom_stockage)}
                    className="text-xs text-dj-texte-muet transition-colors hover:text-[#F87171]"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setNouveauPdf(e.target.files?.[0] ?? null)}
              className="text-sm text-dj-texte file:mr-3 file:rounded-full file:border file:border-dj-bordure file:bg-dj-surface-haute file:px-4 file:py-2 file:text-xs file:text-dj-texte hover:file:border-dj-bordure-forte"
            />
            <button
              type="button"
              onClick={ajouterPdf}
              disabled={!nouveauPdf || envoiPdf}
              className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
            >
              {envoiPdf ? "Envoi…" : "Ajouter"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
