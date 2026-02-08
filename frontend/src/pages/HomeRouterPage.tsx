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
  const cards = [
    { key: "produccion", title: "Producción", description: "Planificación y ejecución de producción.", to: "/produccion" },
    { key: "stock", title: "Stock", description: "Niveles de stock e inventario operativo.", to: "/stock" },
    { key: "pedidos", title: "Pedidos", description: "Gestión y seguimiento de pedidos.", to: "/pedidos" },
    { key: "envios", title: "Envíos", description: "Preparación y control de envíos.", to: "/envios" },
    { key: "remitos", title: "Remitos", description: "Emisión y consulta de remitos.", to: "/remitos" },
    { key: "compras", title: "Compras", description: "Recepción y control de compras.", to: "/compras" },
    { key: "mermas", title: "Mermas", description: "Registro y análisis de mermas.", to: "/mermas" },
    { key: "reportes", title: "Reportes", description: "Indicadores y reportes operativos.", to: "/reportes" },
    { key: "administracion", title: "Administración", description: "Usuarios, roles y permisos del sistema.", to: "/administracion" },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Administración</Typography>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.key} item xs={12} md={4}>
            <QuickLinkCard title={card.title} description={card.description} to={card.to} />
          </Grid>
        ))}
      </Grid>
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
