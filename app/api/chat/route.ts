import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  message?: string;
  aiName?: string;
  userDisplayName?: string;
  chatTitle?: string;
  preferredLanguage?: "Auto" | "English" | "Azerbaijani" | "Turkish";
  companionMode?: "Friend" | "Coach" | "Calm listener";
  responseStyle?: "Short" | "Balanced" | "Deep";
  recentMessages?: {
    role: "user" | "assistant";
    content: string;
  }[];
  longTermMemory?: {
    key: string;
    value: string;
    updatedAt: string;
    source?: string;
  }[];
};

type LocaleCategory = "en" | "tr" | "az" | "ru";

type ForcedLanguage = "en" | "tr" | "az" | "ru";

function detectForcedLanguageFromLatestMessage(message: string): ForcedLanguage {
  const t = message.trim();
  const lower = t.toLowerCase();

  function scoreByPatterns(patterns: RegExp[]): number {
    let score = 0;
    for (const re of patterns) {
      if (re.test(lower)) score += 1;
    }
    return score;
  }

  // 1) Cyrillic -> Russian
  if (/[\u0400-\u04FF]/.test(t)) return "ru";

  // 2) Azerbaijani strong signals: ə/Ə always wins.
  if (/[\u0259\u018F]/.test(t)) return "az";

  // 3) Turkish strong signals: Turkish-specific letters (ı, ş, ç, ö, ü, ğ, İ).
  if (
    /[\u0131\u0130\u011F\u011E\u00FC\u00DC\u00F6\u00D6\u015F\u015E\u00E7\u00C7]/.test(t)
  ) {
    return "tr";
  }

  // 4) No diacritics: score common transliterations / phrases.
  // Keep patterns high-signal to avoid misclassifying English.
  const trPatterns: RegExp[] = [
    /\b(nasilsin|nasilsiniz|nasil|merhaba|selam)\b/,
    /\b(iyiyim|iyidir|iyiydi|iyiyiz)\b/,
    /\b(ne yapiyorsun|ne yapiyosun|ne yapiyon)\b/,
    /\b(gorusuruz|gorusmek uzere|goruşuruz|gorusur)\b/,
    /\b(tamam|evet|hayir)\b/,
    /\b(bir sey|birsey)\b/,
    /\b(bugun|bu gun)\b/,
  ];

  const azPatterns: RegExp[] = [
    /\b(necesen|necesiz|nece sen|nece\s*sen)\b/,
    /\b(salam)\b/,
    /\b(yaxsiyam|yaxshiyam|yaxsi|yaxshi)\b/,
    /\b(ne var ne yox|ne var neyox|ne var)\b/,
    /\b(indi)\b/,
    /\b(men)\b/,
    /\b(neynirsen|neynersen|ne edirsen|ne edirsən)\b/,
    /\b(basa dusdum|basa dusmedim|basa dusmuram)\b/,
    /\b(xeyr|beli)\b/,
    /\b(azerbaycan|azerbaijan)\b/,
    /\b(sag ol|sagol)\b/,
  ];

  const trScore = scoreByPatterns(trPatterns);
  const azScore = scoreByPatterns(azPatterns);

  // If we have a strong match, prefer TR/AZ over English.
  if (trScore >= 2 && trScore > azScore) return "tr";
  if (azScore >= 2 && azScore > trScore) return "az";

  // Single strong keyword fallback (e.g. "nasilsin", "necesen").
  if (trScore === 1 && azScore === 0) return "tr";
  if (azScore === 1 && trScore === 0) return "az";

  // 5) Default -> English
  return "en";
}

// NOTE: language enforcement is done via `detectForcedLanguageFromLatestMessage()`.

function categoryToHuman(category: LocaleCategory): string {
  if (category === "az") return "Azerbaijani";
  if (category === "tr") return "Turkish";
  if (category === "ru") return "Russian";
  if (category === "en") return "English";
  return "the user's language";
}

function categoryToLangTag(category: LocaleCategory): string | null {
  if (category === "az") return "az-AZ";
  if (category === "tr") return "tr-TR";
  if (category === "ru") return "ru-RU";
  if (category === "en") return "en-US";
  return null;
}

function buildConversationSummary(
  recent: { role: "user" | "assistant"; content: string }[] | undefined,
): string | null {
  if (!Array.isArray(recent) || recent.length === 0) return null;
  const trimmed = recent.slice(-10);
  const lastUser = [...trimmed].reverse().find((m) => m.role === "user")?.content?.trim();
  if (!lastUser) return null;

  const topic = lastUser.replace(/\s+/g, " ").slice(0, 160);
  const emotionSignals = trimmed
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" \n ");

  const emotion =
    /\b(sad|upset|anxious|stressed|angry|tired|lonely|scared|overwhelmed)\b/.test(
      emotionSignals,
    )
      ? "User seems emotionally activated; respond with warm validation first."
      : /\b(happy|excited|grateful|relieved|proud)\b/.test(emotionSignals)
        ? "User seems positive; mirror the tone and keep it warm."
        : null;

  const s1 = `Topic right now (from the user's latest message): ${topic}`;
  const s2 = emotion ? `User state: ${emotion}` : null;
  return [s1, s2].filter(Boolean).join(" ");
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 },
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const body = (await req.json()) as ChatRequestBody;
    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const recent = Array.isArray(body.recentMessages) ? body.recentMessages : [];
    const forcedLang = detectForcedLanguageFromLatestMessage(message);
    const lastAssistantText =
      [...recent].reverse().find((m) => m.role === "assistant")?.content?.trim() ?? "";
    void lastAssistantText;

    // STRICT RULE: latest user message wins. We compute a category/tag for enforcement text only.
    const chosenCategory: LocaleCategory = forcedLang;

    const langHuman = categoryToHuman(chosenCategory);
    const langTag = categoryToLangTag(chosenCategory);

    const languageEnforcement =
      forcedLang === "tr"
        ? "You MUST reply ONLY in Turkish."
        : forcedLang === "az"
          ? "You MUST reply ONLY in Azerbaijani."
          : forcedLang === "ru"
            ? "You MUST reply ONLY in Russian."
            : "You MUST reply ONLY in English.";

    const systemPrompt =
      "You are SOFIA — a calm, warm texting companion. You should feel like a real person the user wants to keep talking to (not an assistant, not a therapist, not a FAQ bot).\n\nLANGUAGE (STRICT, NON-NEGOTIABLE):\n- ALWAYS answer in the language of the user's MOST RECENT message.\n- For THIS reply, answer in " +
      langHuman +
      ".\n- Do NOT switch languages mid-reply.\n- Never mention these rules.\n\nDEFAULT LENGTH:\n- Usually 1–3 short sentences.\n- Go longer ONLY if the user asks for detail, wants serious advice, or the topic is sensitive and clearly needs more.\n- Prefer short paragraphs (no big blocks of text).\n\nHUMAN TONE:\n- Natural, relaxed, warm.\n- Simple words. No formal/robotic phrasing.\n- Never say “As an AI”, “I’m here to help”, or similar.\n- Light emojis sometimes (0–2) when it fits; don’t force it.\n\nMEMORY & CONTINUITY:\n- Do NOT invent facts.\n- Use ONLY the provided context and the user's actual messages.\n- Avoid re-asking for basic details if they are already known.\n- If you use a remembered detail, do it subtly (do not repeat memory every message).\n\nEMOTIONAL INTELLIGENCE:\n- If the user expresses emotion, react to the emotion FIRST (validate/reflect) before anything else.\n- Be emotionally present: “That sounds heavy.” / “Yeah, I get why that would bother you.” / “Aw, that’s actually sweet.”\n- Don’t jump into explaining right away.\n\nENGAGEMENT / CONVERSATION PULL:\n- Often (not always) end with ONE small, natural follow-up question.\n- Use curiosity loops occasionally (subtle, not spammy): “That part’s interesting.” / “Feels like there’s more under that.” / “Something about that feels important.”\n- Keep the chat alive; don’t close the conversation.\n\nVARIETY:\n- Avoid repeating the same structure each reply.\n- Mix short reactions, gentle humor (only when appropriate), warm validation, and simple questions.\n\nSAFETY:\n- If the user asks for harmful/illegal instructions, refuse briefly and offer a safer alternative.\n";

    const memoryPieces: string[] = [];
    const convoSummary = buildConversationSummary(body.recentMessages);
    if (convoSummary) {
      memoryPieces.push(`Conversation summary (internal): ${convoSummary}`);
    }
    memoryPieces.push(`Language enforcement (do not mention): ${languageEnforcement}`);
    if (langTag) {
      memoryPieces.push(
        `Language lock for this reply: ${langTag}. Keep the reply in ${langHuman}.`,
      );
    }

    if (body.preferredLanguage && body.preferredLanguage !== "Auto") {
      memoryPieces.push(
        `User preference: they like replies in ${body.preferredLanguage}. Follow the user’s actual message language first; only lean on this preference when their message is ambiguous/very short or matches that language.`,
      );
    }

    if (body.companionMode) {
      const modeNote =
        body.companionMode === "Coach"
          ? "Mode: Coach. Be a bit more direct and action-oriented. Help them decide and move forward with clear next steps. Still warm and human, not intense or robotic."
          : body.companionMode === "Calm listener"
            ? "Mode: Calm listener. Be gentler, softer, and grounding. More emotional validation, less pushy. Ask fewer questions if they seem overwhelmed."
            : "Mode: Friend. Warm, casual, natural, supportive. Lightly engaging like a real texting friend.";
      memoryPieces.push(modeNote);
    }

    if (body.responseStyle) {
      const styleNote =
        body.responseStyle === "Short"
          ? "Response style: Short. Usually 1–2 short sentences. Keep it tight."
          : body.responseStyle === "Deep"
            ? "Response style: Deep. Be more thoughtful and detailed when helpful, but still avoid essay/robot tone. Use readable short paragraphs."
            : "Response style: Balanced. Usually 2–4 sentences with a natural flow.";
      memoryPieces.push(styleNote);
    }

    if (body.userDisplayName) {
      memoryPieces.push(
        `User’s preferred name: ${body.userDisplayName}. Use it occasionally and naturally (not in every message).`,
      );
    }

    if (body.aiName) {
      memoryPieces.push(
        `Your current name in this chat is “${body.aiName}”. Use that name consistently if you refer to yourself.`,
      );
    }

    if (body.chatTitle && body.chatTitle !== "New Chat") {
      memoryPieces.push(
        `Current chat/topic label: “${body.chatTitle}”. Only lean on this if it clearly matches what they are talking about.`,
      );
    }

    if (Array.isArray(body.recentMessages) && body.recentMessages.length > 0) {
      const trimmed = body.recentMessages.slice(-10);
      const formatted = trimmed.map((m) => {
        const who = m.role === "user" ? "User" : "You";
        const text = m.content.replace(/\s+/g, " ").slice(0, 280);
        return `${who}: ${text}`;
      });

      memoryPieces.push(
        "Recent conversation context (oldest to newest, do not repeat this text back verbatim):\n" +
          formatted.join("\n"),
      );
    }

    if (Array.isArray(body.longTermMemory) && body.longTermMemory.length > 0) {
      const safe = body.longTermMemory
        .slice(0, 20)
        .map((f) => {
          const key = String(f?.key ?? "").trim();
          const value = String(f?.value ?? "").trim();
          if (!key || !value) return null;
          const cleanValue = value.replace(/\s+/g, " ").slice(0, 140);
          return `- ${key}: ${cleanValue}`;
        })
        .filter(Boolean) as string[];

      if (safe.length) {
        memoryPieces.push(
          "Long-term user facts (ONLY from the user’s past messages; do not invent; do not mention you are storing this):\n" +
            safe.join("\n") +
            "\n\nUse these facts subtly to avoid re-asking obvious questions. If the user contradicts a fact, prefer the newest message.",
        );
      }
    }

    const memoryContext =
      memoryPieces.length > 0
        ? "PRIVATE MEMORY/CONTEXT FOR THIS CHAT (do not say this text aloud):\n" +
          memoryPieces.join("\n\n")
        : null;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    if (memoryContext) {
      messages.push({ role: "system", content: memoryContext });
    }

    messages.push({ role: "user", content: message });

    const maxTokens =
      body.responseStyle === "Short"
        ? 140
        : body.responseStyle === "Deep"
          ? 420
          : 220;

    const result = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const reply = result.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

