import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory2";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LogoutIcon from "@mui/icons-material/Logout";
import ManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import MenuIcon from "@mui/icons-material/Menu";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import HistoryIcon from "@mui/icons-material/History";
import { AppBar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Typography } from "@mui/material";
import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth";

const drawerWidth = 240;

export type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  requiredAnyPerms?: string[];
  state?: Record<string, unknown>;
};

const NAV_CONFIG: NavItem[] = [
  { label: "Inicio", icon: <DashboardIcon />, to: "/", requiredAnyPerms: [] },
  { label: "Producción", icon: <ManufacturingIcon />, to: "/produccion", requiredAnyPerms: ["ops.production.lots.list", "ops.production.lots.read"] },
  { label: "Stock", icon: <InventoryIcon />, to: "/stock", requiredAnyPerms: ["ops.stock_levels.list", "ops.stock_movements.list"] },
  { label: "Movimientos de stock", icon: <HistoryIcon />, to: "/stock/movimientos", requiredAnyPerms: ["ops.stock_movements.list", "ops.stock_movements.create"] },
  { label: "Inventarios físicos", icon: <HistoryIcon />, to: "/stock/inventarios", requiredAnyPerms: ["ops.inventory_counts.list", "ops.inventory_counts.create", "ops.inventory_counts.read"] },
  { label: "Mermas", icon: <ReportProblemIcon />, to: "/mermas", requiredAnyPerms: ["ops.mermas.list", "ops.mermas.create"] },
  { label: "Pedidos", icon: <ListAltIcon />, to: "/pedidos", requiredAnyPerms: ["ops.orders.list", "ops.orders.create", "ops.orders.read"] },
  { label: "Envíos", icon: <LocalShippingIcon />, to: "/envios", requiredAnyPerms: ["ops.shipments.list", "ops.shipments.create", "ops.shipments.read"] },
  { label: "Remitos", icon: <ReceiptLongIcon />, to: "/remitos", requiredAnyPerms: ["ops.remitos.list", "ops.remitos.read"] },
  { label: "Compras", icon: <LocalMallIcon />, to: "/compras", requiredAnyPerms: ["ops.purchases.receipts.list", "ops.purchases.receipts.create"] },
  { label: "Ingreso de pedidos", icon: <PlaylistAddIcon />, to: "/pedidos/ingreso", state: { fromMenu: true }, requiredAnyPerms: ["ops.orders.create", "ops.lookups.order_entry_skus.list"] },
  { label: "Maestros", icon: <AdminPanelSettingsIcon />, to: "/administracion", requiredAnyPerms: ["admin.users.list", "admin.rbac.roles.list", "admin.rbac.permissions.list"] },
  { label: "Auditoría", icon: <HistoryIcon />, to: "/auditoria", requiredAnyPerms: ["admin.audit.logs.read", "admin.audit.logs.meta"] },
  { label: "Reportes", icon: <ListAltIcon />, to: "/reportes", requiredAnyPerms: ["report.stock.alerts.read", "report.stock.expirations.read", "report.stock.summary.read"] },
];

export function AppShell({ children, navItems = NAV_CONFIG }: PropsWithChildren<{ navItems?: NavItem[] }>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, hasAny } = useAuth();

  const visibleNavItems = useMemo(() => {
    const filtered = navItems.filter((item) => !item.requiredAnyPerms || item.requiredAnyPerms.length === 0 || hasAny(item.requiredAnyPerms));
    if (filtered.length === 0) {
      return navItems.filter((item) => item.to === "/");
    }
    return filtered;
  }, [hasAny, navItems]);

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          FNC
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {visibleNavItems.map((item) => (
          <ListItemButton
            key={item.to}
            component={RouterLink}
            to={item.to}
            state={item.state}
            selected={location.pathname === item.to}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen((prev) => !prev)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            FNC | Gestión de producción y stock
          </Typography>
          <Box flexGrow={1} />
          <Stack direction="row" spacing={2} alignItems="center">
            {user && (
              <Typography variant="body2" color="inherit">
                {user.full_name} {user.role_name ? `(${user.role_name})` : ""}
              </Typography>
            )}
            <Button color="inherit" size="small" startIcon={<LogoutIcon />} onClick={logout}>
              Salir
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="navigation">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: "#f5f6fa",
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
