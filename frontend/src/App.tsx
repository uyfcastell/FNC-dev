import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductionPage } from "./pages/ProductionPage";
import { StockPage } from "./pages/StockPage";
import { OrdersPage } from "./pages/OrdersPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/produccion" element={<ProductionPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
