import { Alert, Grid, Stack, Typography } from "@mui/material";

import { useAuth } from "../lib/auth";
import { QuickLinkCard } from "../shell/QuickLinkCard";

function LocalCapabilityHome() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Locales</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <QuickLinkCard title="Ingresar pedido" description="Carga rápida de pedidos para locales." to="/pedidos/ingreso" />
        </Grid>
        <Grid item xs={12} md={6}>
          <QuickLinkCard title="Mis pedidos" description="Seguimiento del estado de tus pedidos." to="/pedidos?mine=true" />
        </Grid>
      </Grid>
    </Stack>
  );
}

function DepositoCapabilityHome() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Depósito</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><QuickLinkCard title="Stock" description="Ver stock actual y niveles." to="/stock" /></Grid>
        <Grid item xs={12} md={6}><QuickLinkCard title="Movimientos" description="Registrar y consultar movimientos." to="/stock/movimientos" /></Grid>
      </Grid>
    </Stack>
  );
}

function ProduccionCapabilityHome() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Producción</Typography>
      <QuickLinkCard title="Producción" description="Gestión de lotes y tareas de producción." to="/produccion" />
    </Stack>
  );
}

function AdminCapabilityHome() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Administración</Typography>
      <QuickLinkCard title="Administración" description="Usuarios, roles y permisos del sistema." to="/administracion" />
    </Stack>
  );
}

function MinimalHome() {
  return <Alert severity="info">No tenés módulos habilitados todavía. Contactá a un administrador.</Alert>;
}

export function HomeRouterPage() {
  const { hasAny } = useAuth();

  if (hasAny(["ops.orders.create", "ops.orders.list"])) return <LocalCapabilityHome />;
  if (hasAny(["ops.stock_movements.create", "ops.stock_levels.list"])) return <DepositoCapabilityHome />;
  if (hasAny(["ops.production.lots.list", "ops.production.lots.create"])) return <ProduccionCapabilityHome />;
  if (hasAny(["admin.users.list", "admin.rbac.roles.list"])) return <AdminCapabilityHome />;

  return <MinimalHome />;
}
