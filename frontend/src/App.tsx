import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { getDeviceProfile, listenDeviceProfile } from "./lib/device";
import { AppShell } from "./shell/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductionPage } from "./pages/ProductionPage";
import { StockPage } from "./pages/StockPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ReportsPage } from "./pages/ReportsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { MobileShell } from "./shell/MobileShell";
import { MobileHomePage } from "./pages/MobileHomePage";
import { MobileOrdersPage } from "./pages/MobileOrdersPage";
import { AdminPage } from "./pages/AdminPage";
import { OrderEntryPage } from "./pages/OrderEntryPage";
import { MermasPage } from "./pages/MermasPage";

export function App() {
  const [mode, setMode] = useState<"mobile" | "desktop">(getDeviceProfile().mode);

  useEffect(() => {
    const cleanup = listenDeviceProfile((profile) => setMode(profile.mode));
    return cleanup;
  }, []);

  if (mode === "mobile") {
    return (
      <BrowserRouter>
        <MobileShell
          title="FNC | Producción"
          navItems={[
            { label: "Inicio", to: "/" },
            { label: "Pedidos y remitos", to: "/mobile/pedidos" },
          ]}
        >
          <Routes>
            <Route path="/" element={<MobileHomePage />} />
            <Route path="/mobile/pedidos" element={<MobileOrdersPage />} />
            <Route path="*" element={<MobileHomePage />} />
          </Routes>
        </MobileShell>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/produccion" element={<ProductionPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/mermas" element={<MermasPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/pedidos/ingreso" element={<OrderEntryPage />} />
          <Route path="/administracion" element={<AdminPage />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
