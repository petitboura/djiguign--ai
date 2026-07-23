"use client";

import { useEffect, useRef, useState } from "react";
import { Pin, Mic, Square, AudioLines, ArrowUp, X, MapPin, Github } from "lucide-react";
import { transcrireAudioChat, statutConnexion, demarrerConnexion } from "@/lib/api";

export type LongueurReponse = "courte" | "moyenne" | "longue";
export type LocalisationJointe = { latitude: number; longitude: number } | null;

// Types acceptés par le sélecteur de fichier -- élargi le 2026-07-20 pour
// couvrir images (Gemini vision), documents PDF/Word/Excel (extraction
// texte) ET vidéo (audio transcrit + frames analysées par Gemini), voir
// api/uploads.py.
const TYPES_FICHIERS_ACCEPTES =
  "image/jpeg,image/png,image/webp," +
  "application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "video/mp4,video/webm,video/quicktime";

export function BarreDeSaisie({
  onEnvoyer,
  desactive,
  agentId,
}: {
  onEnvoyer: (
    texte: string,
    longueur: LongueurReponse,
    fichier: File | null,
    localisation: LocalisationJointe
  ) => void;
  desactive?: boolean;
  agentId?: string;
}) {
  const [texte, setTexte] = useState("");
  const [longueur, setLongueur] = useState<LongueurReponse>("moyenne");
  const [fichier, setFichier] = useState<File | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  // Dictée vocale (2026-07-20) : enregistrement micro réel via
  // MediaRecorder, transcrit par Whisper/Groq (api/uploads.py:
  // uploader_audio_chat) puis ajouté au texte -- pas d'envoi automatique,
  // l'étudiant garde la main pour relire/corriger avant d'envoyer.
  const [dictant, setDictant] = useState(false);
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Localisation (2026-07-20) : jointe explicitement via ce bouton, jamais
  // capturée en silence -- voir core/main.py:chat(), paramètre
  // `localisation`, injecté en contexte de prompt système.
  const [localisation, setLocalisation] = useState<LocalisationJointe>(null);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);

  // Connexion GitHub (2026-07-22) : bouton dédié, style de l'app (pas les
  // couleurs de marque GitHub) -- voir connexions/oauth_generique.py et
  // core/serveur_mcp_github.py côté backend. `null` = statut pas encore
  // connu (chargement), évite un flash "non connecté" au premier rendu.
  const [githubConnecte, setGithubConnecte] = useState<boolean | null>(null);
  const [githubEnCours, setGithubEnCours] = useState(false);

  useEffect(() => {
    statutConnexion("github")
      .then((r) => setGithubConnecte(r.connecte))
      .catch(() => setGithubConnecte(false));
  }, []);

  async function connecterGithub() {
    if (githubConnecte) return; // déjà connecté, rien à faire ici
    setGithubEnCours(true);
    try {
      const { url, erreur } = await demarrerConnexion("github", agentId);
      if (url) {
        window.location.href = url;
      } else {
        alert(erreur || "Connexion GitHub indisponible pour le moment.");
        setGithubEnCours(false);
      }
    } catch {
      alert("Connexion GitHub indisponible pour le moment.");
      setGithubEnCours(false);
    }
  }

  function pasDisponible() {
    alert("Pas disponible pour le moment.");
  }

  function envoyer() {
    if (!texte.trim() || desactive) return;
    onEnvoyer(texte, longueur, fichier, localisation);
    setTexte("");
    setFichier(null);
    setLocalisation(null);
  }

  async function demarrerDictee() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((piste) => piste.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setTranscriptionEnCours(true);
        try {
          const fichierAudio = new File([blob], "dictee.webm", { type: blob.type });
          const { texte: transcrit } = await transcrireAudioChat(fichierAudio);
          setTexte((prec) => (prec.trim() ? `${prec} ${transcrit}` : transcrit));
        } catch (e) {
          // Message générique remplacé le 2026-07-20 : masquait la vraie
          // cause (non connecté / audio vide-silencieux / vraie erreur
          // serveur) derrière un seul texte, impossible à diagnostiquer
          // depuis le retour utilisateur.
          alert(e instanceof Error ? e.message : "Je n'ai pas compris, réessaie.");
        } finally {
          setTranscriptionEnCours(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setDictant(true);
    } catch {
      alert("Micro indisponible ou refusé.");
    }
  }

  function arreterDictee() {
    mediaRecorderRef.current?.stop();
    setDictant(false);
  }

  function toggleLocalisation() {
    if (localisation) {
      setLocalisation(null);
      return;
    }
    if (!navigator.geolocation) {
      alert("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    setLocalisationEnCours(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalisation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocalisationEnCours(false);
      },
      () => {
        alert("Position refusée ou indisponible.");
        setLocalisationEnCours(false);
      }
    );
  }

  return (
    <div className="w-full">
      {/* Vignettes d'aperçu (fichier joint / position jointe), avant envoi. */}
      {(fichier || localisation) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {fichier && (
            <div className="flex w-fit items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs text-dj-texte-muet">
              <span className="max-w-[180px] truncate">{fichier.name}</span>
              <button onClick={() => setFichier(null)} aria-label="Retirer le fichier" className="hover:text-dj-texte">
                <X size={14} />
              </button>
            </div>
          )}
          {localisation && (
            <div className="flex w-fit items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs text-dj-texte-muet">
              <MapPin size={14} />
              <span>Position jointe</span>
              <button onClick={() => setLocalisation(null)} aria-label="Retirer la position" className="hover:text-dj-texte">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rectangle à coins arrondis (plus une pilule ovale complète), tous
          les éléments alignés en bas -- voir section 3.3. */}
      <div className="rounded-3xl border border-dj-bordure bg-dj-surface-haute px-4 py-3 focus-within:border-dj-bordure-forte">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          placeholder={transcriptionEnCours ? "Transcription en cours..." : "Pose ta question..."}
          rows={1}
          className="max-h-40 w-full resize-none bg-transparent text-[15px] text-dj-texte outline-none placeholder:text-dj-texte-muet"
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Punaise (remplace le "+"), contour monochrome, même fonction
                (upload fichier) -- section 3.3. Accepte images ET documents
                depuis le 2026-07-20 (voir TYPES_FICHIERS_ACCEPTES). */}
            <button
              onClick={() => inputFichierRef.current?.click()}
              aria-label="Joindre un fichier"
              className="text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <Pin size={18} />
            </button>
            <input
              ref={inputFichierRef}
              type="file"
              accept={TYPES_FICHIERS_ACCEPTES}
              className="hidden"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />

            {/* Connexion GitHub (2026-07-22) : icône de marque, couleurs et
                style de l'app (dj-texte-muet/dj-accent-1), pas les couleurs
                GitHub -- voir connexions/oauth_generique.py côté backend.
                Point vert discret quand déjà connecté. */}
            <button
              onClick={connecterGithub}
              disabled={githubEnCours}
              aria-label={githubConnecte ? "Connecté à GitHub" : "Connecter GitHub"}
              title={githubConnecte ? "Connecté à GitHub" : "Connecter GitHub"}
              className={
                githubConnecte
                  ? "relative text-dj-accent-1 transition-colors"
                  : "relative text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
              }
            >
              <Github size={18} />
              {githubConnecte && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />
              )}
            </button>

            {/* Position (2026-07-20) : jointe/retirée à chaque message,
                jamais capturée automatiquement -- clic = permission navigateur. */}
            <button
              onClick={toggleLocalisation}
              disabled={localisationEnCours}
              aria-label={localisation ? "Retirer la position" : "Joindre ma position"}
              className={
                localisation
                  ? "text-dj-texte transition-colors"
                  : "text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
              }
            >
              <MapPin size={18} />
            </button>

            {/* Sélecteur Courte/Moyenne/Longue (remplace "Sonnet 5/Moyen"),
                modifiable à chaque message -- section 3.3. */}
            <select
              value={longueur}
              onChange={(e) => setLongueur(e.target.value as LongueurReponse)}
              className="rounded-md bg-transparent text-xs text-dj-texte-muet outline-none"
            >
              <option value="courte">Courte</option>
              <option value="moyenne">Moyenne</option>
              <option value="longue">Longue</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {dictant ? (
              <button
                onClick={arreterDictee}
                aria-label="Arrêter la dictée"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <Square size={14} />
              </button>
            ) : texte.trim() ? (
              <button
                onClick={envoyer}
                disabled={desactive}
                aria-label="Envoyer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-dj-gradient text-[#1A0D02] disabled:opacity-60"
              >
                <ArrowUp size={16} />
              </button>
            ) : (
              <>
                {/* Micro = dictée vocale, branché le 2026-07-20 (voir
                    demarrerDictee/arreterDictee ci-dessus). Waveform = mode
                    vocal complet (conversation continue) -- PAS branché,
                    portée bien plus large qu'une simple dictée, laissé de
                    côté pour l'instant. */}
                <button
                  onClick={demarrerDictee}
                  disabled={transcriptionEnCours}
                  aria-label="Dictée vocale"
                  className="text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
                >
                  <Mic size={18} />
                </button>
                <button onClick={pasDisponible} aria-label="Mode vocal" className="text-dj-texte-muet transition-colors hover:text-dj-texte">
                  <AudioLines size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
