import { supabase } from "../lib/supabaseClient";
import type { Settings } from "../types/database";

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as Settings;
}

export async function updateSettings(
  payload: Partial<Omit<Settings, "id">>,
): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .update(payload)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data as Settings;
}
