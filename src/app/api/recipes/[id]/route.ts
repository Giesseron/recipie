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
  const updates: Record<string, unknown> = {};

  // Handle title update
  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "שם המתכון לא יכול להיות ריק" },
        { status: 400 }
      );
    }
    updates.title = title;
  }

  // Handle categories update
  if (body.categories !== undefined) {
    const categories: unknown = body.categories;
    if (
      !Array.isArray(categories) ||
      categories.length === 0 ||
      categories.some((c: unknown) => typeof c !== "string" || c.trim() === "")
    ) {
      return NextResponse.json(
        { error: "יש לבחור לפחות קטגוריה אחת חוקית" },
        { status: 400 }
      );
    }
    updates.categories = (categories as string[]).map((c) => c.trim());
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "לא התקבלו שדות לעדכון" },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from("recipes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: "שגיאה בעדכון המתכון" },
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
