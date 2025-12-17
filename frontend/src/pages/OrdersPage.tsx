import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Card, CardContent, CardHeader, Chip, Divider, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";

const orders = [
  { id: "PED-4521", destination: "Local Centro", status: "Aprobado", items: 6 },
  { id: "PED-4520", destination: "Local Prado", status: "Preparación", items: 4 },
  { id: "PED-4518", destination: "Planta", status: "Borrador", items: 3 },
];

export function OrdersPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalShippingIcon color="primary" />
        Pedidos y remitos
      </Typography>
      <Card>
        <CardHeader
          title="Bandeja de pedidos"
          subheader="Estados: Borrador → Enviado → Aprobado → Preparación"
          action={<Chip label="Flujo manual" color="primary" variant="outlined" />}
        />
        <Divider />
        <CardContent>
          <List>
            {orders.map((order) => (
              <ListItem key={order.id} divider>
                <ListItemText
                  primary={`${order.id} · ${order.destination}`}
                  secondary={`${order.items} ítems · Estado: ${order.status}`}
                />
                <Chip
                  label={order.status}
                  color={order.status === "Aprobado" ? "success" : order.status === "Preparación" ? "warning" : "default"}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}
