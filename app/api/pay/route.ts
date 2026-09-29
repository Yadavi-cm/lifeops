import { NextResponse } from "next/server";
import { commissionFor } from "@/lib/engine";

export async function POST(req: Request) {
  const { obligationId, amount } = await req.json();
  const commission = commissionFor(Number(amount) || 0);
  return NextResponse.json({
    obligationId,
    amount,
    commission,
    total: Number(amount) + commission,
    timestamp: new Date().toISOString(),
  });
}
