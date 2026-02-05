/**
 * Server-side Cloudflare Turnstile verification.
 *
 * Behaviour by env state:
 *   TURNSTILE_SECRET_KEY not set  →  always returns true  (local dev)
 *   TURNSTILE_SECRET_KEY set, no token provided  →  returns false
 *   TURNSTILE_SECRET_KEY set, token provided     →  calls Cloudflare API
 */
export async function verifyTurnstile(
  token: string | undefined | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) return true; // dev shortcut
  if (!token) return false; // prod: missing token = reject

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      }
    );
    return (await res.json()).success === true;
  } catch {
    return false; // fail closed
  }
}
