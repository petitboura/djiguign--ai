"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi, appelerApiFichier } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { ChampImage } from "@/components/ChampImage";

// Étape D.6 (pivot social) : formulaire de création d'agent, nouveau flow
// (voir PIVOT_SOCIAL.md — nom → icône → image vitrine → description →
// config technique, ordre inchangé côté "config technique" par rapport à
// faces/vues/creer_agent.py). Payload construit pour matcher EXACTEMENT
// `CreerAgentPayload` (api/agents.py) — champ par champ, mêmes valeurs de
// `ton`/`type_connaissance` que le formulaire Streamlit (copiées depuis
// faces/vues/creer_agent.py, pas réinventées, pour rester compatible avec
// composer_system_prompt qui interprète ces chaînes exactes côté backend).
//
// VOLONTAIREMENT PAS INCLUS ICI :
// - Sélection d'outils (outils_choisis) : la Streamlit lit SERVEURS_MCP
//   dynamiquement (registre_outils.py), rien n'est exposé par l'API pour
//   lister les outils disponibles côté frontend. outils_choisis envoyé
//   vide ([]) — un agent créé depuis le Next.js n'a aucun outil activé
//   pour l'instant, à corriger avec un nouvel endpoint GET /api/outils
//   plus tard.
// - Upload de PDF : POST /api/agents lui-même ne le gère pas (voir
//   docstring d'api/agents.py, "SANS l'upload de PDF"), c'est
//   POST /api/agents/{id}/documents (Étape 2 de api/PLAN.md) — pas
//   construit côté frontend ici, agent créable sans PDF (Notion et texte
//   libre restent possibles).

const TON_OPTIONS = ["Tutoiement (tu)", "Vouvoiement (vous)"];

const TYPE_CONNAISSANCE_OPTIONS = [
  "Factuelle et stable (ex: grille tarifaire, procédures — la fraîcheur et l'exactitude priment)",
  "Méthodologique et pédagogique (ex: façon d'expliquer, exemples — sert de méthode plutôt que de faits figés)",
];

const NB_LIGNES_COMPORTEMENT = 4;

type LigneComportement = { type_requete: string; comportement: string };

export default function PageCreerAgent() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [nom, setNom] = useState("");
  const [iconePage, setIconePage] = useState("🤖");
  const [imageVitrineUrl, setImageVitrineUrl] = useState("");
  const [description, setDescription] = useState("");

  const [ton, setTon] = useState(TON_OPTIONS[0]);
  const [postureGenerale, setPostureGenerale] = useState("");
  const [limitesGlobales, setLimitesGlobales] = useState("");
  const [comportements, setComportements] = useState<LigneComportement[]>(
    Array.from({ length: NB_LIGNES_COMPORTEMENT }, () => ({
      type_requete: "",
      comportement: "",
    }))
  );

  const [typeConnaissance, setTypeConnaissance] = useState(TYPE_CONNAISSANCE_OPTIONS[0]);
  const [descriptionConnaissance, setDescriptionConnaissance] = useState("");
  const [lienNotion, setLienNotion] = useState("");
  const [texteLibre, setTexteLibre] = useState("");
  const [fichierPdf, setFichierPdf] = useState<File | null>(null);

  const [envoi, setEnvoi] = useState(false);
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

  function majComportement(i: number, champ: keyof LigneComportement, valeur: string) {
    setComportements((prev) =>
      prev.map((ligne, idx) => (idx === i ? { ...ligne, [champ]: valeur } : ligne))
    );
  }

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!nom.trim()) {
      setErreur("Le nom de l'agent est obligatoire.");
      return;
    }
    if (!postureGenerale.trim() && !limitesGlobales.trim()) {
      setErreur("Remplis au moins la posture générale ou les limites globales.");
      return;
    }

    setEnvoi(true);
    let idAgentCree: string | null = null;
    try {
      const reponse = await appelerApi("/api/agents", {
        method: "POST",
        body: JSON.stringify({
          nom,
          ton,
          posture_generale: postureGenerale,
          limites_globales: limitesGlobales,
          comportements: comportements.filter(
            (l) => l.type_requete.trim() || l.comportement.trim()
          ),
          outils_choisis: [],
          type_connaissance: typeConnaissance,
          description_connaissance: descriptionConnaissance,
          lien_notion: lienNotion || null,
          texte_libre: texteLibre,
          ui_config: { icone_page: iconePage || "🤖" },
          image_vitrine_url: imageVitrineUrl || null,
          description,
        }),
      });
      idAgentCree = reponse.id;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setEnvoi(false);
      return;
    }

    // Le PDF est indexé APRÈS coup (POST /api/agents/{id}/documents,
    // ajouté le 2026-07-12 — voir api/agents.py) : l'agent a besoin
    // d'exister d'abord. Best-effort, même logique que
    // faces/vues/creer_agent.py : un échec d'indexation n'annule pas la
    // création déjà actée, juste un avertissement avant de continuer.
    if (fichierPdf && idAgentCree) {
      try {
        await appelerApiFichier(`/api/agents/${idAgentCree}/documents`, fichierPdf);
      } catch (e) {
        window.alert(
          `L'agent est créé, mais le PDF n'a pas pu être indexé : ${
            e instanceof Error ? e.message : "erreur inconnue"
          }. Tu pourras réessayer depuis "Mes agents".`
        );
      }
    }

    router.push(`/agent/${idAgentCree}`);
  }

  if (session === undefined || session === null) return null;

  const champClasse =
    "mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1";
  const labelClasse = "block text-sm font-medium text-dj-texte-muet";

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-2xl font-bold text-dj-texte">Créer un agent</h1>

        <form onSubmit={gererSoumission} className="mt-6 flex flex-col gap-8">
          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">Vitrine publique</h2>

            <div>
              <label className={labelClasse}>Nom de l&apos;agent</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className={champClasse}
              />
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
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={champClasse}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              1. Identité de base
            </h2>

            <div>
              <label className={labelClasse}>Ton</label>
              <select
                value={ton}
                onChange={(e) => setTon(e.target.value)}
                className={champClasse}
              >
                {TON_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasse}>Posture générale</label>
              <input
                value={postureGenerale}
                onChange={(e) => setPostureGenerale(e.target.value)}
                placeholder="Ex: patient et pédagogue"
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>
                Limites globales — ce que l&apos;agent ne fait JAMAIS
              </label>
              <textarea
                value={limitesGlobales}
                onChange={(e) => setLimitesGlobales(e.target.value)}
                rows={3}
                className={champClasse}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              2. Comportement selon le type de requête
            </h2>
            <p className="text-sm text-dj-texte-muet">
              Optionnel — laisse vide ce que tu ne remplis pas.
            </p>

            {comportements.map((ligne, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <input
                  value={ligne.type_requete}
                  onChange={(e) => majComportement(i, "type_requete", e.target.value)}
                  placeholder="Ex: Exercice, Réclamation..."
                  className={champClasse}
                />
                <input
                  value={ligne.comportement}
                  onChange={(e) => majComportement(i, "comportement", e.target.value)}
                  placeholder="Comportement attendu"
                  className={champClasse}
                />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              3. Base de connaissance
            </h2>

            <div>
              <label className={labelClasse}>Nature de la connaissance</label>
              <div className="mt-2 flex flex-col gap-2">
                {TYPE_CONNAISSANCE_OPTIONS.map((o) => (
                  <label key={o} className="flex items-start gap-2 text-sm text-dj-texte">
                    <input
                      type="radio"
                      name="type_connaissance"
                      checked={typeConnaissance === o}
                      onChange={() => setTypeConnaissance(o)}
                      className="mt-1"
                    />
                    {o}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClasse}>
                En une phrase, quel type d&apos;information l&apos;agent doit-il connaître ?
              </label>
              <textarea
                value={descriptionConnaissance}
                onChange={(e) => setDescriptionConnaissance(e.target.value)}
                rows={2}
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Lien ou ID d&apos;une page Notion (optionnel)</label>
              <input
                value={lienNotion}
                onChange={(e) => setLienNotion(e.target.value)}
                placeholder="https://www.notion.so/..."
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Texte de connaissance libre (optionnel)</label>
              <textarea
                value={texteLibre}
                onChange={(e) => setTexteLibre(e.target.value)}
                rows={4}
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Document PDF (optionnel)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFichierPdf(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-dj-texte file:mr-3 file:rounded-full file:border file:border-dj-bordure file:bg-dj-surface-haute file:px-4 file:py-2 file:text-xs file:text-dj-texte hover:file:border-dj-bordure-forte"
              />
              {fichierPdf && (
                <p className="mt-1 text-xs text-dj-texte-muet">{fichierPdf.name}</p>
              )}
            </div>
          </section>

          {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

          <button
            type="submit"
            disabled={envoi}
            className="self-start rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {envoi ? "Création…" : "Créer l'agent"}
          </button>
        </form>
      </main>
    </div>
  );
}
