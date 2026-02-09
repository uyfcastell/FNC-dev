import { ReactNode, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { getDeviceProfile, listenDeviceProfile } from "./lib/device";
import { AppShell } from "./shell/AppShell";
import { HomeRouterPage } from "./pages/HomeRouterPage";
import { ProductionPage } from "./pages/ProductionPage";
import { StockPage } from "./pages/StockPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ShipmentsPage } from "./pages/ShipmentsPage";
import { ShipmentDetailPage } from "./pages/ShipmentDetailPage";
import { ShipmentPrepPage } from "./pages/ShipmentPrepPage";
import { RemitosPage } from "./pages/RemitosPage";
import { ReportsPage } from "./pages/ReportsPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { LoginPage } from "./pages/LoginPage";
import { MobilePinLoginPage } from "./pages/MobilePinLoginPage";
import { MobileShell } from "./shell/MobileShell";
import { LocalWebShell } from "./shell/LocalWebShell";
import { MobileHomePage } from "./pages/MobileHomePage";
import { MobileProductionPage } from "./pages/MobileProductionPage";
import { MobileOrdersPage } from "./pages/MobileOrdersPage";
import { MobileShipmentsPage } from "./pages/MobileShipmentsPage";
import { AdminPage } from "./pages/AdminPage";
import { OrderEntryPage } from "./pages/OrderEntryPage";
import { MermasPage } from "./pages/MermasPage";
import { StockMovementsPage } from "./pages/StockMovementsPage";
import { InventoryCountsPage } from "./pages/InventoryCountsPage";
import { AuditPage } from "./pages/AuditPage";
import { RequireAuth, RequirePermission, useAuth } from "./lib/auth";
import { isLocalUser } from "./lib/roles";
import { ROUTE_PERMISSION_RULES } from "./lib/permissions";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { isRouteEnabled } from "./core/uiAccessCatalog";
import { NoAccessPage } from "./pages/NoAccessPage";


function RouteGuard({ requiredAnyPerms, element }: { requiredAnyPerms: string[]; element: ReactNode }) {
  return <RequirePermission anyOf={requiredAnyPerms}>{element}</RequirePermission>;
}

function WebRouteGuard({ path, element }: { path: string; element: ReactNode }) {
  const { user } = useAuth();
  const perms = user?.hasPermissionKeysV2 ? user.permissionKeysV2 : user?.legacyPermissions ?? [];

  if (!isRouteEnabled(perms, path)) {
    return <NoAccessPage />;
  }

  return <>{element}</>;
}

function MobileRoutes() {
  const { user } = useAuth();
  const localUser = isLocalUser(user);
  const navItems = localUser
    ? [{ label: "Pedidos", to: "/mobile/pedidos" }]
    : [
        { label: "Inicio", to: "/" },
        { label: "Producción", to: "/mobile/produccion" },
        { label: "Pedidos", to: "/mobile/pedidos" },
        { label: "Envíos", to: "/mobile/envios" },
      ];

  return (
    <MobileShell
      title="FNC | Producción"
      navItems={navItems}
    >
      <Routes>
        {localUser ? (
          <>
            <Route path="/" element={<Navigate to="/mobile/pedidos" replace />} />
            <Route path="/mobile/pedidos" element={<RequirePermission anyOf={ROUTE_PERMISSION_RULES["/mobile/pedidos"] ?? []}><MobileOrdersPage /></RequirePermission>} />
            <Route path="*" element={<Navigate to="/mobile/pedidos" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<RequirePermission anyOf={ROUTE_PERMISSION_RULES["/"] ?? []}><MobileHomePage /></RequirePermission>} />
            <Route path="/mobile/produccion" element={<RequirePermission anyOf={ROUTE_PERMISSION_RULES["/mobile/produccion"] ?? []}><MobileProductionPage /></RequirePermission>} />
            <Route path="/mobile/pedidos" element={<RequirePermission anyOf={ROUTE_PERMISSION_RULES["/mobile/pedidos"] ?? []}><MobileOrdersPage /></RequirePermission>} />
            <Route path="/mobile/envios" element={<RequirePermission anyOf={ROUTE_PERMISSION_RULES["/mobile/envios"] ?? []}><MobileShipmentsPage /></RequirePermission>} />
            <Route path="/mobile/envios/:shipmentId/preparar" element={<RequirePermission anyOf={ROUTE_PERMISSION_RULES["/mobile/envios/:shipmentId/preparar"] ?? []}><ShipmentPrepPage /></RequirePermission>} />
            <Route path="*" element={<ForbiddenPage />} />
          </>
        )}
      </Routes>
    </MobileShell>
  );
}

function DesktopRoutes() {
  const { user } = useAuth();
  const localUser = isLocalUser(user);
  const ShellComponent = localUser ? LocalWebShell : AppShell;

  return (
    <ShellComponent>
      <Routes>
        <Route path="/" element={<WebRouteGuard path="/" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/"] ?? []} element={<HomeRouterPage />} />} />} />
        <Route path="/produccion" element={<WebRouteGuard path="/produccion" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/produccion"] ?? []} element={<ProductionPage />} />} />} />
        <Route path="/stock" element={<WebRouteGuard path="/stock" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/stock"] ?? []} element={<StockPage />} />} />} />
        <Route path="/stock/movimientos" element={<WebRouteGuard path="/stock/movimientos" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/stock/movimientos"] ?? []} element={<StockMovementsPage />} />} />} />
        <Route path="/stock/inventarios" element={<WebRouteGuard path="/stock/inventarios" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/stock/inventarios"] ?? []} element={<InventoryCountsPage />} />} />} />
        <Route path="/mermas" element={<WebRouteGuard path="/mermas" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/mermas"] ?? []} element={<MermasPage />} />} />} />
        <Route path="/pedidos" element={<WebRouteGuard path="/pedidos" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/pedidos"] ?? []} element={<OrdersPage />} />} />} />
        <Route path="/envios" element={<WebRouteGuard path="/envios" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/envios"] ?? []} element={<ShipmentsPage />} />} />} />
        <Route path="/envios/:shipmentId" element={<WebRouteGuard path="/envios/:shipmentId" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/envios/:shipmentId"] ?? []} element={<ShipmentDetailPage />} />} />} />
        <Route path="/envios/:shipmentId/preparar" element={<WebRouteGuard path="/envios/:shipmentId/preparar" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/envios/:shipmentId/preparar"] ?? []} element={<ShipmentPrepPage />} />} />} />
        <Route path="/remitos" element={<WebRouteGuard path="/remitos" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/remitos"] ?? []} element={<RemitosPage />} />} />} />
        <Route path="/compras" element={<WebRouteGuard path="/compras" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/compras"] ?? []} element={<PurchasesPage />} />} />} />
        <Route path="/pedidos/ingreso" element={<WebRouteGuard path="/pedidos/ingreso" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/pedidos/ingreso"] ?? []} element={<OrderEntryPage />} />} />} />
        <Route path="/administracion" element={<WebRouteGuard path="/administracion" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/administracion"] ?? []} element={<AdminPage />} />} />} />
        <Route path="/auditoria" element={<WebRouteGuard path="/auditoria" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/auditoria"] ?? []} element={<AuditPage />} />} />} />
        <Route path="/reportes" element={<WebRouteGuard path="/reportes" element={<RouteGuard requiredAnyPerms={ROUTE_PERMISSION_RULES["/reportes"] ?? []} element={<ReportsPage />} />} />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<Navigate to="/forbidden" replace />} />
      </Routes>
    </ShellComponent>
  );
}

export function App() {
  const [mode, setMode] = useState<"mobile" | "desktop">(getDeviceProfile().mode);

  useEffect(() => {
    const cleanup = listenDeviceProfile((profile) => setMode(profile.mode));
    return cleanup;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mobile/login-pin" element={<MobilePinLoginPage />} />
        <Route
          path="/*"
          element={<RequireAuth>{mode === "mobile" ? <MobileRoutes /> : <DesktopRoutes />}</RequireAuth>}
        />
      </Routes>
    </BrowserRouter>
  );
}
