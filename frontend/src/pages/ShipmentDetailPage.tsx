import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { fetchShipment, OrderStatus, Shipment } from "../lib/api";

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString("es-AR") : "-");

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  prepared: "Preparado",
  partially_prepared: "Preparado parcial",
  partially_dispatched: "Parcialmente despachado",
  dispatched: "Despachado",
  cancelled: "Cancelado",
};

export function ShipmentDetailPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = Number(shipmentId);
    if (!shipmentId || Number.isNaN(id)) {
      setError("No pudimos identificar el envío solicitado.");
      return;
    }
    const loadShipment = async () => {
      setLoading(true);
      try {
        const data = await fetchShipment(id);
        setShipment(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("No pudimos cargar el detalle del envío.");
      } finally {
        setLoading(false);
      }
    };
    void loadShipment();
  }, [shipmentId]);

  return (
    <Stack spacing={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={700}>
          Detalle de envío
        </Typography>
        <Button component={RouterLink} to="/envios" startIcon={<ArrowBackIcon />} variant="outlined">
          Volver a envíos
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardHeader title={`Envío #${shipment?.id ?? "-"}`} />
        <Divider />
        <CardContent>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Cargando información del envío...
            </Typography>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Datos del envío
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Estado: {shipment?.status ?? "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Depósito: {shipment?.deposit_name ?? shipment?.deposit_id ?? "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Fecha estimada: {formatDate(shipment?.estimated_delivery_date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Creado: {formatDate(shipment?.created_at)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Actualizado: {formatDate(shipment?.updated_at)}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Pedidos asociados
                </Typography>
                {shipment?.orders && shipment.orders.length > 0 ? (
                  <Stack spacing={0.5}>
                    {shipment.orders.map((order) => (
                      <Typography key={order.id} variant="body2" color="text.secondary">
                        Pedido #{order.id} · {ORDER_STATUS_LABELS[order.status]}
                        {order.required_delivery_date ? ` · Entrega: ${formatDate(order.required_delivery_date)}` : ""}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay pedidos asociados registrados.
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Ítems del envío
                </Typography>
                {shipment?.items && shipment.items.length > 0 ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Pedido</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">Pendiente</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shipment.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>#{item.order_id}</TableCell>
                          <TableCell>{item.sku_code}</TableCell>
                          <TableCell>{item.sku_name}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{item.remaining_quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay ítems disponibles para este envío.
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
