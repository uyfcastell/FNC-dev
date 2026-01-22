import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptIcon from "@mui/icons-material/Receipt";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import StoreIcon from "@mui/icons-material/Store";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "../components/SearchableSelect";
import {
  createOrder,
  fetchDeposits,
  fetchOrders,
  fetchSkus,
  updateOrder,
  updateOrderStatus,
  Deposit,
  Order,
  OrderStatus,
  SKU,
} from "../lib/api";
import { ORDER_SECTIONS, OrderSectionKey, sectionForSku } from "../lib/orderSections";

type OrderLine = { sku_id: string; quantity: string; current_stock: string };

const STORAGE_KEY = "mobile_orders_deposit_id";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  approved: "En proceso",
  prepared: "Despachado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

const STATUS_FILTERS: Array<{ label: string; value: OrderStatus | "all" }> = [
  { label: "Todos", value: "all" },
  { label: "Borrador", value: "draft" },
  { label: "Enviado", value: "submitted" },
  { label: "En proceso", value: "approved" },
  { label: "Despachado", value: "prepared" },
  { label: "Cancelado", value: "cancelled" },
];

const statusColor = (status: OrderStatus) => {
  if (status === "approved") return "success";
  if (status === "prepared") return "warning";
  if (status === "cancelled") return "error";
  return "info";
};

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("es-AR");

const emptyLine: OrderLine = { sku_id: "", quantity: "", current_stock: "" };

export function MobileOrdersPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Record<OrderSectionKey, OrderLine[]>>({
    pt: [emptyLine],
    consumibles: [emptyLine],
    papeleria: [emptyLine],
    limpieza: [emptyLine],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      setSelectedDepositId(Number(storedId));
    }
  }, []);

  useEffect(() => {
    if (selectedDepositId) {
      void loadOrders(selectedDepositId);
    } else {
      setOrders([]);
    }
  }, [selectedDepositId]);

  const loadCatalog = async () => {
    try {
      const [depositList, skuList] = await Promise.all([fetchDeposits(), fetchSkus({ include_inactive: true })]);
      setDeposits(depositList.filter((deposit) => deposit.is_store));
      setSkus(skuList.filter((sku) => !["MP", "SEMI"].includes(sku.sku_type_code)));
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar locales o productos.");
    }
  };

  const loadOrders = async (depositId: number) => {
    try {
      const orderList = await fetchOrders({ destination_deposit_id: depositId });
      setOrders(orderList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los pedidos");
    }
  };

  const depositOptions = useMemo(
    () =>
      [...deposits].sort((a, b) => a.name.localeCompare(b.name)).map((deposit) => ({
        value: deposit.id,
        label: deposit.name,
        description: deposit.location || undefined,
      })),
    [deposits],
  );

  const skuOptions = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);
  const optionsForSection = (section: OrderSectionKey) => {
    const base = skuOptions.filter((sku) => ORDER_SECTIONS.find((s) => s.key === section)?.filter(sku));
    const selectedIds = new Set(lines[section].map((line) => Number(line.sku_id)).filter(Boolean));
    const selectedSkus = skuOptions.filter((sku) => selectedIds.has(sku.id));
    return [...base, ...selectedSkus.filter((sku) => !base.find((candidate) => candidate.id === sku.id))];
  };

  const selectedDeposit = deposits.find((deposit) => deposit.id === selectedDepositId) || null;

  const filteredOrders = useMemo(() => {
    const base = statusFilter === "all" ? orders : orders.filter((order) => order.status === statusFilter);
    return statusFilter === "all" ? base.slice(0, 3) : base;
  }, [orders, statusFilter]);

  const totalUnits = (order: Order) => order.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

  const resetEditor = () => {
    setEditingOrderId(null);
    setActiveOrder(null);
    setRequestedBy("");
    setNotes("");
    setLines({ pt: [emptyLine], consumibles: [emptyLine], papeleria: [emptyLine], limpieza: [emptyLine] });
  };

  const startNewOrder = () => {
    resetEditor();
    setEditingOrderId(0);
  };

  const startEditOrder = (order: Order) => {
    const nextLines: Record<OrderSectionKey, OrderLine[]> = { pt: [], consumibles: [], papeleria: [], limpieza: [] };
    order.items.forEach((item) => {
      const sku = skus.find((candidate) => candidate.id === item.sku_id);
      const section = sectionForSku(sku);
      nextLines[section].push({
        sku_id: String(item.sku_id),
        quantity: String(item.quantity),
        current_stock: item.current_stock != null ? String(item.current_stock) : "",
      });
    });
    const filledLines: Record<OrderSectionKey, OrderLine[]> = {
      pt: nextLines.pt.length ? nextLines.pt : [emptyLine],
      consumibles: nextLines.consumibles.length ? nextLines.consumibles : [emptyLine],
      papeleria: nextLines.papeleria.length ? nextLines.papeleria : [emptyLine],
      limpieza: nextLines.limpieza.length ? nextLines.limpieza : [emptyLine],
    };
    setEditingOrderId(order.id);
    setActiveOrder(order);
    setRequestedBy(order.requested_by ?? "");
    setNotes(order.notes ?? "");
    setLines(filledLines);
  };

  const handleLineChange = (section: OrderSectionKey, index: number, field: keyof OrderLine, value: string) => {
    setLines((prev) => {
      const next = { ...prev };
      const updated = [...next[section]];
      updated[index] = { ...updated[index], [field]: value };
      next[section] = updated;
      return next;
    });
  };

  const addLine = (section: OrderSectionKey) => setLines((prev) => ({ ...prev, [section]: [...prev[section], emptyLine] }));

  const removeLine = (section: OrderSectionKey, index: number) =>
    setLines((prev) => ({ ...prev, [section]: prev[section].filter((_, idx) => idx !== index) }));

  const buildItemsPayload = () =>
    Object.values(lines)
      .flat()
      .filter((line) => line.sku_id && line.quantity)
      .map((line) => ({
        sku_id: Number(line.sku_id),
        quantity: Number(line.quantity),
        current_stock: line.current_stock === "" ? undefined : Number(line.current_stock),
      }))
      .filter((line) => line.quantity > 0);

  const validateLines = (items: { sku_id: number; quantity: number; current_stock?: number }[]) => {
    if (!items.length) {
      setError("Agrega al menos un ítem con cantidad.");
      return false;
    }
    if (items.some((item) => !Number.isInteger(item.quantity))) {
      setError("Las cantidades deben ser números enteros.");
      return false;
    }
    if (items.some((item) => item.current_stock === undefined || item.current_stock === null)) {
      setError("Indica el stock actual en el local para cada ítem.");
      return false;
    }
    if (items.some((item) => !Number.isInteger(item.current_stock))) {
      setError("El stock actual debe ser un número entero.");
      return false;
    }
    return true;
  };

  const persistDraft = async (): Promise<number | null> => {
    if (!selectedDepositId) {
      setError("Selecciona un local antes de guardar.");
      return null;
    }
    if (!requestedBy.trim()) {
      setError("Indica quién ingresa el pedido.");
      return null;
    }
    const items = buildItemsPayload();
    if (!validateLines(items)) return null;
    try {
      if (editingOrderId && editingOrderId > 0) {
        await updateOrder(editingOrderId, {
          destination_deposit_id: selectedDepositId,
          requested_by: requestedBy.trim(),
          notes: notes.trim() || null,
          items,
        });
        return editingOrderId;
      } else {
        const created = await createOrder({
          destination_deposit_id: selectedDepositId,
          requested_by: requestedBy.trim(),
          notes: notes.trim() || null,
          status: "draft",
          items,
        });
        return created.id;
      }
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el pedido.");
      return null;
    }
  };

  const saveDraft = async () => {
    const orderId = await persistDraft();
    if (!orderId || !selectedDepositId) return;
    try {
      await loadOrders(selectedDepositId);
      setSuccess(editingOrderId && editingOrderId > 0 ? "Borrador actualizado." : "Borrador guardado.");
      resetEditor();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el pedido.");
    }
  };

  const sendOrder = async () => {
    if (!window.confirm("¿Enviar el pedido a planta?")) return;
    if (!selectedDepositId) return;
    const orderId = await persistDraft();
    if (!orderId) return;
    try {
      await updateOrderStatus(orderId, "submitted");
      setSuccess("Pedido enviado.");
      await loadOrders(selectedDepositId);
      resetEditor();
    } catch (err) {
      console.error(err);
      setError("No pudimos enviar el pedido.");
    }
  };

  const cancelOrder = async (orderId: number) => {
    if (!window.confirm("¿Cancelar el pedido?")) return;
    if (!selectedDepositId) return;
    try {
      await updateOrderStatus(orderId, "cancelled");
      setSuccess("Pedido cancelado.");
      await loadOrders(selectedDepositId);
      resetEditor();
    } catch (err) {
      console.error(err);
      setError("No pudimos cancelar el pedido.");
    }
  };

  const renderSection = (section: (typeof ORDER_SECTIONS)[number]) => {
    const sectionLines = lines[section.key];
    const options = optionsForSection(section.key);

    return (
      <Card variant="outlined">
        <CardHeader
          title={section.title}
          titleTypographyProps={{ sx: { fontSize: 16, fontWeight: 700 } }}
        />
        <Divider />
        <CardContent>
          <Stack spacing={1.5}>
            {sectionLines.map((line, index) => (
              <Card key={`${section.key}-${index}`} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <TextField
                      select
                      label="Producto"
                      value={line.sku_id}
                      onChange={(e) => handleLineChange(section.key, index, "sku_id", e.target.value)}
                      helperText={!options.length ? "No hay productos activos en la sección" : undefined}
                    >
                      {options.map((sku) => (
                        <MenuItem key={sku.id} value={sku.id}>
                          {sku.name} ({sku.code})
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Cantidad"
                      type="number"
                      inputProps={{ step: 1, min: 1, inputMode: "numeric" }}
                      value={line.quantity}
                      onChange={(e) => handleLineChange(section.key, index, "quantity", e.target.value)}
                    />
                    <TextField
                      required
                      label="Stock en local"
                      type="number"
                      inputProps={{ step: 1, min: 0, inputMode: "numeric" }}
                      value={line.current_stock}
                      onChange={(e) => handleLineChange(section.key, index, "current_stock", e.target.value)}
                    />
                    <Box display="flex" justifyContent="flex-end">
                      <Button
                        color="error"
                        onClick={() => removeLine(section.key, index)}
                        disabled={sectionLines.length <= 1}
                      >
                        Quitar ítem
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => addLine(section.key)}
              disabled={!options.length}
            >
              Agregar ítem
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const showEditor = editingOrderId !== null;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        Pedidos (modo móvil)
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader
          avatar={<StoreIcon color="primary" />}
          title="Selecciona tu local"
          titleTypographyProps={{ sx: { fontSize: 18, fontWeight: 700 } }}
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <SearchableSelect
              label="Local"
              options={depositOptions}
              value={selectedDepositId}
              onChange={(value) => {
                const next = value ?? null;
                setSelectedDepositId(next);
                if (next) localStorage.setItem(STORAGE_KEY, String(next));
                setActiveOrder(null);
                setEditingOrderId(null);
              }}
              required
              placeholder="Selecciona un local"
            />
            {selectedDeposit && (
              <Typography variant="body2" color="text.secondary">
                Local activo: {selectedDeposit.name}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {!selectedDepositId && (
        <Alert severity="info">Selecciona un local para ver o crear pedidos.</Alert>
      )}

      {selectedDepositId && !showEditor && (
        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddCircleOutlineIcon />}
            onClick={startNewOrder}
            sx={{ fontWeight: 700 }}
          >
            Nuevo pedido
          </Button>

          <Card sx={{ borderRadius: 3 }}>
            <CardHeader
              avatar={<ReceiptIcon color="primary" />}
              title="Últimos pedidos"
              titleTypographyProps={{ sx: { fontSize: 18, fontWeight: 700 } }}
            />
            <Divider />
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {STATUS_FILTERS.map((filter) => (
                    <Chip
                      key={filter.value}
                      label={filter.label}
                      color={statusFilter === filter.value ? "primary" : "default"}
                      onClick={() => setStatusFilter(filter.value)}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Stack>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  {filteredOrders.map((order) => (
                    <Card
                      key={order.id}
                      variant="outlined"
                      sx={{ bgcolor: "#f9fafb", cursor: "pointer" }}
                      onClick={() => setActiveOrder(order)}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Pedido #{order.id}</Typography>
                          <Chip label={ORDER_STATUS_LABELS[order.status]} color={statusColor(order.status)} />
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {formatDate(order.created_at)} · Ítems {order.items.length} · Unidades {totalUnits(order)}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredOrders.length === 0 && (
                    <Typography variant="body2">Aún no hay pedidos en este estado.</Typography>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {activeOrder && (
            <Card sx={{ borderRadius: 3 }}>
              <CardHeader
                avatar={<LocalShippingIcon color="secondary" />}
                title={`Pedido #${activeOrder.id}`}
                subheader={ORDER_STATUS_LABELS[activeOrder.status]}
                titleTypographyProps={{ sx: { fontSize: 18, fontWeight: 700 } }}
                action={
                  <IconButton onClick={() => setActiveOrder(null)}>
                    <ArrowBackIcon />
                  </IconButton>
                }
              />
              <Divider />
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="body2">
                    Fecha: {formatDate(activeOrder.created_at)} · Local: {selectedDeposit?.name}
                  </Typography>
                  <Typography variant="body2">Ingresado por: {activeOrder.requested_by || "Sin nombre"}</Typography>
                  {activeOrder.notes && <Typography variant="body2">Notas: {activeOrder.notes}</Typography>}
                  <Stack spacing={1}>
                    {activeOrder.items.map((item) => (
                      <Card key={item.id ?? `${item.sku_id}`} variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontWeight: 700 }}>{item.sku_name ?? `SKU ${item.sku_id}`}</Typography>
                            <Badge color="primary" badgeContent={item.quantity} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Código: {item.sku_code ?? item.sku_id}
                          </Typography>
                          {item.current_stock != null && (
                            <Typography variant="body2" color="text.secondary">
                              Stock en local: {item.current_stock}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                  {["draft", "submitted"].includes(activeOrder.status) && (
                    <Stack spacing={1} direction="row" flexWrap="wrap">
                      {activeOrder.status === "draft" && (
                        <Button
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={() => startEditOrder(activeOrder)}
                        >
                          Editar
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => cancelOrder(activeOrder.id)}
                      >
                        Cancelar pedido
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {selectedDepositId && showEditor && (
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader
            avatar={<ReceiptIcon color="primary" />}
            title={editingOrderId && editingOrderId > 0 ? `Editar borrador #${editingOrderId}` : "Nuevo pedido (borrador)"}
            titleTypographyProps={{ sx: { fontSize: 18, fontWeight: 700 } }}
            action={
              <IconButton onClick={resetEditor}>
                <ArrowBackIcon />
              </IconButton>
            }
          />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <Card variant="outlined">
                <CardHeader title="Encabezado" titleTypographyProps={{ sx: { fontSize: 16, fontWeight: 700 } }} />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      label="Ingresado por"
                      value={requestedBy}
                      onChange={(e) => setRequestedBy(e.target.value)}
                      required
                    />
                    <TextField
                      label="Notas (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      multiline
                      minRows={2}
                    />
                  </Stack>
                </CardContent>
              </Card>

              <Typography sx={{ fontWeight: 700 }}>Ítems por sección</Typography>
              <Stack spacing={2}>
                {ORDER_SECTIONS.map((section) => (
                  <div key={section.key}>{renderSection(section)}</div>
                ))}
              </Stack>

              <Stack spacing={1} direction="row" flexWrap="wrap">
                <Button variant="contained" startIcon={<SaveIcon />} onClick={saveDraft}>
                  Guardar borrador
                </Button>
                <Button variant="contained" color="secondary" startIcon={<SendIcon />} onClick={sendOrder}>
                  Enviar pedido
                </Button>
                {editingOrderId && editingOrderId > 0 && (
                  <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => cancelOrder(editingOrderId)}>
                    Cancelar pedido
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
