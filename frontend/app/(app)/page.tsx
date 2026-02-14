/**
 * New Conversation Page — /
 *
 * Default state: no conversation selected.
 * Shows the ChatPanel with welcome screen + chat input.
 * When user sends first message, a conversation is created
 * and they're redirected to /c/[id].
 */
import { ChatPanel } from "@/components/chat/chat-panel";

export default function NewConversationPage() {
  return <ChatPanel conversationId={null} />;
}
