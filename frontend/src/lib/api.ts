export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type SKUFamily = "consumible" | "papeleria" | "limpieza";
export type UnitOfMeasure = "unit" | "kg" | "g" | "l" | "ml" | "pack" | "box" | "m" | "cm";

export type MermaStage = "production" | "empaque" | "stock" | "transito_post_remito" | "administrativa";
export type MermaAction = "discarded" | "reprocessed" | "admin_adjustment" | "none";

export type SKUType = {
  id: number;
  code: string;
  label: string;
  is_active: boolean;
};

export type StockMovementType = {
  id: number;
  code: string;
  label: string;
  is_active: boolean;
};

export type SKU = {
  id: number;
  code: string;
  name: string;
  sku_type_id: number;
  sku_type_code: string;
  sku_type_label: string;
  unit: UnitOfMeasure;
  secondary_unit?: UnitOfMeasure | null;
  units_per_kg?: number | null;
  notes?: string | null;
  family?: SKUFamily | null;
  is_active: boolean;
};

export type SkuPayload = {
  code: string;
  name: string;
  sku_type_id: number;
  unit: UnitOfMeasure;
  units_per_kg?: number | null;
  notes?: string | null;
  family?: SKUFamily | null;
  is_active: boolean;
};

export type Deposit = {
  id: number;
  name: string;
  location?: string | null;
  controls_lot: boolean;
  is_store: boolean;
};

export type StockLevel = {
  deposit_id: number;
  deposit_name: string;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  quantity: number;
};

export type StockMovementPayload = {
  sku_id: number;
  deposit_id: number;
  movement_type_id: number;
  quantity: number;
  unit?: UnitOfMeasure;
  reference?: string;
  lot_code?: string;
  production_line_id?: number | null;
  movement_date?: string;
};

export type Role = {
  id: number;
  name: string;
  description?: string | null;
};

export type RecipeItem = {
  component_id: number;
  quantity: number;
  component_code?: string;
  component_name?: string;
  component_unit?: UnitOfMeasure;
};

export type Recipe = {
  id: number;
  product_id: number;
  name: string;
  items: RecipeItem[];
};

export type OrderStatus = "draft" | "submitted" | "approved" | "prepared" | "closed";

export type OrderItem = {
  id?: number;
  sku_id: number;
  sku_code?: string;
  sku_name?: string;
  quantity: number;
  current_stock?: number | null;
};

export type Order = {
  id: number;
  destination: string;
   destination_deposit_id?: number | null;
  requested_for?: string | null;
  status: OrderStatus;
  notes?: string | null;
  created_at: string;
  items: OrderItem[];
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  role_id?: number | null;
  role_name?: string | null;
  is_active: boolean;
};

export type UnitOption = {
  code: UnitOfMeasure;
  label: string;
};

export type StockSummaryRow = {
  group: string;
  label: string;
  quantity: number;
};

export type MovementSummary = {
  movement_type_code: string;
  movement_type_label: string;
  quantity: number;
};

export type StockReport = {
  totals_by_tag: StockSummaryRow[];
  totals_by_deposit: StockSummaryRow[];
  movement_totals: MovementSummary[];
};

export type ProductionLine = {
  id: number;
  name: string;
  is_active: boolean;
};

export type MermaType = {
  id: number;
  stage: MermaStage;
  code: string;
  label: string;
  is_active: boolean;
};

export type MermaCause = {
  id: number;
  stage: MermaStage;
  code: string;
  label: string;
  is_active: boolean;
};

export type MermaEvent = {
  id: number;
  stage: MermaStage;
  type_id: number;
  type_code: string;
  type_label: string;
  cause_id: number;
  cause_code: string;
  cause_label: string;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  quantity: number;
  unit: UnitOfMeasure;
  lot_code?: string | null;
  deposit_id?: number | null;
  deposit_name?: string | null;
  remito_id?: number | null;
  order_id?: number | null;
  production_line_id?: number | null;
  production_line_name?: string | null;
  reported_by_user_id?: number | null;
  reported_by_role?: string | null;
  notes?: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
  affects_stock: boolean;
  action: MermaAction;
  stock_movement_id?: number | null;
};

export async function fetchHealth(): Promise<{ status: string; version?: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("No se pudo obtener el estado de la API");
  }
  return response.json();
}

export async function fetchRoles(): Promise<Role[]> {
  const response = await fetch(`${API_BASE_URL}/roles`);
  if (!response.ok) {
    throw new Error("No se pudo obtener los roles");
  }
  return response.json();
}

export async function fetchSkuTypes(params?: { include_inactive?: boolean }): Promise<SKUType[]> {
  const query = new URLSearchParams();
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  const response = await fetch(`${API_BASE_URL}/sku-types${query.toString() ? `?${query.toString()}` : ""}`);
  if (!response.ok) {
    throw new Error("No se pudo obtener los tipos de SKU");
  }
  return response.json();
}

export async function createSkuType(payload: Omit<SKUType, "id">): Promise<SKUType> {
  const response = await fetch(`${API_BASE_URL}/sku-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear el tipo de SKU");
  }
  return response.json();
}

export async function updateSkuType(id: number, payload: Partial<Omit<SKUType, "id" | "code">>): Promise<SKUType> {
  const response = await fetch(`${API_BASE_URL}/sku-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el tipo de SKU");
  }
  return response.json();
}

export async function deleteSkuType(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sku-types/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo eliminar el tipo de SKU");
  }
}

export async function fetchSkus(params?: { sku_type_ids?: number[]; tags?: string[]; families?: SKUFamily[]; include_inactive?: boolean; search?: string }): Promise<SKU[]> {
  const query = new URLSearchParams();
  if (params?.sku_type_ids?.length) {
    params.sku_type_ids.forEach((typeId) => query.append("sku_type_ids", typeId.toString()));
  }
  if (params?.tags?.length) {
    params.tags.forEach((tag) => query.append("tags", tag));
  }
  if (params?.families?.length) {
    params.families.forEach((family) => query.append("families", family));
  }
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  if (params?.search) {
    query.append("search", params.search);
  }
  const queryString = query.toString();
  const response = await fetch(`${API_BASE_URL}/skus${queryString ? `?${queryString}` : ""}`);
  if (!response.ok) {
    throw new Error("No se pudo obtener la lista de SKUs");
  }
  return response.json();
}

export async function fetchDeposits(): Promise<Deposit[]> {
  const response = await fetch(`${API_BASE_URL}/deposits`);
  if (!response.ok) {
    throw new Error("No se pudo obtener la lista de depósitos");
  }
  return response.json();
}

export async function fetchStockLevels(): Promise<StockLevel[]> {
  const response = await fetch(`${API_BASE_URL}/stock-levels`);
  if (!response.ok) {
    throw new Error("No se pudo obtener el stock actual");
  }
  return response.json();
}

export async function fetchUnits(): Promise<UnitOption[]> {
  const response = await fetch(`${API_BASE_URL}/units`);
  if (!response.ok) {
    throw new Error("No se pudo obtener las unidades");
  }
  return response.json();
}

export async function createSku(payload: SkuPayload): Promise<SKU> {
  const response = await fetch(`${API_BASE_URL}/skus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear el SKU");
  }
  return response.json();
}

export async function updateSku(id: number, payload: Partial<SkuPayload>): Promise<SKU> {
  const response = await fetch(`${API_BASE_URL}/skus/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el SKU");
  }
  return response.json();
}

export async function deleteSku(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/skus/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo eliminar el SKU");
  }
}

export async function createDeposit(payload: Omit<Deposit, "id">): Promise<Deposit> {
  const response = await fetch(`${API_BASE_URL}/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear el depósito");
  }
  return response.json();
}

export async function updateDeposit(id: number, payload: Partial<Omit<Deposit, "id">>): Promise<Deposit> {
  const response = await fetch(`${API_BASE_URL}/deposits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el depósito");
  }
  return response.json();
}

export async function deleteDeposit(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/deposits/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo eliminar el depósito");
  }
}

export async function fetchStockMovementTypes(params?: { include_inactive?: boolean }): Promise<StockMovementType[]> {
  const query = new URLSearchParams();
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  const response = await fetch(`${API_BASE_URL}/stock/movement-types${query.toString() ? `?${query.toString()}` : ""}`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener los tipos de movimiento de stock");
  }
  return response.json();
}

export async function createStockMovementType(payload: Omit<StockMovementType, "id">): Promise<StockMovementType> {
  const response = await fetch(`${API_BASE_URL}/stock/movement-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear el tipo de movimiento");
  }
  return response.json();
}

export async function updateStockMovementType(
  id: number,
  payload: Partial<Omit<StockMovementType, "id" | "code">>,
): Promise<StockMovementType> {
  const response = await fetch(`${API_BASE_URL}/stock/movement-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el tipo de movimiento");
  }
  return response.json();
}

export async function deleteStockMovementType(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/stock/movement-types/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo eliminar el tipo de movimiento");
  }
}

export async function createStockMovement(payload: StockMovementPayload): Promise<StockLevel> {
  const response = await fetch(`${API_BASE_URL}/stock/movements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo registrar el movimiento");
  }
  return response.json();
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE_URL}/recipes`);
  if (!response.ok) {
    throw new Error("No se pudo obtener las recetas");
  }
  return response.json();
}

export async function createRecipe(payload: Omit<Recipe, "id">): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear la receta");
  }
  return response.json();
}

export async function updateRecipe(id: number, payload: Omit<Recipe, "id">): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/recipes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar la receta");
  }
  return response.json();
}

export async function deleteRecipe(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/recipes/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo eliminar la receta");
  }
}

export async function fetchStockReport(): Promise<StockReport> {
  const response = await fetch(`${API_BASE_URL}/reports/stock-summary`);
  if (!response.ok) {
    throw new Error("No se pudo obtener el reporte de stock");
  }
  return response.json();
}

export async function fetchOrders(): Promise<Order[]> {
  const response = await fetch(`${API_BASE_URL}/orders`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener los pedidos");
  }
  return response.json();
}

export async function createOrder(
  payload: {
    destination_deposit_id: number;
    notes?: string | null;
    items: OrderItem[];
    requested_for?: string | null;
  }
): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear el pedido");
  }
  return response.json();
}

export async function updateOrder(id: number, payload: Partial<Omit<Order, "id" | "created_at">>): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el pedido");
  }
  return response.json();
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el estado");
  }
  return response.json();
}

export async function deleteOrder(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo eliminar el pedido");
  }
}

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/users`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener los usuarios");
  }
  return response.json();
}

export async function createUser(payload: { email: string; full_name: string; password: string; role_id?: number | null; is_active?: boolean }): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear el usuario");
  }
  return response.json();
}

export async function updateUser(id: number, payload: Partial<{ email: string; full_name: string; password: string; role_id?: number | null; is_active?: boolean }>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el usuario");
  }
  return response.json();
}

export async function deleteUser(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo eliminar el usuario");
  }
}

export async function fetchProductionLines(): Promise<ProductionLine[]> {
  const response = await fetch(`${API_BASE_URL}/production-lines`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener las líneas de producción");
  }
  return response.json();
}

export async function createProductionLine(payload: { name: string; is_active?: boolean }): Promise<ProductionLine> {
  const response = await fetch(`${API_BASE_URL}/production-lines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear la línea");
  }
  return response.json();
}

export async function updateProductionLine(id: number, payload: Partial<{ name: string; is_active: boolean }>): Promise<ProductionLine> {
  const response = await fetch(`${API_BASE_URL}/production-lines/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar la línea");
  }
  return response.json();
}

export async function fetchMermaTypes(params?: { stage?: MermaStage; include_inactive?: boolean }): Promise<MermaType[]> {
  const query = new URLSearchParams();
  if (params?.stage) {
    query.append("stage", params.stage);
  }
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  const response = await fetch(`${API_BASE_URL}/mermas/types${query.toString() ? `?${query.toString()}` : ""}`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener los tipos de merma");
  }
  return response.json();
}

export async function createMermaType(payload: Omit<MermaType, "id">): Promise<MermaType> {
  const response = await fetch(`${API_BASE_URL}/mermas/types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear el tipo de merma");
  }
  return response.json();
}

export async function updateMermaType(id: number, payload: Partial<Omit<MermaType, "id" | "code">>): Promise<MermaType> {
  const response = await fetch(`${API_BASE_URL}/mermas/types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar el tipo de merma");
  }
  return response.json();
}

export async function deleteMermaType(id: number): Promise<void> {
  await updateMermaType(id, { is_active: false });
}

export async function fetchMermaCauses(params?: { stage?: MermaStage; include_inactive?: boolean }): Promise<MermaCause[]> {
  const query = new URLSearchParams();
  if (params?.stage) {
    query.append("stage", params.stage);
  }
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  const response = await fetch(`${API_BASE_URL}/mermas/causes${query.toString() ? `?${query.toString()}` : ""}`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener las causas de merma");
  }
  return response.json();
}

export async function createMermaCause(payload: Omit<MermaCause, "id">): Promise<MermaCause> {
  const response = await fetch(`${API_BASE_URL}/mermas/causes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo crear la causa de merma");
  }
  return response.json();
}

export async function updateMermaCause(id: number, payload: Partial<Omit<MermaCause, "id" | "code">>): Promise<MermaCause> {
  const response = await fetch(`${API_BASE_URL}/mermas/causes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo actualizar la causa de merma");
  }
  return response.json();
}

export async function deleteMermaCause(id: number): Promise<void> {
  await updateMermaCause(id, { is_active: false });
}

export type MermaEventPayload = {
  stage: MermaStage;
  type_id: number;
  cause_id: number;
  sku_id: number;
  quantity: number;
  unit?: UnitOfMeasure;
  lot_code?: string | null;
  deposit_id?: number | null;
  remito_id?: number | null;
  order_id?: number | null;
  production_line_id?: number | null;
  reported_by_user_id?: number | null;
  reported_by_role?: string | null;
  notes?: string | null;
  detected_at?: string | null;
  affects_stock?: boolean;
  action?: MermaAction;
};

export async function createMermaEvent(payload: MermaEventPayload): Promise<MermaEvent> {
  const response = await fetch(`${API_BASE_URL}/mermas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo registrar la merma");
  }
  return response.json();
}

export async function fetchMermaEvents(params?: {
  date_from?: string;
  date_to?: string;
  stage?: MermaStage;
  deposit_id?: number;
  production_line_id?: number;
  sku_id?: number;
  type_id?: number;
  cause_id?: number;
  affects_stock?: boolean;
}): Promise<MermaEvent[]> {
  const query = new URLSearchParams();
  if (params?.date_from) query.append("date_from", params.date_from);
  if (params?.date_to) query.append("date_to", params.date_to);
  if (params?.stage) query.append("stage", params.stage);
  if (params?.deposit_id) query.append("deposit_id", String(params.deposit_id));
  if (params?.production_line_id) query.append("production_line_id", String(params.production_line_id));
  if (params?.sku_id) query.append("sku_id", String(params.sku_id));
  if (params?.type_id) query.append("type_id", String(params.type_id));
  if (params?.cause_id) query.append("cause_id", String(params.cause_id));
  if (params?.affects_stock !== undefined) query.append("affects_stock", params.affects_stock ? "true" : "false");

  const response = await fetch(`${API_BASE_URL}/mermas${query.toString() ? `?${query.toString()}` : ""}`);
  if (!response.ok) {
    throw new Error("No se pudieron obtener las mermas");
  }
  return response.json();
}

export async function fetchMermaEventDetail(id: number): Promise<MermaEvent> {
  const response = await fetch(`${API_BASE_URL}/mermas/${id}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "No se pudo obtener el detalle de la merma");
  }
  return response.json();
}
