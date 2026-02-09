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
import { Alert, AppBar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Typography } from "@mui/material";
import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { UIModule, isModuleEnabled } from "../core/uiAccessCatalog";

const drawerWidth = 240;

export type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  module: UIModule;
  state?: Record<string, unknown>;
};

const NAV_CONFIG: NavItem[] = [
  { label: "Inicio", icon: <DashboardIcon />, to: "/", module: "dashboard" },
  { label: "Producción", icon: <ManufacturingIcon />, to: "/produccion", module: "production" },
  { label: "Stock", icon: <InventoryIcon />, to: "/stock", module: "stock" },
  { label: "Movimientos de stock", icon: <HistoryIcon />, to: "/stock/movimientos", module: "stock" },
  { label: "Inventarios físicos", icon: <HistoryIcon />, to: "/stock/inventarios", module: "inventories" },
  { label: "Mermas", icon: <ReportProblemIcon />, to: "/mermas", module: "waste" },
  { label: "Pedidos", icon: <ListAltIcon />, to: "/pedidos", module: "orders" },
  { label: "Envíos", icon: <LocalShippingIcon />, to: "/envios", module: "shipments" },
  { label: "Remitos", icon: <ReceiptLongIcon />, to: "/remitos", module: "shipments" },
  { label: "Compras", icon: <LocalMallIcon />, to: "/compras", module: "purchases" },
  { label: "Ingreso de pedidos", icon: <PlaylistAddIcon />, to: "/pedidos/ingreso", state: { fromMenu: true }, module: "orders" },
  { label: "Maestros", icon: <AdminPanelSettingsIcon />, to: "/administracion", module: "admin" },
  { label: "Auditoría", icon: <HistoryIcon />, to: "/auditoria", module: "audit" },
  { label: "Reportes", icon: <ListAltIcon />, to: "/reportes", module: "reports" },
];

export function AppShell({ children, navItems = NAV_CONFIG }: PropsWithChildren<{ navItems?: NavItem[] }>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isSuperuser } = useAuth();
  const userPerms = user?.hasPermissionKeysV2 ? user.permissionKeysV2 : user?.legacyPermissions ?? [];

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => isModuleEnabled(userPerms, item.module)),
    [navItems, userPerms],
  );

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
      {!isSuperuser && visibleNavItems.length === 0 && (
        <Box px={2} py={1}>
          <Alert severity="info">No tenés módulos habilitados todavía. Contactá a un administrador.</Alert>
        </Box>
      )}
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
