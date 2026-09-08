import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Online card checkout is disabled. Submit a quote request from the cart instead." },
    { status: 410 },
  );
}
