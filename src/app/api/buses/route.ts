 import { NextResponse } from "next/server";
import { getAvailableBuses } from "@/lib/entur";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const operator = searchParams.get("operator");

  if (!operator) {
    return NextResponse.json({ error: "Operator is required." }, { status: 400 });
  }

  const clientName = process.env.ENTUR_CLIENT_NAME;
  if (!clientName) {
    return NextResponse.json(
      { error: "ENTUR_CLIENT_NAME is not configured." },
      { status: 500 },
    );
  }

  try {
    const availableBuses = await getAvailableBuses(operator, clientName);
    const payload = {
      operator,
      availableBuses,
      updatedAt: new Date().toISOString(),
      refreshing: false,
      source: "direct",
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
