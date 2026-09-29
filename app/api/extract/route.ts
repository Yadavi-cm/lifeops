import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
You are LifeOps, a personal operations assistant.

Analyze the following messy message such as an SMS, email, bill, insurance notice, or subscription notification.

Extract useful actionable information.

Return ONLY valid JSON with these fields:

{
  "type": "string",
  "title": "string",
  "provider": "string or null",
  "amount": "number or null",
  "dueDate": "string or null",
  "action": "string",
  "priority": "low, medium, or high",
  "summary": "string"
}

If information is not present, use null.
Do not invent information.

Message:
${message}
      `,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");

    return NextResponse.json({
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to analyze message" },
      { status: 500 }
    );
  }
}