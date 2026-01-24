import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Collapse,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import {
  dispatchShipment,
  fetchShipment,
  fetchShipments,
  OrderStatus,
  Shipment,
  ShipmentItem,
  ShipmentStatus,
} from "../lib/api";

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-AR");

const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  dispatched: "Despachado",
};
const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  prepared: "Preparado",
  partially_prepared: "Preparado parcial",
  partially_dispatched: "Parcialmente despachado",
  dispatched: "Despachado",
  cancelled: "Cancelado",
};

const statusColor = (status: ShipmentStatus) => {
  if (status === "confirmed") return "warning";
  if (status === "dispatched") return "success";
  return "default";
};

export function MobileShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [expandedShipmentId, setExpandedShipmentId] = useState<number | null>(null);
  const [shipmentDetails, setShipmentDetails] = useState<Record<number, Shipment>>({});
  const [detailLoadingIds, setDetailLoadingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const shipmentList = await fetchShipments();
      setShipments(shipmentList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los envíos.");
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = useMemo(
    () => shipments.filter((shipment) => ["confirmed", "dispatched"].includes(shipment.status)),
    [shipments],
  );

  const handleToggleDetails = async (shipmentId: number) => {
    setExpandedShipmentId((prev) => (prev === shipmentId ? null : shipmentId));
    if (expandedShipmentId === shipmentId) {
      return;
    }
    if (shipmentDetails[shipmentId]?.items || shipmentDetails[shipmentId]?.orders) {
      return;
    }
    setDetailLoadingIds((prev) => new Set(prev).add(shipmentId));
    try {
      const details = await fetchShipment(shipmentId);
      setShipmentDetails((prev) => ({ ...prev, [shipmentId]: details }));
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar el detalle del envío.");
    } finally {
      setDetailLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(shipmentId);
        return next;
      });
    }
  };

  const groupItemsByOrder = (items: ShipmentItem[]) =>
    items.reduce<Record<number, ShipmentItem[]>>((acc, item) => {
      if (!acc[item.order_id]) {
        acc[item.order_id] = [];
      }
      acc[item.order_id].push(item);
      return acc;
    }, {});

  const handleDispatchShipment = async (shipmentId: number) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await dispatchShipment(shipmentId);
      setSuccess(`Envío #${shipmentId} despachado.`);
      await loadShipments();
    } catch (err) {
      console.error(err);
      setError("No pudimos despachar el envío.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={700}>
          Envíos
        </Typography>
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} size="small" variant="outlined">
          Inicio
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardHeader title={`Bandeja de envíos (${filteredShipments.length})`} />
        <Divider />
        <CardContent>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Cargando envíos...
            </Typography>
          ) : filteredShipments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay envíos confirmados o despachados.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {filteredShipments.map((shipment) => {
                const details = shipmentDetails[shipment.id] ?? shipment;
                const isExpanded = expandedShipmentId === shipment.id;
                const isDetailLoading = detailLoadingIds.has(shipment.id);
                const detailOrders = details.orders ?? [];
                const detailItems = details.items ?? [];
                const itemsByOrder = groupItemsByOrder(detailItems);
                const fallbackOrderIds = detailOrders.length
                  ? []
                  : Array.from(new Set(detailItems.map((item) => item.order_id)));

                return (
                  <Card key={shipment.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                          <Box>
                            <Typography fontWeight={700}>Envío #{shipment.id}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Destino: {shipment.deposit_name ?? shipment.deposit_id}
                            </Typography>
                          </Box>
                          <Chip label={SHIPMENT_STATUS_LABELS[shipment.status]} color={statusColor(shipment.status)} size="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Fecha estimada: {formatDate(shipment.estimated_delivery_date)}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => void handleToggleDetails(shipment.id)}
                            disabled={isDetailLoading}
                          >
                            {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                          </Button>
                          {shipment.status === "confirmed" && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleDispatchShipment(shipment.id)}
                              disabled={loading}
                            >
                              Despachar
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, border: "1px dashed #e0e0e0", borderRadius: 2, p: 2, bgcolor: "#fafafa" }}>
                          {isDetailLoading ? (
                            <Typography variant="body2" color="text.secondary">
                              Cargando detalle del envío...
                            </Typography>
                          ) : (
                            <Stack spacing={1}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                Datos del envío
                              </Typography>
                              <Typography variant="body2">Estado: {SHIPMENT_STATUS_LABELS[details.status]}</Typography>
                              <Typography variant="body2">
                                Destino: {details.deposit_name ?? details.deposit_id}
                              </Typography>
                              <Typography variant="body2">
                                Fecha estimada: {formatDate(details.estimated_delivery_date)}
                              </Typography>
                              <Typography variant="body2">Creado: {formatDate(details.created_at)}</Typography>
                              <Typography variant="body2">Actualizado: {formatDate(details.updated_at)}</Typography>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="subtitle2" fontWeight={600}>
                                Pedidos incluidos
                              </Typography>
                              {detailOrders.length === 0 && detailItems.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                  No hay pedidos asociados a este envío.
                                </Typography>
                              )}
                              {detailOrders.map((order) => (
                                <Box key={order.id} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    Pedido #{order.id}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Estado: {ORDER_STATUS_LABELS[order.status]} · Destino: {order.destination}
                                    {order.required_delivery_date
                                      ? ` · Req. entrega: ${formatDate(order.required_delivery_date)}`
                                      : ""}
                                  </Typography>
                                  <Stack spacing={0.5} mt={1}>
                                    {(itemsByOrder[order.id] ?? []).map((item) => (
                                      <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                        <Typography variant="body2">
                                          {item.sku_name} ({item.sku_code})
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          Cant.: {item.quantity} · Pendiente: {item.remaining_quantity}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Stack>
                                </Box>
                              ))}
                              {detailOrders.length === 0 &&
                                fallbackOrderIds.map((orderId) => (
                                  <Box key={orderId} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                      Pedido #{orderId}
                                    </Typography>
                                    <Stack spacing={0.5} mt={1}>
                                      {(itemsByOrder[orderId] ?? []).map((item) => (
                                        <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                                          <Typography variant="body2">
                                            {item.sku_name} ({item.sku_code})
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            Cant.: {item.quantity} · Pendiente: {item.remaining_quantity}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Stack>
                                  </Box>
                                ))}
                            </Stack>
                          )}
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
