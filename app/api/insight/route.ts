import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// The LLM only explains the plan.
// The deterministic engine remains responsible for prioritization.
export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `You are LifeOps, a calm personal finance-admin assistant.

Below is a prioritized plan already computed by a scoring engine.
Do not re-rank it.

Explain it in 2-3 short, friendly sentences:
- what to do first
- why
- one tip to avoid penalties

Use ₹ for amounts.
No markdown.
No lists.

PLAN JSON:
${JSON.stringify(body)}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {},
    });

    const text =
      response.text?.trim() || "Your priority plan is ready.";

    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Insight failed",
      },
      { status: 500 }
    );
  }
}