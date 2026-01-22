import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  ChipProps,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createOrder,
  fetchDeposits,
  fetchOrders,
  fetchSkus,
  Order,
  OrderItem,
  OrderStatus,
  Deposit,
  SKU,
  Remito,
  RemitoStatus,
  fetchRemitos,
  createRemitoFromOrder,
  dispatchRemito,
  receiveRemito,
  cancelRemito,
  updateOrder,
  updateOrderStatus,
} from "../lib/api";
import { ORDER_SECTIONS, OrderSectionKey, sectionForSku } from "../lib/orderSections";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  approved: "Aprobado",
  prepared: "Preparación",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

const REMITO_STATUS_LABELS: Record<RemitoStatus, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  delivered: "Entregado",
  dispatched: "Despachado",
  received: "Recibido",
  cancelled: "Cancelado",
};

type OrderLine = { sku_id: string; quantity: string; current_stock: string };

const initialLine: OrderLine = { sku_id: "", quantity: "", current_stock: "" };

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingRemitos, setLoadingRemitos] = useState(false);
  const [remitoActionId, setRemitoActionId] = useState<number | null>(null);
  const [creatingFromOrderId, setCreatingFromOrderId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [header, setHeader] = useState<{
    destination_deposit_id: string;
    notes: string;
    requested_by: string;
    required_delivery_date: string;
    plant_internal_note: string;
  }>({
    destination_deposit_id: "",
    notes: "",
    requested_by: "",
    required_delivery_date: "",
    plant_internal_note: "",
  });
  const [lines, setLines] = useState<Record<OrderSectionKey, OrderLine[]>>({
    pt: [initialLine],
    consumibles: [initialLine],
    papeleria: [initialLine],
    limpieza: [initialLine],
  });

  useEffect(() => {
    void loadData();
  }, []);

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);
  const storeDeposits = useMemo(() => deposits.filter((d) => d.is_store), [deposits]);
  const today = useMemo(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return current;
  }, []);
  const maxDeliveryDate = useMemo(() => {
    const max = new Date(today);
    max.setDate(max.getDate() + 60);
    return max;
  }, [today]);
  const minDeliveryDateValue = today.toISOString().split("T")[0];
  const maxDeliveryDateValue = maxDeliveryDate.toISOString().split("T")[0];

  const remitoChipColor = (status: RemitoStatus): ChipProps["color"] => {
    if (status === "received" || status === "delivered") return "success";
    if (status === "dispatched" || status === "sent") return "info";
    if (status === "cancelled") return "error";
    return "default";
  };

  const loadData = async () => {
    try {
      setLoadingRemitos(true);
      const [orderList, remitoList, skuList, depositList] = await Promise.all([
        fetchOrders(),
        fetchRemitos(),
        fetchSkus({ include_inactive: true }),
        fetchDeposits(),
      ]);
      setOrders(orderList);
      setRemitos(remitoList);
      setSkus(skuList);
      setDeposits(depositList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos obtener pedidos, remitos, productos o locales");
    } finally {
      setLoadingRemitos(false);
    }
  };

  const loadRemitosOnly = async () => {
    try {
      setLoadingRemitos(true);
      const remitoList = await fetchRemitos();
      setRemitos(remitoList);
    } catch (err) {
      console.error(err);
      setError("No pudimos obtener los remitos");
    } finally {
      setLoadingRemitos(false);
    }
  };

  const skuLabel = (id: number) => {
    const sku = skus.find((s) => s.id === id);
    if (!sku) return `SKU ${id}`;
    return `${sku.name} (${sku.code})${!sku.is_active ? " (inactivo)" : ""}`;
  };

  const optionsForSection = (section: OrderSectionKey) => {
    const base = sortedSkus.filter((sku) => ORDER_SECTIONS.find((s) => s.key === section)?.filter(sku));
    const selectedIds = new Set(lines[section].map((l) => Number(l.sku_id)).filter(Boolean));
    const selectedSkus = sortedSkus.filter((sku) => selectedIds.has(sku.id));
    return [...base, ...selectedSkus.filter((sku) => !base.find((b) => b.id === sku.id))];
  };

  const handleLineChange = (section: OrderSectionKey, index: number, field: keyof OrderLine, value: string) => {
    setLines((prev) => {
      const next = { ...prev } as Record<OrderSectionKey, OrderLine[]>;
      const updated = [...next[section]];
      updated[index] = { ...updated[index], [field]: value };
      next[section] = updated;
      return next;
    });
  };

  const addLine = (section: OrderSectionKey) => setLines((prev) => ({ ...prev, [section]: [...prev[section], { ...initialLine }] }));
  const removeLine = (section: OrderSectionKey, index: number) => setLines((prev) => ({ ...prev, [section]: prev[section].filter((_, idx) => idx !== index) }));

  const buildItemsPayload = () => {
    const all = Object.values(lines).flat();
    return all
      .filter((line) => line.sku_id && Number(line.quantity) > 0)
      .map((line) => ({
        sku_id: Number(line.sku_id),
        quantity: Number(line.quantity),
        current_stock: line.current_stock === "" ? undefined : Number(line.current_stock),
      })) as OrderItem[];
  };

  const resetForm = () => {
    setEditingId(null);
    setHeader({ destination_deposit_id: "", notes: "", requested_by: "", required_delivery_date: "", plant_internal_note: "" });
    setLines({ pt: [initialLine], consumibles: [initialLine], papeleria: [initialLine], limpieza: [initialLine] });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!header.destination_deposit_id) {
      setError("Selecciona un destino (local)");
      return;
    }
    if (!header.requested_by.trim()) {
      setError("Indica quién está ingresando el pedido");
      return;
    }
    if (header.required_delivery_date) {
      const selected = new Date(`${header.required_delivery_date}T00:00:00`);
      if (selected < today || selected > maxDeliveryDate) {
        setError("La fecha requerida debe estar entre hoy y los próximos 60 días");
        return;
      }
    }
    const items = buildItemsPayload();
    if (!items.length) {
      setError("Agrega al menos un ítem en cualquiera de las secciones");
      return;
    }
    if (items.some((item) => !Number.isInteger(item.quantity))) {
      setError("Las cantidades deben ser números enteros");
      return;
    }
    if (items.some((item) => item.current_stock === undefined || item.current_stock === null)) {
      setError("Indica el stock actual en el local para cada ítem");
      return;
    }
    if (items.some((item) => !Number.isInteger(item.current_stock))) {
      setError("El stock actual debe ser un número entero");
      return;
    }
    try {
      const payload = {
        destination_deposit_id: Number(header.destination_deposit_id),
        notes: header.notes || undefined,
        requested_by: header.requested_by.trim() || undefined,
        required_delivery_date: header.required_delivery_date || undefined,
        plant_internal_note: header.plant_internal_note || undefined,
        items,
      };
      if (editingId) {
        await updateOrder(editingId, payload);
        setSuccess("Pedido actualizado");
      } else {
        await createOrder(payload);
        setSuccess("Pedido creado");
      }
      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el pedido");
    }
  };

  const handleCreateRemito = async (orderId: number) => {
    setError(null);
    setSuccess(null);
    setCreatingFromOrderId(orderId);
    try {
      await createRemitoFromOrder(orderId, {});
      setSuccess("Remito creado desde pedido");
      await loadRemitosOnly();
    } catch (err) {
      console.error(err);
      setError("No pudimos crear el remito");
    } finally {
      setCreatingFromOrderId(null);
    }
  };

  const handleDispatchRemito = async (remitoId: number) => {
    setError(null);
    setSuccess(null);
    setRemitoActionId(remitoId);
    try {
      await dispatchRemito(remitoId);
      setSuccess("Remito despachado");
      await loadRemitosOnly();
    } catch (err) {
      console.error(err);
      setError("No pudimos despachar el remito");
    } finally {
      setRemitoActionId(null);
    }
  };

  const handleReceiveRemito = async (remitoId: number) => {
    setError(null);
    setSuccess(null);
    setRemitoActionId(remitoId);
    try {
      await receiveRemito(remitoId);
      setSuccess("Remito recibido");
      await loadRemitosOnly();
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar la recepción");
    } finally {
      setRemitoActionId(null);
    }
  };

  const handleCancelRemito = async (remitoId: number) => {
    setError(null);
    setSuccess(null);
    setRemitoActionId(remitoId);
    try {
      await cancelRemito(remitoId);
      setSuccess("Remito cancelado");
      await loadRemitosOnly();
    } catch (err) {
      console.error(err);
      setError("No pudimos cancelar el remito");
    } finally {
      setRemitoActionId(null);
    }
  };

  const startEdit = (order: Order) => {
    const nextLines: Record<OrderSectionKey, OrderLine[]> = { pt: [], consumibles: [], papeleria: [], limpieza: [] };
    order.items.forEach((item) => {
      const sku = skus.find((s) => s.id === item.sku_id);
      const section = sectionForSku(sku);
      nextLines[section].push({
        sku_id: String(item.sku_id),
        quantity: String(item.quantity),
        current_stock: item.current_stock != null ? String(item.current_stock) : "",
      });
    });
    const filledLines: Record<OrderSectionKey, OrderLine[]> = {
      pt: nextLines.pt.length ? nextLines.pt : [initialLine],
      consumibles: nextLines.consumibles.length ? nextLines.consumibles : [initialLine],
      papeleria: nextLines.papeleria.length ? nextLines.papeleria : [initialLine],
      limpieza: nextLines.limpieza.length ? nextLines.limpieza : [initialLine],
    };

    setEditingId(order.id);
    setHeader({
      destination_deposit_id: order.destination_deposit_id ? String(order.destination_deposit_id) : "",
      notes: order.notes || "",
      requested_by: order.requested_by || "",
      required_delivery_date: order.required_delivery_date || "",
      plant_internal_note: order.plant_internal_note || "",
    });
    setLines(filledLines);
  };

  const handleStatusChange = async (orderId: number, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      await loadData();
      setSuccess("Estado actualizado");
    } catch (err) {
      console.error(err);
      setError("No pudimos actualizar el estado");
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm("¿Cancelar el pedido?")) return;
    try {
      await updateOrderStatus(orderId, "cancelled");
      await loadData();
      setSuccess("Pedido cancelado");
    } catch (err) {
      console.error(err);
      setError("No pudimos cancelar el pedido");
    }
  };

  const renderSection = (section: (typeof ORDER_SECTIONS)[number]) => {
    const sectionLines = lines[section.key];
    const options = optionsForSection(section.key);

    return (
      <Card variant="outlined">
        <CardHeader title={section.title} />
        <Divider />
        <CardContent>
          <Stack spacing={1.5}>
            {sectionLines.map((item, index) => (
              <Stack key={`${section.key}-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <TextField
                  select
                  label="Producto"
                  value={item.sku_id}
                  onChange={(e) => handleLineChange(section.key, index, "sku_id", e.target.value)}
                  sx={{ flex: 1 }}
                  helperText={!options.length ? "No hay productos activos en la sección" : undefined}
                >
                  {options.map((sku) => (
                    <MenuItem key={sku.id} value={sku.id}>
                      {skuLabel(sku.id)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Cantidad"
                  type="number"
                  inputProps={{ step: 1, min: 1, inputMode: "numeric" }}
                  value={item.quantity}
                  onChange={(e) => handleLineChange(section.key, index, "quantity", e.target.value)}
                  sx={{ width: 160 }}
                />
                <TextField
                  required
                  label="Stock en local"
                  type="number"
                  inputProps={{ step: 1, min: 0, inputMode: "numeric" }}
                  value={item.current_stock}
                  onChange={(e) => handleLineChange(section.key, index, "current_stock", e.target.value)}
                  sx={{ width: 180 }}
                />
                <IconButton
                  aria-label="Eliminar línea"
                  color="error"
                  disabled={sectionLines.length <= 1}
                  onClick={() => removeLine(section.key, index)}
                >
                  <RemoveCircleOutlineIcon />
                </IconButton>
              </Stack>
            ))}
            <Button variant="outlined" startIcon={<PlaylistAddIcon />} onClick={() => addLine(section.key)} disabled={!options.length}>
              Agregar ítem
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalShippingIcon color="primary" /> Pedidos y remitos
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      <Card>
        <CardHeader
          title={editingId ? "Editar pedido" : "Nuevo pedido"}
          subheader="Destinos solo locales definidos"
          action={
            <IconButton onClick={loadData}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                required
                fullWidth
                label="Destino (local)"
                value={header.destination_deposit_id}
                onChange={(e) => setHeader((prev) => ({ ...prev, destination_deposit_id: e.target.value }))}
                helperText={!storeDeposits.length ? "Marca los locales como 'Es local' en Maestros > Depósitos" : undefined}
              >
                {storeDeposits.map((deposit) => (
                  <MenuItem key={deposit.id} value={deposit.id}>
                    {deposit.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Ingresado por"
                value={header.requested_by}
                onChange={(e) => setHeader((prev) => ({ ...prev, requested_by: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha requerida de entrega"
                value={header.required_delivery_date}
                onChange={(e) => setHeader((prev) => ({ ...prev, required_delivery_date: e.target.value }))}
                inputProps={{ min: minDeliveryDateValue, max: maxDeliveryDateValue }}
                helperText="Opcional. Debe estar entre hoy y los próximos 60 días."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notas"
                value={header.notes}
                onChange={(e) => setHeader((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nota interna de planta"
                value={header.plant_internal_note}
                onChange={(e) => setHeader((prev) => ({ ...prev, plant_internal_note: e.target.value }))}
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={2}>
            {ORDER_SECTIONS.map((section) => (
              <div key={section.key}>{renderSection(section)}</div>
            ))}
          </Stack>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleSubmit}>
              {editingId ? "Actualizar" : "Crear"} pedido
            </Button>
            {editingId && (
              <Button sx={{ ml: 1 }} onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={`Bandeja de pedidos (${orders.length})`} subheader="Gestión rápida" />
        <Divider />
        <CardContent>
          <Stack spacing={1}>
            {orders.map((order) => {
              const isCancelled = order.status === "cancelled";
              return (
                <Card key={order.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
                      <Box>
                        <Typography fontWeight={700}>Pedido #{order.id}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Destino: {order.destination} · Creado: {new Date(order.created_at).toLocaleDateString()}
                          {order.requested_by ? ` · Ingresado por: ${order.requested_by}` : ""}
                          {order.required_delivery_date ? ` · Req. entrega: ${new Date(order.required_delivery_date).toLocaleDateString()}` : ""}
                        </Typography>
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          {order.items.map((item) => (
                            <Typography key={item.id} variant="body2">
                              {skuLabel(item.sku_id)} — {item.quantity}
                              {item.current_stock != null && ` (stock: ${item.current_stock})`}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          variant="outlined"
                          startIcon={<LocalShippingIcon />}
                          onClick={() => handleCreateRemito(order.id)}
                          disabled={creatingFromOrderId === order.id || isCancelled}
                        >
                          {creatingFromOrderId === order.id ? "Generando..." : "Generar remito"}
                        </Button>
                        <TextField
                          select
                          size="small"
                          label="Estado"
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          disabled={isCancelled}
                        >
                          {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
                            <MenuItem key={status} value={status}>
                              {label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Button variant="outlined" onClick={() => startEdit(order)} disabled={isCancelled || order.status !== "draft"}>
                          Editar
                        </Button>
                        <Button color="error" onClick={() => handleCancelOrder(order.id)} disabled={isCancelled}>
                          Cancelar
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={`Remitos (${remitos.length})`}
          subheader="Despacho y recepción"
          action={
            <IconButton onClick={loadRemitosOnly} disabled={loadingRemitos}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <Divider />
        <CardContent>
          {loadingRemitos ? (
            <Typography variant="body2">Actualizando remitos...</Typography>
          ) : remitos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aún no hay remitos generados. Crea uno desde la bandeja de pedidos.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {remitos.map((remito) => (
                <Card key={remito.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={700}>Remito #{remito.id}</Typography>
                          <Chip label={REMITO_STATUS_LABELS[remito.status]} size="small" color={remitoChipColor(remito.status)} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Pedido #{remito.order_id} · Origen: {remito.source_deposit_name ?? "-"} · Destino:{" "}
                          {remito.destination_deposit_name ?? remito.destination}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Emitido: {new Date(remito.issue_date).toLocaleDateString()}
                        </Typography>
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          {remito.items.map((item) => (
                            <Typography key={item.id} variant="body2">
                              {skuLabel(item.sku_id)} — {item.quantity}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {remito.status === "pending" && (
                          <>
                            <Button
                              variant="outlined"
                              startIcon={<LocalShippingIcon />}
                              onClick={() => handleDispatchRemito(remito.id)}
                              disabled={remitoActionId === remito.id}
                            >
                              {remitoActionId === remito.id ? "Procesando..." : "Despachar"}
                            </Button>
                            <Button
                              color="error"
                              startIcon={<RemoveCircleOutlineIcon />}
                              onClick={() => handleCancelRemito(remito.id)}
                              disabled={remitoActionId === remito.id}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {["dispatched", "sent"].includes(remito.status) && (
                          <Button
                            variant="contained"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={() => handleReceiveRemito(remito.id)}
                            disabled={remitoActionId === remito.id}
                          >
                            {remitoActionId === remito.id ? "Procesando..." : "Recibir"}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
