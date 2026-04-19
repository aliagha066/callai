export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
};

export const sampleMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content:
      "Hi — I’m CallAI, a calm companion for everyday conversation. Say what’s on your mind, or ask a question. You can type below, use the mic, or open Voice in the header. Tone and voice live in Settings.",
  },
  {
    id: "m2",
    role: "user",
    content:
      "I’ve been feeling overwhelmed, but I don’t want a “motivational speech”. Just something calm.",
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "That makes sense. Let’s keep it gentle: what’s the smallest part of it we can name right now?",
  },
  {
    id: "m4",
    role: "user",
    content: "Pressure. Like I’m behind and everyone can tell.",
  },
  {
    id: "m5",
    role: "assistant",
    content:
      "Thank you for saying it clearly. If it helps, we can slow down and separate “behind” from “being judged”. Which one feels louder?",
  },
];

