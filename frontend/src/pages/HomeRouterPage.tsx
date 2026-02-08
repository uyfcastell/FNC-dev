import { Alert, Grid, Stack, Typography } from "@mui/material";

import { useAuth } from "../lib/auth";
import { PERM_SETS, ROUTE_PERMISSION_RULES } from "../lib/permissions";
import { QuickLinkCard } from "../shell/QuickLinkCard";

function LocalHome() {
  const { hasAny } = useAuth();

  const cards = [
    {
      key: "order-entry",
      title: "Ingreso de pedidos",
      description: "Carga rápida de pedidos para locales.",
      to: "/pedidos/ingreso",
      requiredAnyPerms: ROUTE_PERMISSION_RULES["/pedidos/ingreso"] ?? [],
    },
    {
      key: "my-orders",
      title: "Mis pedidos",
      description: "Seguimiento del estado de tus pedidos.",
      to: "/pedidos?mine=true",
      requiredAnyPerms: ROUTE_PERMISSION_RULES["/pedidos"] ?? [],
    },
  ].filter((card) => hasAny(card.requiredAnyPerms));

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Locales</Typography>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.key} item xs={12} md={6}>
            <QuickLinkCard title={card.title} description={card.description} to={card.to} />
          </Grid>
        ))}
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

  if (isSuperuser) return <AdminHome />;
  if (hasAny(PERM_SETS.homeLocalPortal)) return <LocalHome />;
  if (hasAny(PERM_SETS.homeDepositoPortal)) return <DepositoHome />;
  if (hasAny(PERM_SETS.homePlantaPortal)) return <PlantaHome />;

  return <MinimalHome />;
}
