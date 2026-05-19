"use server";

import { upsertCategoryColor } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function saveCategoryColor(category: string, bgHex: string, textHex: string) {
  await upsertCategoryColor(category, bgHex, textHex);
  revalidatePath("/admin/category-colors");
}

export async function deleteCategoryColor(category: string) {
  await supabase.from("category_colors").delete().eq("category", category);
  revalidatePath("/admin/category-colors");
}
