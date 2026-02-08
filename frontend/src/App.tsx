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


function GuardedRoute({ path, element }: { path: string; element: ReactNode }) {
  const requiredPermissions = ROUTE_PERMISSION_RULES[path] ?? [];
  return <RequirePermission anyOf={requiredPermissions}>{element}</RequirePermission>;
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
            <Route path="/mobile/pedidos" element={<GuardedRoute path="/mobile/pedidos" element={<MobileOrdersPage />} />} />
            <Route path="*" element={<Navigate to="/mobile/pedidos" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<GuardedRoute path="/" element={<MobileHomePage />} />} />
            <Route path="/mobile/produccion" element={<GuardedRoute path="/mobile/produccion" element={<MobileProductionPage />} />} />
            <Route path="/mobile/pedidos" element={<GuardedRoute path="/mobile/pedidos" element={<MobileOrdersPage />} />} />
            <Route path="/mobile/envios" element={<GuardedRoute path="/mobile/envios" element={<MobileShipmentsPage />} />} />
            <Route path="/mobile/envios/:shipmentId/preparar" element={<GuardedRoute path="/mobile/envios/:shipmentId/preparar" element={<ShipmentPrepPage />} />} />
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
        <Route path="/" element={<GuardedRoute path="/" element={<HomeRouterPage />} />} />
        <Route path="/produccion" element={<GuardedRoute path="/produccion" element={<ProductionPage />} />} />
        <Route path="/stock" element={<GuardedRoute path="/stock" element={<StockPage />} />} />
        <Route path="/stock/movimientos" element={<GuardedRoute path="/stock/movimientos" element={<StockMovementsPage />} />} />
        <Route path="/stock/inventarios" element={<GuardedRoute path="/stock/inventarios" element={<InventoryCountsPage />} />} />
        <Route path="/mermas" element={<GuardedRoute path="/mermas" element={<MermasPage />} />} />
        <Route path="/pedidos" element={<GuardedRoute path="/pedidos" element={<OrdersPage />} />} />
        <Route path="/envios" element={<GuardedRoute path="/envios" element={<ShipmentsPage />} />} />
        <Route path="/envios/:shipmentId" element={<GuardedRoute path="/envios/:shipmentId" element={<ShipmentDetailPage />} />} />
        <Route path="/envios/:shipmentId/preparar" element={<GuardedRoute path="/envios/:shipmentId/preparar" element={<ShipmentPrepPage />} />} />
        <Route path="/remitos" element={<GuardedRoute path="/remitos" element={<RemitosPage />} />} />
        <Route path="/compras" element={<GuardedRoute path="/compras" element={<PurchasesPage />} />} />
        <Route path="/pedidos/ingreso" element={<GuardedRoute path="/pedidos/ingreso" element={<OrderEntryPage />} />} />
        <Route path="/administracion" element={<GuardedRoute path="/administracion" element={<AdminPage />} />} />
        <Route path="/auditoria" element={<GuardedRoute path="/auditoria" element={<AuditPage />} />} />
        <Route path="/reportes" element={<GuardedRoute path="/reportes" element={<ReportsPage />} />} />
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
