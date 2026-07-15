import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { BoutonPartager } from "@/components/BoutonPartager";
import { ChatIA } from "@/components/chat/ChatIA";

// Remplace chat.py (Streamlit sur Railway) -- voir MIGRATION_CHAT_VERS_NEXTJS.md,
// section 0 et phase 2. Tout reste dans la même app Next.js/Vercel : plus de
// saut entre domaines, donc plus du tout le bug remonté par Bourama
// (plein écran / retour qui ouvraient une "nouvelle page" à chaque fois).

type AgentDetailPublic = {
  id: string;
  nom: string;
  icone_page: string;
};

async function chargerAgent(id: string): Promise<AgentDetailPublic | null> {
  return appelerApiPublicOuNull(`/api/agents/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const agent = await chargerAgent(params.id);
  if (!agent) return { title: "IA introuvable — Djiguignè AI" };
  return { title: `Discuter avec ${agent.nom} — Djiguignè AI` };
}

export default async function PageChatAgent({ params }: { params: { id: string } }) {
  const agent = await chargerAgent(params.id);
  if (!agent) notFound();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-dj-bordure px-4 py-3">
        <div className="flex items-center gap-2">
          <BoutonRetour />
          <BoutonAccueil />
          <span className="ml-1 flex items-center gap-2 text-dj-texte">
            <span className="text-xl leading-none">{agent.icone_page}</span>
            <span className="font-display font-semibold">{agent.nom}</span>
          </span>
        </div>
        <BoutonPartager chemin={`/agent/${agent.id}/chat`} titre={agent.nom} />
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatIA agentId={agent.id} nomAgent={agent.nom} />
      </div>
    </div>
  );
}
