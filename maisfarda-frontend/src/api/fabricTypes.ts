import { supabase } from "../lib/supabaseClient";
import type { FabricType } from "../types/database";

export async function listFabricTypes(
  includeInactive = false,
): Promise<FabricType[]> {
  let query = supabase.from("fabric_types").select("*").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data as FabricType[];
}

export async function createFabricType(
  payload: Pick<FabricType, "name"> & Partial<Pick<FabricType, "active">>,
): Promise<FabricType> {
  const { data, error } = await supabase
    .from("fabric_types")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as FabricType;
}

export async function updateFabricType(
  id: number,
  payload: Partial<Pick<FabricType, "name" | "active">>,
): Promise<FabricType> {
  const { data, error } = await supabase
    .from("fabric_types")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FabricType;
}

export async function deleteFabricType(
  id: number,
  confirm: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("delete_fabric_type", {
    p_fabric_type_id: id,
    p_confirm: confirm,
  });
  if (error) throw error;
}
