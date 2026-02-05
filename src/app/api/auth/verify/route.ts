import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";

/** Verify a Turnstile token — called by the login form before sign-in/up. */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const valid = await verifyTurnstile(token);
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
