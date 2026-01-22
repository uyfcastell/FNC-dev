import { Grid, Stack } from "@mui/material";
import { WelcomeCard } from "../shell/WelcomeCard";
import { ApiStatusCard } from "../shell/ApiStatusCard";
import { QuickLinkCard } from "../shell/QuickLinkCard";

export function DashboardPage() {
  return (
    <Stack spacing={3}>
      <ApiStatusCard />
      <WelcomeCard />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Producción"
            description="Registrar consumos de MP/SEMI y empaquetado"
            to="/produccion"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Stock"
            description="Entradas, salidas, ajustes y conteos físicos"
            to="/stock"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Pedidos"
            description="Crear envíos y generar remitos con PDF"
            to="/pedidos"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Reportes"
            description="Totales por depósito y tipo de SKU, movimientos últimos 7 días"
            to="/reportes"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
