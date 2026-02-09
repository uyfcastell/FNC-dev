import { Alert, Grid, Stack, Typography } from "@mui/material";

import { isModuleEnabled } from "../core/uiAccessCatalog";
import { useAuth } from "../lib/auth";
import { QuickLinkCard } from "../shell/QuickLinkCard";

function LocalHome() {
  const { user } = useAuth();
  const perms = user?.hasPermissionKeysV2 ? user.permissionKeysV2 : user?.legacyPermissions ?? [];

  const cards = [
    {
      key: "order-entry",
      title: "Ingreso de pedidos",
      description: "Carga rápida de pedidos para locales.",
      to: "/pedidos/ingreso",
      enabled: isModuleEnabled(perms, "orders"),
    },
    {
      key: "my-orders",
      title: "Mis pedidos",
      description: "Seguimiento del estado de tus pedidos.",
      to: "/pedidos?mine=true",
      enabled: isModuleEnabled(perms, "orders"),
    },
  ].filter((card) => card.enabled);

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
  const { user } = useAuth();
  const perms = user?.hasPermissionKeysV2 ? user.permissionKeysV2 : user?.legacyPermissions ?? [];

  const cards = [
    { key: "stock", title: "Stock", description: "Ver stock actual y niveles.", to: "/stock", enabled: isModuleEnabled(perms, "stock") },
    {
      key: "movimientos",
      title: "Movimientos",
      description: "Registrar y consultar movimientos.",
      to: "/stock/movimientos",
      enabled: isModuleEnabled(perms, "stock"),
    },
    {
      key: "inventarios",
      title: "Inventarios físicos",
      description: "Gestionar conteos y cierres de inventario.",
      to: "/stock/inventarios",
      enabled: isModuleEnabled(perms, "inventories"),
    },
  ].filter((card) => card.enabled);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Depósito</Typography>
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

function PlantaHome() {
  const { user } = useAuth();
  const perms = user?.hasPermissionKeysV2 ? user.permissionKeysV2 : user?.legacyPermissions ?? [];
  const cards = [
    { key: "produccion", title: "Producción", description: "Gestión de lotes y tareas de planta.", to: "/produccion", enabled: isModuleEnabled(perms, "production") },
    { key: "envios", title: "Envíos", description: "Preparación y control de envíos.", to: "/envios", enabled: isModuleEnabled(perms, "shipments") },
  ].filter((card) => card.enabled);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Portal de Planta</Typography>
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

function AdminHome() {
  const { user } = useAuth();
  const perms = user?.hasPermissionKeysV2 ? user.permissionKeysV2 : user?.legacyPermissions ?? [];

  const cards = [
    { key: "produccion", title: "Producción", description: "Planificación y ejecución de producción.", to: "/produccion", module: "production" as const },
    { key: "stock", title: "Stock", description: "Niveles de stock e inventario operativo.", to: "/stock", module: "stock" as const },
    { key: "pedidos", title: "Pedidos", description: "Gestión y seguimiento de pedidos.", to: "/pedidos", module: "orders" as const },
    { key: "envios", title: "Envíos", description: "Preparación y control de envíos.", to: "/envios", module: "shipments" as const },
    { key: "remitos", title: "Remitos", description: "Emisión y consulta de remitos.", to: "/remitos", module: "shipments" as const },
    { key: "compras", title: "Compras", description: "Recepción y control de compras.", to: "/compras", module: "purchases" as const },
    { key: "mermas", title: "Mermas", description: "Registro y análisis de mermas.", to: "/mermas", module: "waste" as const },
    { key: "reportes", title: "Reportes", description: "Indicadores y reportes operativos.", to: "/reportes", module: "reports" as const },
    { key: "administracion", title: "Administración", description: "Usuarios, roles y permisos del sistema.", to: "/administracion", module: "admin" as const },
  ].filter((card) => isModuleEnabled(perms, card.module));

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
  const { user, isSuperuser } = useAuth();
  const perms = user?.hasPermissionKeysV2 ? user.permissionKeysV2 : user?.legacyPermissions ?? [];

  if (isSuperuser) return <AdminHome />;
  if (isModuleEnabled(perms, "orders")) return <LocalHome />;
  if (isModuleEnabled(perms, "stock") || isModuleEnabled(perms, "inventories")) return <DepositoHome />;
  if (isModuleEnabled(perms, "production") || isModuleEnabled(perms, "shipments")) return <PlantaHome />;

  return <MinimalHome />;
}
