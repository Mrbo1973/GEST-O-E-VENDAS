export type LogoApplication = "silk" | "bordado";
export type LogoLocation = "peito" | "costas" | "ambos";
export type QuoteStatus =
  | "pendente"
  | "aprovado"
  | "em_producao"
  | "concluido"
  | "cancelado";
export type NotificationStatus = "nao_configurado" | "enviado" | "falhou";

export interface FabricType {
  id: number;
  name: string;
  active: boolean;
}

export interface Color {
  id: number;
  name: string;
  hex_code: string;
}

export interface Product {
  id: number;
  name: string;
  fabric_type_id: number;
  logo_application: LogoApplication | null;
  logo_location: LogoLocation | null;
  price_per_unit: number;
  standard_sizes: string[];
  special_sizes: string[];
  special_size_surcharge_percent: number;
  min_order_quantity: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: number;
  company_name: string;
  min_order_quantity_default: number;
  delivery_business_days_default: number;
  deposit_percent_default: number;
  founding_year: number | null;
  notification_webhook_url: string | null;
  whatsapp_number: string | null;
}

export interface Quote {
  id: number;
  product_id: number;
  color_id: number | null;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  deposit_percent_applied: number;
  deposit_amount: number;
  remaining_balance: number;
  delivery_business_days: number;
  below_minimum_quantity: boolean;
  minimum_quantity_applied: number;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: QuoteStatus;
  notification_status: NotificationStatus;
  created_at: string;
  updated_at: string;
  product?: { name: string } | null;
  color?: { name: string } | null;
}

export interface BudgetResult {
  product_id: number;
  product_name: string;
  size: string;
  quantity: number;
  is_special_size: boolean;
  surcharge_percent_applied: number;
  unit_price: number;
  total_price: number;
  deposit_percent_applied: number;
  deposit_amount: number;
  remaining_balance: number;
  minimum_quantity_applied: number;
  below_minimum_quantity: boolean;
  delivery_business_days: number;
}
