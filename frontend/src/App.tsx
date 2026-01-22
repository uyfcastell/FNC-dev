import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { getDeviceProfile, listenDeviceProfile } from "./lib/device";
import { AppShell } from "./shell/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductionPage } from "./pages/ProductionPage";
import { StockPage } from "./pages/StockPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ShipmentsPage } from "./pages/ShipmentsPage";
import { ShipmentDetailPage } from "./pages/ShipmentDetailPage";
import { RemitosPage } from "./pages/RemitosPage";
import { ReportsPage } from "./pages/ReportsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { MobileShell } from "./shell/MobileShell";
import { MobileHomePage } from "./pages/MobileHomePage";
import { MobileProductionPage } from "./pages/MobileProductionPage";
import { MobileOrdersPage } from "./pages/MobileOrdersPage";
import { AdminPage } from "./pages/AdminPage";
import { OrderEntryPage } from "./pages/OrderEntryPage";
import { MermasPage } from "./pages/MermasPage";
import { StockMovementsPage } from "./pages/StockMovementsPage";
import { InventoryCountsPage } from "./pages/InventoryCountsPage";
import { AuditPage } from "./pages/AuditPage";
import { RequireAuth } from "./lib/auth";

function MobileRoutes() {
  return (
    <MobileShell
      title="FNC | Producción"
      navItems={[
        { label: "Inicio", to: "/" },
        { label: "Producción", to: "/mobile/produccion" },
        { label: "Pedidos", to: "/mobile/pedidos" },
      ]}
    >
      <Routes>
        <Route path="/" element={<MobileHomePage />} />
        <Route path="/mobile/produccion" element={<MobileProductionPage />} />
        <Route path="/mobile/pedidos" element={<MobileOrdersPage />} />
        <Route path="*" element={<MobileHomePage />} />
      </Routes>
    </MobileShell>
  );
}

function DesktopRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/produccion" element={<ProductionPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/stock/movimientos" element={<StockMovementsPage />} />
        <Route path="/stock/inventarios" element={<InventoryCountsPage />} />
        <Route path="/mermas" element={<MermasPage />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/envios" element={<ShipmentsPage />} />
        <Route path="/envios/:shipmentId" element={<ShipmentDetailPage />} />
        <Route path="/remitos" element={<RemitosPage />} />
        <Route path="/pedidos/ingreso" element={<OrderEntryPage />} />
        <Route path="/administracion" element={<AdminPage />} />
        <Route path="/auditoria" element={<AuditPage />} />
        <Route path="/reportes" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
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
        <Route
          path="/*"
          element={<RequireAuth>{mode === "mobile" ? <MobileRoutes /> : <DesktopRoutes />}</RequireAuth>}
        />
      </Routes>
    </BrowserRouter>
  );
}
