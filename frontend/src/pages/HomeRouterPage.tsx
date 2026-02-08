import { Alert, Grid, Stack, Typography } from "@mui/material";

import { useAuth } from "../lib/auth";
import { QuickLinkCard } from "../shell/QuickLinkCard";

function LocalHome() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Locales</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <QuickLinkCard title="Ingreso de pedidos" description="Carga rápida de pedidos para locales." to="/pedidos/ingreso" />
        </Grid>
        <Grid item xs={12} md={6}>
          <QuickLinkCard title="Mis pedidos" description="Seguimiento del estado de tus pedidos." to="/pedidos?mine=true" />
        </Grid>
      </Grid>
    </Stack>
  );
}

function DepositoHome() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Depósito</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <QuickLinkCard title="Stock" description="Ver stock actual y niveles." to="/stock" />
        </Grid>
        <Grid item xs={12} md={6}>
          <QuickLinkCard title="Movimientos" description="Registrar y consultar movimientos." to="/stock/movimientos" />
        </Grid>
      </Grid>
    </Stack>
  );
}

function PlantaHome() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Planta</Typography>
      <QuickLinkCard title="Producción" description="Gestión de lotes y tareas de planta." to="/produccion" />
    </Stack>
  );
}

function AdminHome() {
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
  const { hasAny, isSuperuser } = useAuth();

  if (hasAny(["ops.orders.create", "orders.create", "ops.orders.list", "orders.view"])) return <LocalHome />;
  if (hasAny(["ops.stock.movements.create", "stock.register", "stock.adjust", "stock.transfer"])) return <DepositoHome />;
  if (hasAny(["ops.production.lots.view", "production.view", "ops.shipments.create", "shipments.create"])) return <PlantaHome />;
  if (isSuperuser) return <AdminHome />;

  return <MinimalHome />;
}
