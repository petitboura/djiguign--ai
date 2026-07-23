"use client";

import { useState } from "react";
import { appelerApi } from "@/lib/api";
import { ChatIA } from "./ChatIA";
import { MessageAffiche } from "./BulleMessage";
import { SidebarChat, FilConversation } from "./SidebarChat";
import { PanneauProvider, usePanneau } from "./PanneauContext";
import { PanneauPreview } from "./PanneauPreview";

// Composant client qui porte l'état de "quel fil de conversation est
// affiché" -- ajouté le 2026-07-16 pour brancher la sidebar façon
// Streamlit (SidebarChat.tsx) sur ChatIA, qui elle ne gère plus son
// conversation_id en interne (voir ChatIA.tsx). ChatIA est remonté à
// chaque changement de fil via `key={cle}` : le plus simple pour repartir
// d'un état interne propre (messages, popup de feedback...) sans dupliquer
// sa logique ici.
//
// PanneauProvider (2026-07-20, voir PanneauContext.tsx) enveloppe tout le
// reste : le panneau doit survivre au remount de ChatIA (key={cle}) pour
// ne pas se refermer à chaque envoi de message, mais doit quand même se
// réinitialiser explicitement au changement de FIL de conversation (voir
// reinitialiser() dans nouvelleConversation/selectionnerConversation
// ci-dessous) -- son historique appartient au fil affiché, pas à la page.
export function ChatAgentClient(props: {
  agent: {
    id: string;
    nom: string;
    icone_page: string;
    titre_accueil: string;
    sous_titre_accueil: string;
  };
}) {
  return (
    <PanneauProvider>
      <ChatAgentClientInterne {...props} />
    </PanneauProvider>
  );
}

function ChatAgentClientInterne({
  agent,
}: {
  agent: {
    id: string;
    nom: string;
    icone_page: string;
    titre_accueil: string;
    sous_titre_accueil: string;
  };
}) {
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const [messagesInitiaux, setMessagesInitiaux] = useState<MessageAffiche[]>([]);
  const [nbMessages, setNbMessages] = useState(0);
  const { reinitialiser } = usePanneau();

  function nouvelleConversation() {
    setCle(crypto.randomUUID());
    setMessagesInitiaux([]);
    setNbMessages(0);
    reinitialiser();
  }

  async function selectionnerConversation(fil: FilConversation) {
    try {
      const cheminId = fil.conversation_id ?? "legacy";
      const lignes: { role: "user" | "assistant"; content: string; created_at: string }[] =
        await appelerApi(`/api/historique/${agent.id}/conversations/${cheminId}`);
      // Même règle que côté Streamlit (_charger_messages_conversation +
      // son appelant) : un fil "legacy" (conversation_id NULL en base)
      // repart sur un tout nouveau conversation_id pour les PROCHAINS
      // messages -- on ne continue jamais à écrire avec conversation_id
      // NULL, seulement à relire ce qui existait déjà avant cette
      // fonctionnalité. Conséquence identique à Streamlit : après avoir
      // rouvert un fil "legacy", aucune entrée de la liste ne réapparaît
      // comme "active" (fil.conversation_id est None, `cle` est un nouvel
      // uuid) -- pas une régression, le même comportement exact que
      // faces/vues/chat.py.
      setCle(fil.conversation_id ?? crypto.randomUUID());
      setMessagesInitiaux(lignes.map((l) => ({ id: null, role: l.role, content: l.content, created_at: l.created_at })));
      setNbMessages(lignes.length);
      reinitialiser();
    } catch {
      // Échec de rechargement : on laisse le fil courant tel quel plutôt
      // que de casser toute la page.
    }
  }

  return (
    <div className="flex h-screen">
      <SidebarChat
        agentId={agent.id}
        aDesMessages={nbMessages > 0}
        conversationActiveId={cle}
        onNouvelleConversation={nouvelleConversation}
        onSelectionnerConversation={selectionnerConversation}
      />
      <div className="flex-1 overflow-hidden">
        <ChatIA
          key={cle}
          agentId={agent.id}
          nomAgent={agent.nom}
          titreAccueil={agent.titre_accueil}
          sousTitreAccueil={agent.sous_titre_accueil}
          conversationId={cle}
          messagesInitiaux={messagesInitiaux}
          onMessagesChange={setNbMessages}
        />
      </div>
      <PanneauPreview />
    </div>
  );
}
