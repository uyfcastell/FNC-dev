import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ScheduleIcon from "@mui/icons-material/Schedule";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import { fetchOrders, Order, OrderStatus } from "../lib/api";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  approved: "Aprobado",
  prepared: "Preparación",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

export function MobileOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const orderList = await fetchOrders();
      setOrders(orderList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los pedidos");
    }
  };

  const itemLabel = (order: Order) => {
    if (!order.items.length) return "Sin ítems";
    const first = order.items[0];
    return `${first.sku_name ?? "SKU"} (${first.sku_code ?? first.sku_id})`;
  };

  const statusColor = (status: OrderStatus) => {
    if (status === "approved") return "success";
    if (status === "prepared") return "warning";
    if (status === "cancelled") return "error";
    return "info";
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        Pedidos y remitos
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader avatar={<ReceiptIcon color="primary" />} title="Pedidos activos" titleTypographyProps={{ sx: { fontSize: 20, fontWeight: 700 } }} />
        <Divider />
        <CardContent>
          <Stack spacing={1.5}>
            {orders.map((order) => (
              <Card key={order.id} variant="outlined" sx={{ bgcolor: "#f9fafb" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Pedido #{order.id}</Typography>
                    <Chip label={ORDER_STATUS_LABELS[order.status]} color={statusColor(order.status)} />
                  </Stack>
                  <Typography sx={{ fontSize: 15, mt: 0.5 }}>{order.destination}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <ScheduleIcon fontSize="small" />
                    <Typography variant="body2">Ítems: {order.items.length}</Typography>
                    <Typography variant="body2">Principal: {itemLabel(order)}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {orders.length === 0 && <Typography variant="body2">Aún no hay pedidos cargados.</Typography>}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader
          avatar={<LocalShippingIcon color="secondary" />}
          title="Remitos"
          subheader="Pendientes y enviados"
          titleTypographyProps={{ sx: { fontSize: 20, fontWeight: 700 } }}
        />
        <Divider />
        <CardContent>
          <Typography variant="body2">Los remitos se generarán desde cada pedido aprobado.</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
