import { Grid, Stack } from "@mui/material";
import { QuickLinkCard } from "../shell/QuickLinkCard";

export function DashboardPage() {
  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Producción"
            description="Registrar producción, consumos y empaques"
            to="/produccion"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Stock"
            description="Movimientos, inventarios y ajustes de stock"
            to="/stock"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Pedidos"
            description="Gestión y seguimiento de pedidos"
            to="/pedidos"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Reportes"
            description="Alertas, vencimientos y resúmenes clave"
            to="/reportes"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Pedidos"
            description="Ingreso rápido de pedidos de venta"
            to="/pedidos/ingreso"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Envíos"
            description="Planificar despachos y remitos"
            to="/envios"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Compras"
            description="Registro y control de compras"
            to="/compras"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <QuickLinkCard
            title="Maestros"
            description="Parámetros, tipos y configuraciones"
            to="/administracion"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
