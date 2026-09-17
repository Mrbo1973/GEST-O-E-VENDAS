import { supabase } from "../lib/supabaseClient";
import type { Color } from "../types/database";

export async function listColors(): Promise<Color[]> {
  const { data, error } = await supabase
    .from("colors")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Color[];
}

export async function createColor(
  payload: Pick<Color, "name" | "hex_code">,
): Promise<Color> {
  const { data, error } = await supabase
    .from("colors")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Color;
}

export async function updateColor(
  id: number,
  payload: Partial<Pick<Color, "name" | "hex_code">>,
): Promise<Color> {
  const { data, error } = await supabase
    .from("colors")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Color;
}

export async function deleteColor(id: number, confirm: boolean): Promise<void> {
  const { error } = await supabase.rpc("delete_color", {
    p_color_id: id,
    p_confirm: confirm,
  });
  if (error) throw error;
}
