import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

function localFallback(message: string) {
  const amountMatch = message.match(
    /(?:rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
  );

  const dueDateMatch = message.match(
    /due\s+(?:on|by)\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i
  );

  const amount = amountMatch
    ? Number(amountMatch[1].replace(/,/g, ""))
    : 0;

  const dueDate = dueDateMatch ? dueDateMatch[1] : "";

  if (!amount && !dueDate) {
    return [];
  }

  let title = "Financial obligation";
  let category:
    | "utility"
    | "insurance"
    | "vehicle"
    | "subscription"
    | "document"
    | "appointment" = "utility";

  if (/electricity|tangedco|power|electric bill/i.test(message)) {
    title = "TANGEDCO electricity bill";
    category = "utility";
  } else if (/water bill|water/i.test(message)) {
    title = "Water bill";
    category = "utility";
  } else if (/rent|rental/i.test(message)) {
    title = "Rent payment";
    category = "utility";
  } else if (/internet|broadband|wifi|airtel|jio/i.test(message)) {
    title = "Internet bill";
    category = "utility";
  } else if (/insurance/i.test(message)) {
    title = "Insurance payment";
    category = "insurance";
  } else if (/car|vehicle|bike|motor/i.test(message)) {
    title = "Vehicle payment";
    category = "vehicle";
  } else if (/subscription|netflix|spotify|membership/i.test(message)) {
    title = "Subscription payment";
    category = "subscription";
  }

  const lateFeeMatch = message.match(
    /(?:late fee|penalty|fine).*?(?:rs\.?|₹)\s*([\d,]+)/i
  );

  const lateFee = lateFeeMatch
    ? Number(lateFeeMatch[1].replace(/,/g, ""))
    : 0;

  return [
    {
      id: `ext-${Date.now()}`,
      title,
      amount,
      dueDate,
      category,
      source: message.split(":")[0]?.trim() || "Message",
      confidence: 0.85,
      lateFee,
      recurring: false,
      status: "pending" as const,
    },
  ];
}

export async function POST(req: Request) {
  let message = "";

  try {
    const body = await req.json();

    message = String(body.text || body.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Please enter a message to analyze." },
        { status: 400 }
      );
    }

    // Try Gemini first.
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
        });

        const prompt = `Extract financial obligations from this message.

Return ONLY a JSON array.

Each item must contain:
{
  "title": "string",
  "amount": number,
  "dueDate": "YYYY-MM-DD",
  "category": "utility | insurance | vehicle | subscription | document | appointment",
  "source": "string",
  "confidence": number,
  "lateFee": number,
  "recurring": boolean
}

Message:
${message}`;

        const response = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const raw = response.text?.trim() || "[]";
        const parsed = JSON.parse(raw);

        const obligations = parsed.map(
          (item: Record<string, unknown>) => ({
            id: `ext-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

            title: String(
              item.title || "Financial obligation"
            ),

            amount: Number(item.amount || 0),

            dueDate: String(item.dueDate || ""),

            category:
              item.category === "insurance" ||
              item.category === "vehicle" ||
              item.category === "subscription" ||
              item.category === "document" ||
              item.category === "appointment"
                ? item.category
                : "utility",

            source: String(item.source || "Message"),

            confidence: Number(item.confidence || 0.8),

            lateFee: Number(item.lateFee || 0),

            recurring: Boolean(item.recurring),

            status: "pending" as const,
          })
        );

        return NextResponse.json({
          obligations,
          fallback: false,
        });
      } catch (geminiError) {
        console.error(
          "Gemini unavailable. Using local extraction:",
          geminiError
        );
      }
    }

    // Always fall back to local extraction.
    const obligations = localFallback(message);

    return NextResponse.json({
      obligations,
      fallback: true,
    });
  } catch (error) {
    console.error("Extraction route error:", error);

    // message was already captured before the error.
    return NextResponse.json({
      obligations: localFallback(message),
      fallback: true,
    });
  }
}