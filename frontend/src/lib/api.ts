export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const AUTH_TOKEN_KEY = "fnc_access_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...options, headers });
}

async function apiRequest<T>(path: string, options: RequestInit, defaultError: string): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(response.status, detail || defaultError);
  }
  return response.json() as Promise<T>;
}

export type UnitOfMeasure = "unit" | "kg" | "g" | "l" | "ml" | "pack" | "box" | "m" | "cm";

export type MermaStage = "PRODUCTION" | "EMPAQUE" | "STOCK" | "TRANSITO_POST_REMITO" | "ADMINISTRATIVA";
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
  is_active: boolean;
  alert_green_min?: number | null;
  alert_yellow_min?: number | null;
  alert_red_max?: number | null;
};

export type SkuPayload = {
  code: string;
  name: string;
  sku_type_id: number;
  unit: UnitOfMeasure;
  units_per_kg?: number | null;
  notes?: string | null;
  is_active: boolean;
  alert_green_min?: number | null;
  alert_yellow_min?: number | null;
  alert_red_max?: number | null;
};

export type Deposit = {
  id: number;
  name: string;
  location?: string | null;
  controls_lot: boolean;
  is_store: boolean;
  is_active: boolean;
};

export type StockLevel = {
  deposit_id: number;
  deposit_name: string;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  quantity: number;
  alert_status?: StockAlertStatus | null;
  alert_green_min?: number | null;
  alert_yellow_min?: number | null;
  alert_red_max?: number | null;
};

export type StockAlertStatus = "green" | "yellow" | "red" | "none";

export type StockAlertRow = {
  deposit_id: number;
  deposit_name: string;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  sku_type_id: number;
  sku_type_code: string;
  sku_type_label: string;
  unit: UnitOfMeasure;
  quantity: number;
  alert_status: StockAlertStatus;
  alert_green_min?: number | null;
  alert_yellow_min?: number | null;
  alert_red_max?: number | null;
};

export type StockAlertReport = {
  total: number;
  items: StockAlertRow[];
};

export type Supplier = {
  id: number;
  name: string;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
};

export type SupplierPayload = {
  name: string;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
};

export type PurchaseReceiptItemPayload = {
  sku_id: number;
  quantity: number;
  unit: UnitOfMeasure;
  lot_code?: string | null;
  expiry_date?: string | null;
  unit_cost?: number | null;
};

export type PurchaseReceiptItem = PurchaseReceiptItemPayload & {
  id: number;
  sku_code: string;
  sku_name: string;
  stock_movement_id?: number | null;
};

export type PurchaseReceipt = {
  id: number;
  supplier_id: number;
  supplier_name?: string | null;
  deposit_id: number;
  deposit_name?: string | null;
  received_at: string;
  document_number?: string | null;
  notes?: string | null;
  created_at: string;
  created_by_user_id?: number | null;
  created_by_name?: string | null;
  items: PurchaseReceiptItem[];
};

export type PurchaseReceiptPayload = {
  supplier_id: number;
  deposit_id: number;
  received_at?: string | null;
  document_number?: string | null;
  notes?: string | null;
  items: PurchaseReceiptItemPayload[];
};

export type StockMovement = {
  id: number;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  deposit_id: number;
  deposit_name: string;
  movement_type_id: number;
  movement_type_code: string;
  movement_type_label: string;
  quantity: number;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_item_id?: number | null;
  reference?: string | null;
  lot_code?: string | null;
  production_lot_id?: number | null;
  production_line_id?: number | null;
  production_line_name?: string | null;
  expiry_date?: string | null;
  movement_date: string;
  created_at: string;
  current_balance?: number | null;
  created_by_user_id?: number | null;
  created_by_name?: string | null;
};

export type StockMovementList = {
  total: number;
  items: StockMovement[];
};

export type StockMovementPayload = {
  sku_id: number;
  deposit_id: number;
  movement_type_id: number;
  quantity: number;
  is_outgoing?: boolean | null;
  reference_type?: string | null;
  reference_id?: number | null;
  reference_item_id?: number | null;
  unit?: UnitOfMeasure;
  reference?: string;
  lot_code?: string;
  production_line_id?: number | null;
  expiry_date?: string | null;
  movement_date?: string;
  created_by_user_id?: number | null;
};

export type ExpiryStatus = "green" | "yellow" | "red" | "none";

export type ExpiryReportRow = {
  lot_id?: number | null;
  lot_code?: string | null;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  deposit_id: number;
  deposit_name: string;
  remaining_quantity: number;
  unit: UnitOfMeasure;
  produced_at: string;
  expiry_date?: string | null;
  days_to_expiry?: number | null;
  status: ExpiryStatus;
};

export type ExpiryReport = {
  total: number;
  items: ExpiryReportRow[];
};

export type Role = {
  id: number;
  name: string;
  description?: string | null;
};

export type Permission = {
  id: number;
  key: string;
  label: string;
  category: string;
  action: string;
};

export type RolePermissionsPayload = {
  permissions: string[];
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
  is_active: boolean;
};

export type OrderStatus =
  | "draft"
  | "submitted"
  | "prepared"
  | "partially_prepared"
  | "partially_dispatched"
  | "dispatched"
  | "cancelled";

export type OrderItem = {
  id?: number;
  sku_id: number;
  sku_code?: string;
  sku_name?: string;
  quantity: number;
  current_stock?: number | null;
  prepared_quantity?: number | null;
  dispatched_quantity?: number | null;
  pending_quantity?: number | null;
  has_legacy_decimal?: boolean | null;
  quantity_raw?: number | null;
};

export type Order = {
  id: number;
  destination: string;
  destination_deposit_id?: number | null;
  requested_for?: string | null;
  required_delivery_date?: string | null;
  requested_by?: string | null;
  estimated_delivery_date?: string | null;
  status: OrderStatus;
  notes?: string | null;
  plant_internal_note?: string | null;
  created_at: string;
  cancelled_at?: string | null;
  cancelled_by_user_id?: number | null;
  cancelled_by_name?: string | null;
  created_by_user_id?: number | null;
  created_by_name?: string | null;
  updated_by_user_id?: number | null;
  updated_by_name?: string | null;
  items: OrderItem[];
};

export type RemitoStatus = "pending" | "dispatched" | "received" | "cancelled";

export type RemitoItem = {
  id: number;
  remito_id: number;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  quantity: number;
  lot_code?: string | null;
};

export type OrderSummary = {
  id: number;
  status: OrderStatus;
  destination: string;
  requested_for?: string | null;
  required_delivery_date?: string | null;
};

export type Remito = {
  id: number;
  order_id?: number | null;
  shipment_id?: number | null;
  status: RemitoStatus;
  destination: string;
  source_deposit_id?: number | null;
  destination_deposit_id?: number | null;
  source_deposit_name?: string | null;
  destination_deposit_name?: string | null;
  issue_date: string;
  dispatched_at?: string | null;
  received_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  pdf_path?: string | null;
  created_by_user_id?: number | null;
  created_by_name?: string | null;
  updated_by_user_id?: number | null;
  updated_by_name?: string | null;
  origin_orders?: OrderSummary[];
  items: RemitoItem[];
};

export async function fetchRemitoPdfBlob(remitoId: number): Promise<Blob> {
  const response = await apiFetch(`/remitos/${remitoId}/pdf`);
  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(response.status, detail || "No pudimos descargar el PDF.");
  }
  return response.blob();
}

export type ShipmentStatus = "draft" | "confirmed" | "dispatched";

export type ShipmentItem = {
  id: number;
  shipment_id: number;
  order_id: number;
  order_item_id: number;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  quantity: number;
  ordered_quantity: number;
  dispatched_quantity: number;
  remaining_quantity: number;
};

export type Shipment = {
  id: number;
  deposit_id: number;
  deposit_name?: string | null;
  estimated_delivery_date: string;
  status: ShipmentStatus;
  created_at: string;
  updated_at: string;
  orders?: OrderSummary[];
  items?: ShipmentItem[];
};

export type ProductionLot = {
  id: number;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  deposit_id: number;
  deposit_name: string;
  production_line_id?: number | null;
  production_line_name?: string | null;
  produced_quantity: number;
  remaining_quantity: number;
  lot_code: string;
  produced_at: string;
  is_blocked: boolean;
  notes?: string | null;
};

export type InventoryCountStatus = "draft" | "submitted" | "approved" | "closed" | "cancelled";

export type InventoryCountItemPayload = {
  sku_id: number;
  counted_quantity: number;
  production_lot_id?: number | null;
};

export type InventoryCountPayload = {
  deposit_id: number;
  count_date?: string | null;
  notes?: string | null;
  items: InventoryCountItemPayload[];
};

export type InventoryCountItem = {
  id: number;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  production_lot_id?: number | null;
  lot_code?: string | null;
  counted_quantity: number;
  system_quantity: number;
  difference: number;
  unit: UnitOfMeasure;
  stock_movement_id?: number | null;
};

export type InventoryCount = {
  id: number;
  deposit_id: number;
  deposit_name: string;
  status: InventoryCountStatus;
  count_date: string;
  notes?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  closed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  created_by_user_id?: number | null;
  created_by_name?: string | null;
  updated_by_user_id?: number | null;
  updated_by_name?: string | null;
  approved_by_user_id?: number | null;
  approved_by_name?: string | null;
  items: InventoryCountItem[];
};

export type AuditAction = "create" | "update" | "delete" | "status" | "approve" | "cancel";

export type AuditLog = {
  id: number;
  entity_type: string;
  entity_id?: number | null;
  action: AuditAction;
  changes?: Record<string, unknown> | null;
  user_id?: number | null;
  user_name?: string | null;
  ip_address?: string | null;
  created_at: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user?: User;
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
  return apiRequest("/health", {}, "No se pudo obtener el estado de la API");
}

export async function fetchRoles(): Promise<Role[]> {
  return apiRequest("/roles", {}, "No se pudo obtener los roles");
}

export async function fetchPermissions(): Promise<Permission[]> {
  return apiRequest("/permissions", {}, "No se pudo obtener los permisos");
}

export async function fetchRolePermissions(roleId: number): Promise<string[]> {
  return apiRequest(`/roles/${roleId}/permissions`, {}, "No se pudo obtener los permisos del rol");
}

export async function updateRolePermissions(roleId: number, payload: RolePermissionsPayload): Promise<string[]> {
  return apiRequest(
    `/roles/${roleId}/permissions`,
    { method: "PUT", body: JSON.stringify(payload) },
    "No se pudo actualizar los permisos del rol"
  );
}

export async function loginWithCredentials(username: string, password: string): Promise<LoginResponse> {
  return apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }, "No se pudo iniciar sesión");
}

export async function fetchCurrentUser(): Promise<User> {
  return apiRequest("/auth/me", {}, "No se pudo obtener el usuario");
}

export async function fetchSkuTypes(params?: { include_inactive?: boolean }): Promise<SKUType[]> {
  const query = new URLSearchParams();
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  return apiRequest(`/sku-types${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudo obtener los tipos de SKU");
}

export async function createSkuType(payload: Omit<SKUType, "id">): Promise<SKUType> {
  return apiRequest("/sku-types", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el tipo de SKU");
}

export async function updateSkuType(id: number, payload: Partial<Omit<SKUType, "id" | "code">>): Promise<SKUType> {
  return apiRequest(`/sku-types/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el tipo de SKU");
}

export async function deleteSkuType(id: number): Promise<void> {
  await apiRequest(`/sku-types/${id}`, { method: "DELETE" }, "No se pudo eliminar el tipo de SKU");
}

export async function fetchSkus(params?: { sku_type_ids?: number[]; tags?: string[]; include_inactive?: boolean; search?: string }): Promise<SKU[]> {
  const query = new URLSearchParams();
  if (params?.sku_type_ids?.length) {
    params.sku_type_ids.forEach((typeId) => query.append("sku_type_ids", typeId.toString()));
  }
  if (params?.tags?.length) {
    params.tags.forEach((tag) => query.append("tags", tag));
  }
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  if (params?.search) {
    query.append("search", params.search);
  }
  const queryString = query.toString();
  return apiRequest(`/skus${queryString ? `?${queryString}` : ""}`, {}, "No se pudo obtener la lista de SKUs");
}

export async function fetchDeposits(params?: { include_inactive?: boolean }): Promise<Deposit[]> {
  const query = new URLSearchParams();
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  return apiRequest(`/deposits${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudo obtener la lista de depósitos");
}

export async function fetchStockLevels(): Promise<StockLevel[]> {
  return apiRequest("/stock-levels", {}, "No se pudo obtener el stock actual");
}

export async function fetchStockMovements(params?: {
  sku_id?: number;
  deposit_id?: number;
  movement_type_id?: number;
  movement_type_code?: string;
  production_line_id?: number;
  lot_code?: string;
  reference_type?: string;
  reference_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}): Promise<StockMovementList> {
  const query = new URLSearchParams();
  if (params?.sku_id) query.append("sku_id", String(params.sku_id));
  if (params?.deposit_id) query.append("deposit_id", String(params.deposit_id));
  if (params?.movement_type_id) query.append("movement_type_id", String(params.movement_type_id));
  if (params?.movement_type_code) query.append("movement_type_code", params.movement_type_code);
  if (params?.production_line_id) query.append("production_line_id", String(params.production_line_id));
  if (params?.lot_code) query.append("lot_code", params.lot_code);
  if (params?.reference_type) query.append("reference_type", params.reference_type);
  if (params?.reference_id) query.append("reference_id", String(params.reference_id));
  if (params?.date_from) query.append("date_from", params.date_from);
  if (params?.date_to) query.append("date_to", params.date_to);
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.offset) query.append("offset", String(params.offset));

  return apiRequest(`/stock/movements${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudieron obtener los movimientos de stock");
}

export async function fetchUnits(): Promise<UnitOption[]> {
  return apiRequest("/units", {}, "No se pudo obtener las unidades");
}

export async function createSku(payload: SkuPayload): Promise<SKU> {
  return apiRequest("/skus", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el SKU");
}

export async function updateSku(id: number, payload: Partial<SkuPayload>): Promise<SKU> {
  return apiRequest(`/skus/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el SKU");
}

export async function deleteSku(id: number): Promise<void> {
  await apiRequest(`/skus/${id}`, { method: "DELETE" }, "No se pudo eliminar el SKU");
}

export async function updateSkuStatus(id: number, is_active: boolean): Promise<SKU> {
  return apiRequest(`/skus/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active }) }, "No se pudo actualizar el estado del SKU");
}

export async function createDeposit(payload: Omit<Deposit, "id">): Promise<Deposit> {
  return apiRequest("/deposits", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el depósito");
}

export async function updateDeposit(id: number, payload: Partial<Omit<Deposit, "id">>): Promise<Deposit> {
  return apiRequest(`/deposits/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el depósito");
}

export async function deleteDeposit(id: number): Promise<void> {
  await apiRequest(`/deposits/${id}`, { method: "DELETE" }, "No se pudo eliminar el depósito");
}

export async function updateDepositStatus(id: number, is_active: boolean): Promise<Deposit> {
  return apiRequest(`/deposits/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active }) }, "No se pudo actualizar el estado del depósito");
}

export async function fetchStockMovementTypes(params?: { include_inactive?: boolean }): Promise<StockMovementType[]> {
  const query = new URLSearchParams();
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  return apiRequest(`/stock/movement-types${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudieron obtener los tipos de movimiento de stock");
}

export async function fetchProductionLots(params?: {
  deposit_id?: number;
  sku_id?: number;
  production_line_id?: number;
  lot_code?: string;
  available_only?: boolean;
  include_blocked?: boolean;
}): Promise<ProductionLot[]> {
  const query = new URLSearchParams();
  if (params?.deposit_id) query.set("deposit_id", String(params.deposit_id));
  if (params?.sku_id) query.set("sku_id", String(params.sku_id));
  if (params?.production_line_id) query.set("production_line_id", String(params.production_line_id));
  if (params?.lot_code) query.set("lot_code", params.lot_code);
  if (params?.available_only) query.set("available_only", "true");
  if (params?.include_blocked) query.set("include_blocked", "true");
  const path = query.toString() ? `/production/lots?${query.toString()}` : "/production/lots";
  return apiRequest<ProductionLot[]>(path, {}, "No pudimos obtener los lotes");
}

export async function fetchInventoryCounts(params?: {
  status?: InventoryCountStatus;
  deposit_id?: number;
  date_from?: string;
  date_to?: string;
}): Promise<InventoryCount[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status_filter", params.status);
  if (params?.deposit_id) query.set("deposit_id", String(params.deposit_id));
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  const path = query.toString() ? `/inventory-counts?${query.toString()}` : "/inventory-counts";
  return apiRequest<InventoryCount[]>(path, {}, "No pudimos obtener los conteos");
}

export async function fetchInventoryCount(countId: number): Promise<InventoryCount> {
  return apiRequest<InventoryCount>(`/inventory-counts/${countId}`, {}, "No pudimos obtener el conteo");
}

export async function createInventoryCount(payload: InventoryCountPayload): Promise<InventoryCount> {
  return apiRequest<InventoryCount>("/inventory-counts", { method: "POST", body: JSON.stringify(payload) }, "No pudimos crear el conteo");
}

export async function updateInventoryCount(countId: number, payload: Partial<InventoryCountPayload>): Promise<InventoryCount> {
  return apiRequest<InventoryCount>(
    `/inventory-counts/${countId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    "No pudimos actualizar el conteo"
  );
}

export async function submitInventoryCount(countId: number): Promise<InventoryCount> {
  return apiRequest<InventoryCount>(`/inventory-counts/${countId}/submit`, { method: "POST" }, "No pudimos enviar el conteo");
}

export async function approveInventoryCount(countId: number): Promise<InventoryCount> {
  return apiRequest<InventoryCount>(`/inventory-counts/${countId}/approve`, { method: "POST" }, "No pudimos aprobar el conteo");
}

export async function closeInventoryCount(countId: number): Promise<InventoryCount> {
  return apiRequest<InventoryCount>(`/inventory-counts/${countId}/close`, { method: "POST" }, "No pudimos cerrar el conteo");
}

export async function cancelInventoryCount(countId: number): Promise<InventoryCount> {
  return apiRequest<InventoryCount>(`/inventory-counts/${countId}/cancel`, { method: "POST" }, "No pudimos cancelar el conteo");
}

export async function fetchAuditLogs(params?: {
  entity_type?: string;
  entity_id?: number;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const query = new URLSearchParams();
  if (params?.entity_type) query.set("entity_type", params.entity_type);
  if (params?.entity_id) query.set("entity_id", String(params.entity_id));
  if (params?.user_id) query.set("user_id", String(params.user_id));
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  if (params?.limit) query.set("limit", String(params.limit));
  const path = query.toString() ? `/audit/logs?${query.toString()}` : "/audit/logs";
  return apiRequest<AuditLog[]>(path, {}, "No pudimos obtener la auditoría");
}

export async function createStockMovementType(payload: Omit<StockMovementType, "id">): Promise<StockMovementType> {
  return apiRequest("/stock/movement-types", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el tipo de movimiento");
}

export async function updateStockMovementType(
  id: number,
  payload: Partial<Omit<StockMovementType, "id" | "code">>,
): Promise<StockMovementType> {
  return apiRequest(`/stock/movement-types/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el tipo de movimiento");
}

export async function deleteStockMovementType(id: number): Promise<void> {
  await apiRequest(`/stock/movement-types/${id}`, { method: "DELETE" }, "No se pudo eliminar el tipo de movimiento");
}

export async function createStockMovement(payload: StockMovementPayload): Promise<StockLevel> {
  return apiRequest("/stock/movements", { method: "POST", body: JSON.stringify(payload) }, "No se pudo registrar el movimiento");
}

export async function fetchRecipes(params?: { include_inactive?: boolean }): Promise<Recipe[]> {
  const query = new URLSearchParams();
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  return apiRequest(`/recipes${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudo obtener las recetas");
}

export async function createRecipe(payload: Omit<Recipe, "id">): Promise<Recipe> {
  return apiRequest("/recipes", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear la receta");
}

export async function updateRecipe(id: number, payload: Omit<Recipe, "id">): Promise<Recipe> {
  return apiRequest(`/recipes/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar la receta");
}

export async function deleteRecipe(id: number): Promise<void> {
  await apiRequest(`/recipes/${id}`, { method: "DELETE" }, "No se pudo eliminar la receta");
}

export async function updateRecipeStatus(id: number, is_active: boolean): Promise<Recipe> {
  return apiRequest(`/recipes/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active }) }, "No se pudo actualizar el estado de la receta");
}

export async function fetchStockReport(): Promise<StockReport> {
  return apiRequest("/reports/stock-summary", {}, "No se pudo obtener el reporte de stock");
}

export async function fetchStockAlertReport(params?: {
  sku_type_ids?: number[];
  deposit_ids?: number[];
  alert_status?: StockAlertStatus[];
  search?: string;
  min_quantity?: number;
  max_quantity?: number;
  only_configured?: boolean;
  include_inactive?: boolean;
}): Promise<StockAlertReport> {
  const query = new URLSearchParams();
  if (params?.sku_type_ids?.length) {
    params.sku_type_ids.forEach((id) => query.append("sku_type_ids", id.toString()));
  }
  if (params?.deposit_ids?.length) {
    params.deposit_ids.forEach((id) => query.append("deposit_ids", id.toString()));
  }
  if (params?.alert_status?.length) {
    params.alert_status.forEach((status) => query.append("alert_status", status));
  }
  if (params?.search) {
    query.append("search", params.search);
  }
  if (params?.min_quantity !== undefined) {
    query.append("min_quantity", params.min_quantity.toString());
  }
  if (params?.max_quantity !== undefined) {
    query.append("max_quantity", params.max_quantity.toString());
  }
  if (params?.only_configured) {
    query.append("only_configured", "true");
  }
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  return apiRequest(
    `/reports/stock-alerts${query.toString() ? `?${query.toString()}` : ""}`,
    {},
    "No se pudo obtener el reporte de alertas de stock",
  );
}

export async function fetchStockExpirations(params?: {
  sku_id?: number;
  deposit_id?: number;
  status?: ExpiryStatus[];
  expiry_from?: string;
  expiry_to?: string;
  include_no_expiry?: boolean;
}): Promise<ExpiryReport> {
  const query = new URLSearchParams();
  if (params?.sku_id) {
    query.append("sku_id", params.sku_id.toString());
  }
  if (params?.deposit_id) {
    query.append("deposit_id", params.deposit_id.toString());
  }
  if (params?.status?.length) {
    params.status.forEach((value) => query.append("status", value));
  }
  if (params?.expiry_from) {
    query.append("expiry_from", params.expiry_from);
  }
  if (params?.expiry_to) {
    query.append("expiry_to", params.expiry_to);
  }
  if (params?.include_no_expiry === false) {
    query.append("include_no_expiry", "false");
  }
  return apiRequest(
    `/reports/stock-expirations${query.toString() ? `?${query.toString()}` : ""}`,
    {},
    "No se pudo obtener el reporte de vencimientos",
  );
}

export async function fetchSuppliers(params?: { include_inactive?: boolean }): Promise<Supplier[]> {
  const query = new URLSearchParams();
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  return apiRequest(`/suppliers${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudieron obtener los proveedores");
}

export async function createSupplier(payload: SupplierPayload): Promise<Supplier> {
  return apiRequest("/suppliers", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el proveedor");
}

export async function updateSupplier(id: number, payload: Partial<SupplierPayload>): Promise<Supplier> {
  return apiRequest(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el proveedor");
}

export async function fetchPurchaseReceipts(params?: {
  supplier_id?: number;
  date_from?: string;
  date_to?: string;
}): Promise<PurchaseReceipt[]> {
  const query = new URLSearchParams();
  if (params?.supplier_id) {
    query.append("supplier_id", params.supplier_id.toString());
  }
  if (params?.date_from) {
    query.append("date_from", params.date_from);
  }
  if (params?.date_to) {
    query.append("date_to", params.date_to);
  }
  return apiRequest(
    `/purchases/receipts${query.toString() ? `?${query.toString()}` : ""}`,
    {},
    "No se pudieron obtener los ingresos de compra",
  );
}

export async function createPurchaseReceipt(payload: PurchaseReceiptPayload): Promise<PurchaseReceipt> {
  return apiRequest(
    "/purchases/receipts",
    { method: "POST", body: JSON.stringify(payload) },
    "No se pudo registrar el ingreso de compra",
  );
}

export async function fetchOrders(params?: { status?: OrderStatus; destination_deposit_id?: number }): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append("status_filter", params.status);
  if (params?.destination_deposit_id) query.append("destination_deposit_id", String(params.destination_deposit_id));
  const queryString = query.toString();
  return apiRequest(`/orders${queryString ? `?${queryString}` : ""}`, {}, "No se pudieron obtener los pedidos");
}

export async function createOrder(
  payload: {
    destination_deposit_id: number;
    notes?: string | null;
    items: OrderItem[];
    requested_for?: string | null;
    required_delivery_date?: string | null;
    requested_by?: string | null;
    status?: OrderStatus;
    plant_internal_note?: string | null;
  }
): Promise<Order> {
  return apiRequest("/orders", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el pedido");
}

export async function updateOrder(id: number, payload: Partial<Omit<Order, "id" | "created_at">>): Promise<Order> {
  return apiRequest(`/orders/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el pedido");
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  return apiRequest(`/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }, "No se pudo actualizar el estado");
}

export async function deleteOrder(id: number): Promise<void> {
  await apiRequest(`/orders/${id}`, { method: "DELETE" }, "No se pudo eliminar el pedido");
}

export async function fetchRemitos(): Promise<Remito[]> {
  return apiRequest("/remitos", {}, "No se pudieron obtener los remitos");
}

export async function dispatchRemito(remitoId: number): Promise<Remito> {
  return apiRequest(`/remitos/${remitoId}/dispatch`, { method: "POST" }, "No se pudo despachar el remito");
}

export async function receiveRemito(remitoId: number): Promise<Remito> {
  return apiRequest(`/remitos/${remitoId}/receive`, { method: "POST" }, "No se pudo recibir el remito");
}

export async function cancelRemito(remitoId: number): Promise<Remito> {
  return apiRequest(`/remitos/${remitoId}/cancel`, { method: "POST" }, "No se pudo cancelar el remito");
}

export async function fetchShipments(params?: {
  deposit_id?: number;
  status?: ShipmentStatus;
  date_from?: string;
  date_to?: string;
}): Promise<Shipment[]> {
  const query = new URLSearchParams();
  if (params?.deposit_id) query.append("deposit_id", String(params.deposit_id));
  if (params?.status) query.append("status_filter", params.status);
  if (params?.date_from) query.append("date_from", params.date_from);
  if (params?.date_to) query.append("date_to", params.date_to);
  return apiRequest(`/shipments${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudieron obtener los envíos");
}

export async function fetchShipment(id: number): Promise<Shipment> {
  return apiRequest(`/shipments/${id}`, {}, "No se pudo obtener el envío");
}

export async function createShipment(payload: { deposit_id: number; estimated_delivery_date: string }): Promise<Shipment> {
  return apiRequest("/shipments", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el envío");
}

export async function updateShipment(
  id: number,
  payload: { deposit_id?: number; estimated_delivery_date?: string },
): Promise<Shipment> {
  return apiRequest(`/shipments/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el envío");
}

export async function addOrdersToShipment(id: number, order_ids: number[]): Promise<Shipment> {
  return apiRequest(
    `/shipments/${id}/add-orders`,
    { method: "POST", body: JSON.stringify({ order_ids }) },
    "No se pudieron agregar los pedidos al envío",
  );
}

export async function updateShipmentItems(
  id: number,
  items: Array<{ order_item_id: number; quantity: number }>,
): Promise<Shipment> {
  return apiRequest(
    `/shipments/${id}/items`,
    { method: "POST", body: JSON.stringify(items) },
    "No se pudieron actualizar los ítems del envío",
  );
}

export async function confirmShipment(id: number): Promise<Shipment> {
  return apiRequest(`/shipments/${id}/confirm`, { method: "POST" }, "No se pudo confirmar el envío");
}

export async function cancelShipment(id: number): Promise<Shipment> {
  return apiRequest(`/shipments/${id}/cancel`, { method: "POST" }, "No se pudo cancelar el envío");
}

export async function dispatchShipment(id: number): Promise<Shipment> {
  return apiRequest(`/shipments/${id}/dispatch`, { method: "POST" }, "No se pudo despachar el envío");
}

export async function fetchUsers(): Promise<User[]> {
  return apiRequest("/users", {}, "No se pudieron obtener los usuarios");
}

export async function createUser(payload: { email: string; full_name: string; password: string; role_id?: number | null; is_active?: boolean }): Promise<User> {
  return apiRequest("/users", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el usuario");
}

export async function updateUser(id: number, payload: Partial<{ email: string; full_name: string; password: string; role_id?: number | null; is_active?: boolean }>): Promise<User> {
  return apiRequest(`/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el usuario");
}

export async function deleteUser(id: number): Promise<void> {
  await apiRequest(`/users/${id}`, { method: "DELETE" }, "No se pudo eliminar el usuario");
}

export async function fetchProductionLines(): Promise<ProductionLine[]> {
  return apiRequest("/production-lines", {}, "No se pudieron obtener las líneas de producción");
}

export async function createProductionLine(payload: { name: string; is_active?: boolean }): Promise<ProductionLine> {
  return apiRequest("/production-lines", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear la línea");
}

export async function updateProductionLine(id: number, payload: Partial<{ name: string; is_active: boolean }>): Promise<ProductionLine> {
  return apiRequest(`/production-lines/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar la línea");
}

export async function fetchMermaTypes(params?: { stage?: MermaStage; include_inactive?: boolean }): Promise<MermaType[]> {
  const query = new URLSearchParams();
  if (params?.stage) {
    query.append("stage", params.stage);
  }
  if (params?.include_inactive) {
    query.append("include_inactive", "true");
  }
  return apiRequest(`/mermas/types${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudieron obtener los tipos de merma");
}

export async function createMermaType(payload: Omit<MermaType, "id">): Promise<MermaType> {
  return apiRequest("/mermas/types", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear el tipo de merma");
}

export async function updateMermaType(id: number, payload: Partial<Omit<MermaType, "id" | "code">>): Promise<MermaType> {
  return apiRequest(`/mermas/types/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar el tipo de merma");
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
  return apiRequest(`/mermas/causes${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudieron obtener las causas de merma");
}

export async function createMermaCause(payload: Omit<MermaCause, "id">): Promise<MermaCause> {
  return apiRequest("/mermas/causes", { method: "POST", body: JSON.stringify(payload) }, "No se pudo crear la causa de merma");
}

export async function updateMermaCause(id: number, payload: Partial<Omit<MermaCause, "id" | "code">>): Promise<MermaCause> {
  return apiRequest(`/mermas/causes/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "No se pudo actualizar la causa de merma");
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
  return apiRequest("/mermas", { method: "POST", body: JSON.stringify(payload) }, "No se pudo registrar la merma");
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

  return apiRequest(`/mermas${query.toString() ? `?${query.toString()}` : ""}`, {}, "No se pudieron obtener las mermas");
}

export async function fetchMermaEventDetail(id: number): Promise<MermaEvent> {
  return apiRequest(`/mermas/${id}`, {}, "No se pudo obtener el detalle de la merma");
}
