import { supabase } from "../lib/supabaseClient";
import type { Color, Product } from "../types/database";

export type ProductInput = Omit<
  Product,
  "id" | "created_at" | "updated_at" | "fabric_type_id"
> & { fabric_type_id: number };

export async function listProducts(includeInactive = false): Promise<Product[]> {
  let query = supabase.from("products").select("*").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data as Product[];
}

export async function createProduct(
  payload: Partial<ProductInput>,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(
  id: number,
  payload: Partial<ProductInput>,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(
  id: number,
  confirm: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("delete_product", {
    p_product_id: id,
    p_confirm: confirm,
  });
  if (error) throw error;
}

export async function getAvailableColors(productId: number): Promise<Color[]> {
  const { data, error } = await supabase.rpc("get_product_available_colors", {
    p_product_id: productId,
  });
  if (error) throw error;
  return data as Color[];
}

export async function getLinkedColorIds(productId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from("product_colors")
    .select("color_id")
    .eq("product_id", productId);
  if (error) throw error;
  return (data as { color_id: number }[]).map((row) => row.color_id);
}

export async function setProductColors(
  productId: number,
  colorIds: number[],
): Promise<Color[]> {
  const { data, error } = await supabase.rpc("set_product_colors", {
    p_product_id: productId,
    p_color_ids: colorIds,
  });
  if (error) throw error;
  return data as Color[];
}
