export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export type SKUTag = "PT" | "SEMI" | "MP" | "CON";

export type SKU = {
  id: number;
  code: string;
  name: string;
  tag: SKUTag;
  unit: string;
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

export type RecipeItem = {
  component_id: number;
  quantity: number;
};

export type Recipe = {
  id: number;
  product_id: number;
  name: string;
  items: RecipeItem[];
};

export type MovementType = "production" | "consumption" | "adjustment" | "transfer" | "remito" | "merma";

export async function fetchHealth(): Promise<{ status: string; version?: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("No se pudo obtener el estado de la API");
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