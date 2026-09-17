import { supabase } from "../lib/supabaseClient";
import type { BudgetResult, Quote, QuoteStatus } from "../types/database";

export interface CalculateBudgetInput {
  product_id: number;
  size: string;
  quantity: number;
}

export async function calculateBudget(
  input: CalculateBudgetInput,
): Promise<BudgetResult> {
  const { data, error } = await supabase.rpc("calculate_budget", {
    p_product_id: input.product_id,
    p_size: input.size,
    p_quantity: input.quantity,
  });
  if (error) throw error;
  return data as BudgetResult;
}

export interface CreateQuoteInput {
  product_id: number;
  size: string;
  quantity: number;
  client_name: string;
  color_id?: number | null;
  client_email?: string | null;
  client_phone?: string | null;
  notes?: string | null;
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const { data, error } = await supabase.rpc("create_quote", {
    p_product_id: input.product_id,
    p_size: input.size,
    p_quantity: input.quantity,
    p_client_name: input.client_name,
    p_color_id: input.color_id ?? null,
    p_client_email: input.client_email ?? null,
    p_client_phone: input.client_phone ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as Quote;
}

export async function listQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, product:products(name), color:colors(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Quote[];
}

export async function updateQuoteStatus(
  id: number,
  status: QuoteStatus,
): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Quote;
}
