/**
 * Conversation Page — /c/[id]
 *
 * Loads an existing conversation and renders the full chat experience.
 * Messages are fetched from the API on mount.
 * New messages stream in real-time via SSE.
 */
import { ChatPanel } from "@/components/chat/chat-panel";

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params;

  return <ChatPanel conversationId={id} />;
}
