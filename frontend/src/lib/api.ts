export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export type SKU = {
  id: number;
  code: string;
  name: string;
  tag: string;
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