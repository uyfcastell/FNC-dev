import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import {
  addOrdersToShipment,
  confirmShipment,
  createShipment,
  fetchDeposits,
  fetchOrders,
  fetchShipments,
  updateShipmentItems,
  Deposit,
  Order,
  Shipment,
} from "../lib/api";

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-AR");

export function ShipmentsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [createdShipment, setCreatedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadCatalog();
    void loadShipments();
  }, []);

  useEffect(() => {
    if (selectedDepositId) {
      setSelectedOrderIds(new Set());
      setQuantities({});
      void loadOrders(Number(selectedDepositId));
    } else {
      setOrders([]);
      setSelectedOrderIds(new Set());
      setQuantities({});
    }
  }, [selectedDepositId]);

  const loadCatalog = async () => {
    try {
      const depositList = await fetchDeposits();
      setDeposits(depositList.filter((deposit) => deposit.is_store));
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los locales.");
    }
  };

  const loadOrders = async (depositId: number) => {
    try {
      const orderList = await fetchOrders({ destination_deposit_id: depositId });
      setOrders(orderList.filter((order) => ["submitted", "partially_dispatched"].includes(order.status)));
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los pedidos.");
    }
  };

  const loadShipments = async () => {
    try {
      const shipmentList = await fetchShipments();
      setShipments(shipmentList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los envíos.");
    }
  };

  const selectedOrders = useMemo(() => orders.filter((order) => selectedOrderIds.has(order.id)), [orders, selectedOrderIds]);

  const orderItems = useMemo(() => {
    return selectedOrders.flatMap((order) =>
      order.items
        .map((item) => ({
          order,
          item,
          pending: item.pending_quantity ?? Math.max((item.quantity ?? 0) - (item.dispatched_quantity ?? 0), 0),
        }))
        .filter(({ pending }) => pending > 0),
    );
  }, [selectedOrders]);

  const toggleOrder = (orderId: number) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  useEffect(() => {
    setQuantities((prev) => {
      const next = { ...prev };
      const allowedIds = new Set(orderItems.map(({ item }) => item.id ?? 0));
      Object.keys(next).forEach((key) => {
        if (!allowedIds.has(Number(key))) {
          delete next[Number(key)];
        }
      });
      orderItems.forEach(({ item, pending }) => {
        if (item.id && next[item.id] === undefined) {
          next[item.id] = pending;
        }
      });
      return next;
    });
  }, [orderItems]);

  const updateQuantity = (orderItemId: number, value: number, pending: number) => {
    const safeValue = Math.max(0, Math.min(value, pending));
    setQuantities((prev) => ({ ...prev, [orderItemId]: safeValue }));
  };

  const resetForm = () => {
    setSelectedOrderIds(new Set());
    setQuantities({});
    setEstimatedDeliveryDate("");
    setCreatedShipment(null);
  };

  const handleCreateShipment = async () => {
    if (!selectedDepositId) {
      setError("Selecciona un local para el envío.");
      return;
    }
    if (!selectedOrders.length) {
      setError("Selecciona al menos un pedido.");
      return;
    }
    if (!orderItems.length) {
      setError("Los pedidos seleccionados no tienen cantidades pendientes para despachar.");
      return;
    }
    if (!estimatedDeliveryDate) {
      setError("Ingresa la fecha estimada de entrega.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const shipment = await createShipment({
        deposit_id: Number(selectedDepositId),
        estimated_delivery_date: estimatedDeliveryDate,
      });
      await addOrdersToShipment(shipment.id, selectedOrders.map((order) => order.id));
      const updates = orderItems
        .filter(({ item }) => item.id)
        .map(({ item }) => ({
          order_item_id: item.id as number,
          quantity: quantities[item.id as number] ?? 0,
        }));
      const updatedShipment = updates.length ? await updateShipmentItems(shipment.id, updates) : shipment;
      const refreshedShipments = await fetchShipments();
      setShipments(refreshedShipments);
      setCreatedShipment(updatedShipment);
      setSuccess("Envío creado en borrador.");
      void loadOrders(Number(selectedDepositId));
    } catch (err) {
      console.error(err);
      setError("No pudimos crear el envío.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShipment = async () => {
    if (!createdShipment) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await confirmShipment(createdShipment.id);
      setSuccess("Envío confirmado. Remitos generados y stock actualizado.");
      await loadShipments();
      resetForm();
    } catch (err) {
      console.error(err);
      setError("No pudimos confirmar el envío.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700} display="flex" alignItems="center" gap={1}>
        <LocalShippingIcon color="primary" /> Envíos de planta
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardHeader title="Crear envío" subheader="Selecciona local, pedidos y cantidades a despachar" />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardHeader title="Paso 1 — Local" />
                <Divider />
                <CardContent>
                  <TextField
                    select
                    fullWidth
                    label="Local"
                    value={selectedDepositId}
                    onChange={(e) => setSelectedDepositId(e.target.value)}
                  >
                    <MenuItem value="">Seleccionar...</MenuItem>
                    {deposits.map((deposit) => (
                      <MenuItem key={deposit.id} value={deposit.id}>
                        {deposit.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Card variant="outlined">
                <CardHeader title="Paso 2 — Pedidos" />
                <Divider />
                <CardContent>
                  <Stack spacing={1}>
                    {selectedDepositId && orders.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No hay pedidos enviados o parcialmente despachados para este local.
                      </Typography>
                    )}
                    {orders.map((order) => (
                      <Box key={order.id} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedOrderIds.has(order.id)}
                              onChange={() => toggleOrder(order.id)}
                            />
                          }
                          label={
                            <Stack spacing={0.5}>
                              <Typography fontWeight={600}>Pedido #{order.id}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Fecha: {formatDate(order.created_at)} · Estado: {order.status}
                                {order.required_delivery_date ? ` · Req. entrega: ${formatDate(order.required_delivery_date)}` : ""}
                              </Typography>
                            </Stack>
                          }
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="Paso 3 — Cantidades a despachar" />
                <Divider />
                <CardContent>
                  {orderItems.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Selecciona pedidos para definir cantidades.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {orderItems.map(({ order, item, pending }) => (
                        <Box
                          key={`${order.id}-${item.id}`}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            border: "1px solid #e0e0e0",
                            borderRadius: 2,
                            p: 1,
                          }}
                        >
                          <Typography fontWeight={600}>
                            Pedido #{order.id} · {item.sku_name ?? `SKU ${item.sku_id}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Pedida: {item.quantity} · Despachada: {item.dispatched_quantity ?? 0} · Pendiente: {pending}
                          </Typography>
                          <TextField
                            label="Cantidad a despachar"
                            type="number"
                            size="small"
                            value={quantities[item.id ?? 0] ?? 0}
                            inputProps={{ min: 0, max: pending, step: 1 }}
                            onChange={(e) => updateQuantity(item.id ?? 0, Number(e.target.value), pending)}
                            sx={{ mt: 1, maxWidth: 200 }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Paso 4 — Fecha estimada" />
                <Divider />
                <CardContent>
                  <TextField
                    type="date"
                    label="Fecha estimada de entrega"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Paso 5 — Crear" />
                <Divider />
                <CardContent>
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<LocalShippingIcon />}
                      onClick={handleCreateShipment}
                      disabled={loading}
                    >
                      {loading ? "Procesando..." : "Crear envío"}
                    </Button>
                    {createdShipment && (
                      <Button
                        variant="outlined"
                        onClick={handleConfirmShipment}
                        disabled={loading}
                      >
                        Confirmar envío
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={`Envíos existentes (${shipments.length})`}
          action={
            <IconButton onClick={loadShipments}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <Divider />
        <CardContent>
          {shipments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aún no hay envíos registrados.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {shipments.map((shipment) => (
                <Box
                  key={shipment.id}
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 2,
                    p: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography fontWeight={600}>Envío #{shipment.id}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Local: {shipment.deposit_name ?? shipment.deposit_id} · Estado: {shipment.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fecha estimada: {formatDate(shipment.estimated_delivery_date)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
