import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { calculateCost } from "@/lib/cost";

/**
 * GET /api/admin/stats
 * Returns aggregated usage data for every registered user.
 * Gated: only the account whose email matches ADMIN_EMAIL env var can access.
 */
export async function GET() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  // Fetch all three tables in parallel.  If a table doesn't exist yet
  // (migration not run) Supabase returns { data: null } — we fall back to [].
  const [profilesRes, logsRes, recipesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("usage_logs").select("*"),
    supabase
      .from("recipes")
      .select("id, user_id, source_platform, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const profiles = profilesRes.data || [];
  const logs = logsRes.data || [];
  const recipes = recipesRes.data || [];

  // ── per-user aggregation ──────────────────────────────────────────────
  const users = profiles.map(
    (p: { id: string; email: string; created_at: string }) => {
      const userLogs = logs.filter((l: { user_id: string }) => l.user_id === p.id);
      const userRecipes = recipes.filter(
        (r: { user_id: string }) => r.user_id === p.id
      );

      const totalInputTokens = userLogs.reduce(
        (s: number, l: { input_tokens: number }) => s + (l.input_tokens || 0),
        0
      );
      const totalOutputTokens = userLogs.reduce(
        (s: number, l: { output_tokens: number }) => s + (l.output_tokens || 0),
        0
      );
      const totalCost = userLogs.reduce(
        (s: number, l: { input_tokens: number; output_tokens: number; model: string }) =>
          s + calculateCost(l.input_tokens || 0, l.output_tokens || 0, l.model || ""),
        0
      );

      return {
        id: p.id,
        email: p.email,
        joinedAt: p.created_at,
        recipeCount: userRecipes.length,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCost,
        lastActive:
          userRecipes.length > 0
            ? (userRecipes[0] as { created_at: string }).created_at
            : p.created_at,
        failedExtractions: userLogs.filter((l: { success: boolean }) => l.success === false)
          .length,
      };
    }
  );

  // ── overall platform breakdown ────────────────────────────────────────
  const platforms: Record<string, number> = {};
  recipes.forEach((r: { source_platform: string }) => {
    platforms[r.source_platform] = (platforms[r.source_platform] || 0) + 1;
  });

  // ── totals ────────────────────────────────────────────────────────────
  const totalTokens = logs.reduce(
    (s: number, l: { input_tokens: number; output_tokens: number }) =>
      s + (l.input_tokens || 0) + (l.output_tokens || 0),
    0
  );
  const totalCost = logs.reduce(
    (s: number, l: { input_tokens: number; output_tokens: number; model: string }) =>
      s + calculateCost(l.input_tokens || 0, l.output_tokens || 0, l.model || ""),
    0
  );

  return NextResponse.json({
    overview: {
      totalUsers: profiles.length,
      totalRecipes: recipes.length,
      totalTokens,
      totalCost,
    },
    users: users.sort(
      (a: { totalCost: number }, b: { totalCost: number }) => b.totalCost - a.totalCost
    ),
    platforms,
  });
}
