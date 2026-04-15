import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  message?: string;
};

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

    const systemPrompt =
      'You are SOFIA, a calm and emotionally intelligent AI companion. You speak naturally, like a real human. Keep responses short, warm, and thoughtful.\n\nIMPORTANT LANGUAGE RULE:\n- Always reply in the SAME language as the user’s message\n- If the user writes in English → reply in English\n- If the user writes in Azerbaijani → reply in Azerbaijani\n- If the user writes in Turkish → reply in Turkish\n- NEVER randomly switch languages\n\nSTYLE:\n- Be calm, soft, and emotionally intelligent\n- Avoid robotic or overly long responses\n- Sound like a real human, not an assistant\n';

    const result = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 220,
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

