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
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import {
  addOrdersToShipment,
  cancelShipment,
  confirmShipment,
  createShipment,
  fetchShipment,
  fetchDeposits,
  fetchOrders,
  fetchShipments,
  updateShipmentItems,
  updateShipment,
  Deposit,
  Order,
  Shipment,
  ShipmentStatus,
} from "../lib/api";

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-AR");
const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  dispatched: "Despachado",
};

export function ShipmentsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [editingShipmentId, setEditingShipmentId] = useState<number | null>(null);
  const [prefillShipment, setPrefillShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<ShipmentStatus | "all">("all");
  const [shipmentDepositFilter, setShipmentDepositFilter] = useState("");
  const [shipmentDateFrom, setShipmentDateFrom] = useState("");
  const [shipmentDateTo, setShipmentDateTo] = useState("");
  const [shipmentIdFilter, setShipmentIdFilter] = useState("");

  useEffect(() => {
    void loadCatalog();
    void loadShipments();
  }, []);

  useEffect(() => {
    if (selectedDepositId) {
      const depositId = Number(selectedDepositId);
      setSelectedOrderIds(new Set());
      setQuantities({});
      void loadOrders(depositId).then(() => {
        if (prefillShipment && prefillShipment.deposit_id === depositId) {
          const orderIds = new Set(prefillShipment.items?.map((item) => item.order_id) ?? []);
          const nextQuantities = (prefillShipment.items ?? []).reduce<Record<number, number>>((acc, item) => {
            acc[item.order_item_id] = item.quantity;
            return acc;
          }, {});
          setSelectedOrderIds(orderIds);
          setQuantities(nextQuantities);
          setPrefillShipment(null);
        }
      });
    } else {
      setOrders([]);
      setSelectedOrderIds(new Set());
      setQuantities({});
    }
  }, [selectedDepositId, prefillShipment]);

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

  const handleShipmentDateFromChange = (value: string) => {
    setShipmentDateFrom(value);
    if (shipmentDateTo && value && value > shipmentDateTo) {
      setShipmentDateTo(value);
    }
  };

  const handleShipmentDateToChange = (value: string) => {
    if (shipmentDateFrom && value && value < shipmentDateFrom) {
      setShipmentDateTo(shipmentDateFrom);
      return;
    }
    setShipmentDateTo(value);
  };

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

  const filteredShipments = useMemo(() => {
    const start = shipmentDateFrom ? new Date(`${shipmentDateFrom}T00:00:00`) : null;
    const end = shipmentDateTo ? new Date(`${shipmentDateTo}T23:59:59`) : null;
    const idQuery = shipmentIdFilter.trim();

    return shipments.filter((shipment) => {
      if (shipmentStatusFilter !== "all" && shipment.status !== shipmentStatusFilter) {
        return false;
      }
      if (shipmentDepositFilter && String(shipment.deposit_id) !== shipmentDepositFilter) {
        return false;
      }
      if (idQuery && !String(shipment.id).includes(idQuery)) {
        return false;
      }
      const estimatedDate = new Date(shipment.estimated_delivery_date);
      if (start && estimatedDate < start) {
        return false;
      }
      if (end && estimatedDate > end) {
        return false;
      }
      return true;
    });
  }, [shipments, shipmentStatusFilter, shipmentDepositFilter, shipmentDateFrom, shipmentDateTo, shipmentIdFilter]);

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
    setActiveShipment(null);
    setEditingShipmentId(null);
    setPrefillShipment(null);
    setSelectedDepositId("");
  };

  const handleSaveShipment = async () => {
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
      let shipment: Shipment;
      if (editingShipmentId) {
        shipment = await updateShipment(editingShipmentId, {
          deposit_id: Number(selectedDepositId),
          estimated_delivery_date: estimatedDeliveryDate,
        });
        await addOrdersToShipment(editingShipmentId, selectedOrders.map((order) => order.id));
      } else {
        shipment = await createShipment({
          deposit_id: Number(selectedDepositId),
          estimated_delivery_date: estimatedDeliveryDate,
        });
        await addOrdersToShipment(shipment.id, selectedOrders.map((order) => order.id));
      }
      const updates = orderItems
        .filter(({ item }) => item.id)
        .map(({ item }) => ({
          order_item_id: item.id as number,
          quantity: quantities[item.id as number] ?? 0,
        }));
      const updatedShipment = updates.length ? await updateShipmentItems(shipment.id, updates) : shipment;
      const refreshedShipments = await fetchShipments();
      setShipments(refreshedShipments);
      setActiveShipment(updatedShipment);
      setEditingShipmentId(editingShipmentId ?? null);
      setSuccess(editingShipmentId ? "Envío actualizado en borrador." : "Envío creado en borrador.");
      void loadOrders(Number(selectedDepositId));
    } catch (err) {
      console.error(err);
      setError(editingShipmentId ? "No pudimos actualizar el envío." : "No pudimos crear el envío.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShipment = async (shipmentId?: number) => {
    const id = shipmentId ?? activeShipment?.id;
    if (!id) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await confirmShipment(id);
      setSuccess("Envío confirmado. Remitos generados y stock actualizado.");
      await loadShipments();
      if (activeShipment?.id === id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError("No pudimos confirmar el envío.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShipment = async (shipmentId: number) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await cancelShipment(shipmentId);
      setSuccess(`Envío #${shipmentId} cancelado.`);
      await loadShipments();
      if (activeShipment?.id === shipmentId) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError("No pudimos cancelar el envío.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditShipment = async (shipmentId: number) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const shipment = await fetchShipment(shipmentId);
      setPrefillShipment(shipment);
      setSelectedDepositId(String(shipment.deposit_id));
      setEstimatedDeliveryDate(shipment.estimated_delivery_date);
      setActiveShipment(shipment);
      setEditingShipmentId(shipment.id);
      setSuccess(`Continuando edición del envío #${shipment.id}.`);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar el envío.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    resetForm();
    setSuccess("Edición cancelada.");
  };

  const getShipmentActionState = (status: ShipmentStatus) => {
    const canEdit = status === "draft";
    const canConfirm = status === "draft";
    const canCancel = status !== "dispatched";
    return {
      canEdit,
      canConfirm,
      canCancel,
      editReason: canEdit ? "" : "Solo los envíos en borrador pueden editarse.",
      confirmReason: canConfirm ? "" : "Solo los envíos en borrador pueden confirmarse.",
      cancelReason:
        status === "dispatched"
          ? "Los envíos despachados no se pueden cancelar."
          : "Solo los envíos en borrador o confirmados pueden cancelarse.",
    };
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700} display="flex" alignItems="center" gap={1}>
        <LocalShippingIcon color="primary" /> Envíos de planta
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardHeader
          title={editingShipmentId ? `Editar envío #${editingShipmentId}` : "Crear envío"}
          subheader={
            editingShipmentId
              ? "Actualiza pedidos y cantidades antes de confirmar el envío"
              : "Selecciona local, pedidos y cantidades a despachar"
          }
        />
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
                      onClick={handleSaveShipment}
                      disabled={loading}
                    >
                      {loading
                        ? "Procesando..."
                        : editingShipmentId
                          ? "Guardar cambios"
                          : "Crear envío"}
                    </Button>
                    {activeShipment && (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button variant="outlined" onClick={() => handleConfirmShipment()} disabled={loading}>
                          Confirmar envío
                        </Button>
                        {editingShipmentId && (
                          <Button variant="text" onClick={handleCancelEdit} disabled={loading}>
                            Cancelar edición
                          </Button>
                        )}
                      </Stack>
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
          title={`Envíos existentes (${filteredShipments.length})`}
          action={
            <IconButton onClick={loadShipments}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Estado"
                value={shipmentStatusFilter}
                onChange={(e) => setShipmentStatusFilter(e.target.value as ShipmentStatus | "all")}
              >
                <MenuItem value="all">Todos</MenuItem>
                {Object.entries(SHIPMENT_STATUS_LABELS).map(([status, label]) => (
                  <MenuItem key={status} value={status}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Local destino"
                value={shipmentDepositFilter}
                onChange={(e) => setShipmentDepositFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {deposits.map((deposit) => (
                  <MenuItem key={deposit.id} value={deposit.id}>
                    {deposit.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Fecha estimada desde"
                value={shipmentDateFrom}
                onChange={(e) => handleShipmentDateFromChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Fecha estimada hasta"
                value={shipmentDateTo}
                onChange={(e) => handleShipmentDateToChange(e.target.value)}
                inputProps={{ min: shipmentDateFrom || undefined }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Buscar por ID de envío"
                value={shipmentIdFilter}
                onChange={(e) => setShipmentIdFilter(e.target.value)}
              />
            </Grid>
          </Grid>
          {filteredShipments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aún no hay envíos registrados.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {filteredShipments.map((shipment) => {
                const actionState = getShipmentActionState(shipment.status);
                return (
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
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Tooltip title={actionState.editReason} disableHoverListener={actionState.canEdit}>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleEditShipment(shipment.id)}
                            disabled={!actionState.canEdit || loading}
                          >
                            Editar
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip title={actionState.confirmReason} disableHoverListener={actionState.canConfirm}>
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleConfirmShipment(shipment.id)}
                            disabled={!actionState.canConfirm || loading}
                          >
                            Confirmar
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip title={actionState.cancelReason} disableHoverListener={actionState.canCancel}>
                        <span>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={() => handleCancelShipment(shipment.id)}
                            disabled={!actionState.canCancel || loading}
                          >
                            Cancelar envío
                          </Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
