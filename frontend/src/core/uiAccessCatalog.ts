export type UIModule =
  | "dashboard"
  | "orders"
  | "shipments"
  | "stock"
  | "production"
  | "inventories"
  | "purchases"
  | "waste"
  | "reports"
  | "audit"
  | "admin";

export const MODULE_ANY_PERMS: Record<UIModule, string[]> = {
  dashboard: ["dashboard.view"],
  orders: ["ops.orders.list", "ops.orders.read", "orders.view", "orders.create"],
  shipments: ["ops.shipments.list", "ops.shipments.read", "ops.remitos.list", "ops.remitos.read", "shipments.view", "remitos.view"],
  stock: ["ops.stock_levels.list", "ops.stock_movements.list", "stock.view", "stock.register"],
  production: ["ops.production.lots.list", "ops.production.lots.read", "production.view"],
  inventories: ["ops.inventory_counts.list", "ops.inventory_counts.read", "inventory.view"],
  purchases: ["ops.purchases.receipts.list", "ops.purchases.receipts.read", "purchases.view"],
  waste: ["ops.mermas.list", "ops.mermas.read", "mermas.view"],
  reports: ["report.stock.alerts.read", "report.stock.expirations.read", "report.stock.summary.read", "reports.view"],
  audit: ["admin.audit.logs.read", "admin.audit.logs.meta", "audit.view"],
  admin: ["admin.users.list", "admin.rbac.roles.list", "admin.rbac.permissions.list", "users.view", "roles.view"],
};

const WEB_ROUTE_TO_MODULE: Array<{ match: (path: string) => boolean; module: UIModule }> = [
  { match: (path) => path === "/", module: "dashboard" },
  { match: (path) => path === "/produccion", module: "production" },
  { match: (path) => path === "/stock" || path === "/stock/movimientos", module: "stock" },
  { match: (path) => path === "/stock/inventarios", module: "inventories" },
  { match: (path) => path === "/mermas", module: "waste" },
  { match: (path) => path === "/pedidos" || path === "/pedidos/ingreso", module: "orders" },
  { match: (path) => path.startsWith("/envios"), module: "shipments" },
  { match: (path) => path === "/remitos", module: "shipments" },
  { match: (path) => path === "/compras", module: "purchases" },
  { match: (path) => path === "/administracion", module: "admin" },
  { match: (path) => path === "/auditoria", module: "audit" },
  { match: (path) => path === "/reportes", module: "reports" },
];

const normalizePerms = (perms: string[]) => perms.map((perm) => perm.toLowerCase());
const normalizePath = (path: string) => {
  const cleanPath = path.split("?")[0].split("#")[0];
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) return cleanPath.slice(0, -1);
  return cleanPath;
};

export function hasAllAccess(perms: string[]): boolean {
  return normalizePerms(perms).includes("*");
}

export function hasAnyPerm(perms: string[], keys: string[]): boolean {
  const normalized = new Set(normalizePerms(perms));
  return keys.some((key) => normalized.has(key.toLowerCase()));
}

export function isModuleEnabled(perms: string[], module: UIModule): boolean {
  return hasAllAccess(perms) || hasAnyPerm(perms, MODULE_ANY_PERMS[module]);
}

export function isRouteEnabled(perms: string[], path: string): boolean {
  const normalizedPath = normalizePath(path);
  const routeConfig = WEB_ROUTE_TO_MODULE.find((entry) => entry.match(normalizedPath));
  if (!routeConfig) return true;
  return isModuleEnabled(perms, routeConfig.module);
}
