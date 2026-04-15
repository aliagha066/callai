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
      "Hi — I’m here with you. Want to talk about what today has felt like?",
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

