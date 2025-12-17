export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export type SKUTag = "PT" | "SEMI" | "MP" | "CON";
export type UnitOfMeasure = "unit" | "kg" | "g" | "l" | "ml" | "pack" | "box" | "m" | "cm";

export type SKU = {
  id: number;
  code: string;
  name: string;
  tag: SKUTag;
  unit: UnitOfMeasure;
  notes?: string | null;
};

export type Deposit = {
  id: number;
  name: string;
  location?: string | null;
  controls_lot: boolean;
};

export type StockLevel = {
  deposit_id: number;
  deposit_name: string;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  quantity: number;
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

export type MovementType = "production" | "consumption" | "adjustment" | "transfer" | "remito" | "merma";

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
  movement_type: MovementType;
  quantity: number;
};

export type StockReport = {
  totals_by_tag: StockSummaryRow[];
  totals_by_deposit: StockSummaryRow[];
  movement_totals: MovementSummary[];
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

export async function fetchSkus(): Promise<SKU[]> {
  const response = await fetch(`${API_BASE_URL}/skus`);
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

export async function createSku(payload: Omit<SKU, "id">): Promise<SKU> {
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

export async function updateSku(id: number, payload: Partial<Omit<SKU, "id">>): Promise<SKU> {
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

export async function createStockMovement(payload: {
  sku_id: number;
  deposit_id: number;
  movement_type: MovementType;
  quantity: number;
  reference?: string;
  lot_code?: string;
  movement_date?: string;
}): Promise<StockLevel> {
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

export async function createOrder(payload: Omit<Order, "id" | "created_at" | "items"> & { items: OrderItem[] }): Promise<Order> {
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
