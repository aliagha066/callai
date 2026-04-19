import { ChatWindow } from "@/components/ChatWindow";

export const metadata = {
  title: "Chat",
  description: "Calm companion chat — type or speak to start a conversation.",
};

export default function ChatPage() {
  return <ChatWindow brandName="CallAI" />;
}

