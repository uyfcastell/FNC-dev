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
import { ROUTE_PERMISSION_RULES } from "../lib/permissions";

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
  { label: "Producción", icon: <ManufacturingIcon />, to: "/produccion", requiredAnyPerms: ROUTE_PERMISSION_RULES["/produccion"] },
  { label: "Stock", icon: <InventoryIcon />, to: "/stock", requiredAnyPerms: ROUTE_PERMISSION_RULES["/stock"] },
  { label: "Movimientos de stock", icon: <HistoryIcon />, to: "/stock/movimientos", requiredAnyPerms: ROUTE_PERMISSION_RULES["/stock/movimientos"] },
  { label: "Inventarios físicos", icon: <HistoryIcon />, to: "/stock/inventarios", requiredAnyPerms: ROUTE_PERMISSION_RULES["/stock/inventarios"] },
  { label: "Mermas", icon: <ReportProblemIcon />, to: "/mermas", requiredAnyPerms: ROUTE_PERMISSION_RULES["/mermas"] },
  { label: "Pedidos", icon: <ListAltIcon />, to: "/pedidos", requiredAnyPerms: ROUTE_PERMISSION_RULES["/pedidos"] },
  { label: "Envíos", icon: <LocalShippingIcon />, to: "/envios", requiredAnyPerms: ROUTE_PERMISSION_RULES["/envios"] },
  { label: "Remitos", icon: <ReceiptLongIcon />, to: "/remitos", requiredAnyPerms: ROUTE_PERMISSION_RULES["/remitos"] },
  { label: "Compras", icon: <LocalMallIcon />, to: "/compras", requiredAnyPerms: ROUTE_PERMISSION_RULES["/compras"] },
  { label: "Ingreso de pedidos", icon: <PlaylistAddIcon />, to: "/pedidos/ingreso", state: { fromMenu: true }, requiredAnyPerms: ROUTE_PERMISSION_RULES["/pedidos/ingreso"] },
  { label: "Maestros", icon: <AdminPanelSettingsIcon />, to: "/administracion", requiredAnyPerms: ROUTE_PERMISSION_RULES["/administracion"] },
  { label: "Auditoría", icon: <HistoryIcon />, to: "/auditoria", requiredAnyPerms: ROUTE_PERMISSION_RULES["/auditoria"] },
  { label: "Reportes", icon: <ListAltIcon />, to: "/reportes", requiredAnyPerms: ROUTE_PERMISSION_RULES["/reportes"] },
];

export function AppShell({ children, navItems = NAV_CONFIG }: PropsWithChildren<{ navItems?: NavItem[] }>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, hasAny, isSuperuser } = useAuth();

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.requiredAnyPerms || item.requiredAnyPerms.length === 0 || hasAny(item.requiredAnyPerms)),
    [hasAny, navItems],
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
