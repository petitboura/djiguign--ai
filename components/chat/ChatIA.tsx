"use client";

import { useState } from "react";
import { appelerApiStream } from "@/lib/api";
import { BulleMessage, MessageAffiche } from "./BulleMessage";
import { BarreDeSaisie, LongueurReponse } from "./BarreDeSaisie";
import { PopupFeedback } from "./PopupFeedback";

// Page de chat qui remplace chat.py (Streamlit) -- voir
// MIGRATION_CHAT_VERS_NEXTJS.md, section 0 et phase 2. Consomme la
// nouvelle route /api/chat (api/chat.py) en streaming, au lieu d'appeler
// chat() directement en process comme le faisait Streamlit.
//
// conversationId/messagesInitiaux contrôlés par le parent depuis le
// 2026-07-16 (ajout de la sidebar façon Streamlit, voir SidebarChat.tsx) :
// permet de recharger un ancien fil (Historique) ou d'en démarrer un
// nouveau en remontant simplement ce composant (key={conversationId} côté
// parent), sans changer sa logique interne d'envoi/streaming.
export function ChatIA({
  agentId,
  nomAgent,
  titreAccueil,
  sousTitreAccueil,
  conversationId,
  messagesInitiaux = [],
  onMessagesChange,
}: {
  agentId: string;
  nomAgent: string;
  titreAccueil?: string;
  sousTitreAccueil?: string;
  conversationId: string;
  messagesInitiaux?: MessageAffiche[];
  onMessagesChange?: (nbMessages: number) => void;
}) {
  const [messages, setMessages] = useState<MessageAffiche[]>(messagesInitiaux);
  const [genEnCours, setGenEnCours] = useState(false);
  const [popupFeedback, setPopupFeedback] = useState<{
    type: "positif" | "negatif";
    messageId: number;
    questionMessageId: number | null;
  } | null>(null);

  function majMessages(fabriqueSuivant: (prec: MessageAffiche[]) => MessageAffiche[]) {
    setMessages((prec) => {
      const suivant = fabriqueSuivant(prec);
      onMessagesChange?.(suivant.length);
      return suivant;
    });
  }

  async function envoyerMessage(texte: string, longueur: LongueurReponse, _fichier: File | null) {
    // Upload de fichier : pas encore branché côté route /api/chat (voir
    // section 4, "petit à petit") -- le fichier est sélectionné/prévisualisé
    // mais pas encore transmis au backend à cette étape.
    const messageUtilisateur: MessageAffiche = {
      id: null,
      role: "user",
      content: texte,
      created_at: new Date().toISOString(),
    };
    const historiquePourApi = messages.map((m) => ({ role: m.role, content: m.content }));

    majMessages((prec) => [...prec, messageUtilisateur, { id: null, role: "assistant", content: "" }]);
    setGenEnCours(true);

    try {
      await appelerApiStream(
        "/api/chat",
        {
          message: texte,
          agent_id: agentId,
          historique: historiquePourApi,
          conversation_id: conversationId,
          longueur_reponse: longueur,
        },
        (evenement) => {
          if (evenement.type === "reponse") {
            majMessages((prec) => {
              const copie = [...prec];
              const dernier = copie[copie.length - 1];
              copie[copie.length - 1] = { ...dernier, content: dernier.content + evenement.texte };
              return copie;
            });
          } else if (evenement.type === "meta") {
            majMessages((prec) => {
              const copie = [...prec];
              const iAssistant = copie.length - 1;
              const iUser = copie.length - 2;
              copie[iAssistant] = {
                ...copie[iAssistant],
                id: evenement.message_id_assistant,
                created_at: evenement.created_at_assistant,
              };
              if (iUser >= 0) copie[iUser] = { ...copie[iUser], id: evenement.message_id_user };
              return copie;
            });
          }
          // "statut" / "statut_termine" / "confirmation_requise" : pas
          // encore affichés dans cette première version de la page --
          // suivi en Phase 4 (branchement progressif).
        }
      );
    } catch (e) {
      majMessages((prec) => {
        const copie = [...prec];
        copie[copie.length - 1] = {
          ...copie[copie.length - 1],
          content: "Une erreur est survenue, réessaie dans un instant.",
        };
        return copie;
      });
    } finally {
      setGenEnCours(false);
    }
  }

  function regenererDepuis(index: number) {
    // index = position du message ASSISTANT à régénérer ; on renvoie le
    // message utilisateur juste avant, et on retire les deux de la liste
    // affichée avant de les recréer via envoyerMessage.
    const messageUtilisateur = messages[index - 1];
    if (!messageUtilisateur) return;
    majMessages((prec) => prec.slice(0, index - 1));
    envoyerMessage(messageUtilisateur.content, "moyenne", null);
  }

  function editerMessage(index: number, nouveauTexte: string) {
    // Tronque tout ce qui suit (y compris la réponse assistant concernée)
    // et relance avec le message modifié -- section 3.1.
    majMessages((prec) => prec.slice(0, index));
    envoyerMessage(nouveauTexte, "moyenne", null);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          titreAccueil ? (
            <div className="mb-4 mt-6">
              <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-dj-texte">{titreAccueil}</h1>
              {sousTitreAccueil && <p className="mt-1 text-sm text-dj-texte-muet">{sousTitreAccueil}</p>}
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-dj-texte-muet">Pose ta question à {nomAgent}...</p>
          )
        )}
        {messages.map((message, index) => (
          <BulleMessage
            key={index}
            message={message}
            onRegenerer={
              message.role === "assistant"
                ? () => regenererDepuis(index)
                : () => envoyerMessage(message.content, "moyenne", null)
            }
            onEditer={message.role === "user" ? (texte) => editerMessage(index, texte) : undefined}
            onLike={
              message.role === "assistant" && message.id
                ? () => setPopupFeedback({ type: "positif", messageId: message.id!, questionMessageId: messages[index - 1]?.id ?? null })
                : undefined
            }
            onDislike={
              message.role === "assistant" && message.id
                ? () => setPopupFeedback({ type: "negatif", messageId: message.id!, questionMessageId: messages[index - 1]?.id ?? null })
                : undefined
            }
          />
        ))}
      </div>

      <div className="px-4 pb-6">
        <BarreDeSaisie onEnvoyer={envoyerMessage} desactive={genEnCours} />
      </div>

      {popupFeedback && (
        <PopupFeedback
          type={popupFeedback.type}
          conversationId={conversationId}
          messageId={popupFeedback.messageId}
          questionMessageId={popupFeedback.questionMessageId}
          agentId={agentId}
          onFerme={() => setPopupFeedback(null)}
          onEnvoye={() => setPopupFeedback(null)}
        />
      )}
    </div>
  );
}
