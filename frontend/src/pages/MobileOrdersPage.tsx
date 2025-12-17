import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { Card, CardContent, CardHeader, Chip, Divider, Stack, Typography } from "@mui/material";

const mockOrders = [
  { id: "PED-001", customer: "Supermercado Norte", status: "aprobado", eta: "Hoy 15:00", items: 4 },
  { id: "PED-002", customer: "Local Centro", status: "preparando", eta: "Hoy 17:00", items: 2 },
];

const mockRemitos = [
  { id: "REM-101", destination: "Local Tres Cruces", status: "pendiente", eta: "Hoy 16:30" },
  { id: "REM-102", destination: "Mayorista Cordón", status: "enviado", eta: "Mañana 09:00" },
];

export function MobileOrdersPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        Pedidos y remitos
      </Typography>

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader avatar={<ReceiptIcon color="primary" />} title="Pedidos activos" titleTypographyProps={{ sx: { fontSize: 20, fontWeight: 700 } }} />
        <Divider />
        <CardContent>
          <Stack spacing={1.5}>
            {mockOrders.map((order) => (
              <Card key={order.id} variant="outlined" sx={{ bgcolor: "#f9fafb" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{order.id}</Typography>
                    <Chip label={order.status} color={order.status === "aprobado" ? "success" : "warning"} />
                  </Stack>
                  <Typography sx={{ fontSize: 15, mt: 0.5 }}>{order.customer}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <ScheduleIcon fontSize="small" />
                    <Typography variant="body2">ETA: {order.eta}</Typography>
                    <Typography variant="body2">Items: {order.items}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
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
          <Stack spacing={1.5}>
            {mockRemitos.map((remito) => (
              <Card key={remito.id} variant="outlined" sx={{ bgcolor: "#f9fafb" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{remito.id}</Typography>
                    <Chip label={remito.status} color={remito.status === "enviado" ? "info" : "warning"} />
                  </Stack>
                  <Typography sx={{ fontSize: 15, mt: 0.5 }}>{remito.destination}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <ScheduleIcon fontSize="small" />
                    <Typography variant="body2">ETA: {remito.eta}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
