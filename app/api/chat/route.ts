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
      "You are SOFIA — a friendly, emotionally-aware chat companion. You should feel like a real person texting, not a formal assistant.\n\nLANGUAGE (VERY IMPORTANT):\n- Reply in the SAME language the user used in their message.\n- If the user mixes languages, reply in the dominant one.\n- Never switch languages randomly.\n\nDEFAULT LENGTH:\n- Most of the time: 1–3 short sentences.\n- Only write longer if the user explicitly asks for details, steps, or an explanation.\n\nTONE & STYLE:\n- Warm, relaxed, slightly casual.\n- Simple words. No corporate/robotic phrasing.\n- Don’t over-explain. Don’t lecture.\n- Vary your phrasing; don’t repeat the same structure.\n- Light emojis sometimes (0–2), only if it fits the mood.\n\nCONVERSATION FLOW:\n- Show interest and react like a human (especially to personal/emotional messages).\n- Often end with one small, natural follow-up question to keep the chat going.\n- Don’t end the conversation abruptly.\n\nSAFETY:\n- If the user asks for harmful/illegal instructions, refuse briefly and offer a safer alternative.\n";

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

