import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getRecipeById, deleteRecipe } from "@/lib/recipes";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const recipe = await getRecipeById(supabase, id);
  if (!recipe) {
    return NextResponse.json(
      { error: "המתכון לא נמצא" },
      { status: 404 }
    );
  }

  return NextResponse.json({ recipe });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const body = await request.json();
  const categories: unknown = body.categories;

  // Validate
  if (
    !Array.isArray(categories) ||
    categories.length === 0 ||
    categories.some((c: unknown) => typeof c !== "string" || c.trim() === "")
  ) {
    return NextResponse.json(
      { error: "יש לבחור לפחות קטגורי אחת חוקית" },
      { status: 400 }
    );
  }

  const trimmed = (categories as string[]).map((c) => c.trim());

  const { data: updated, error } = await supabase
    .from("recipes")
    .update({ categories: trimmed })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: "שגיאה בעדכון הקטגורים" },
      { status: 500 }
    );
  }

  return NextResponse.json({ recipe: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const success = await deleteRecipe(supabase, id);
  if (!success) {
    return NextResponse.json(
      { error: "שגיאה במחיקת המתכון" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
