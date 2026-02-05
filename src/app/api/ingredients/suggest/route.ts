import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { suggestIngredients } from "@/lib/recipes";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = await createServerSupabase();
  const suggestions = await suggestIngredients(supabase, query);
  return NextResponse.json({ suggestions });
}
