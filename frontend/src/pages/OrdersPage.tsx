import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
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
  deleteOrder,
  fetchOrders,
  fetchSkus,
  Order,
  OrderItem,
  OrderStatus,
  SKU,
  updateOrder,
  updateOrderStatus,
} from "../lib/api";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  approved: "Aprobado",
  prepared: "Preparación",
  closed: "Cerrado",
};

type OrderFormItem = { sku_id: string; quantity: string; current_stock: string };

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [orderForm, setOrderForm] = useState<{ destination: string; notes: string; status: OrderStatus; items: OrderFormItem[] }>(
    {
      destination: "",
      notes: "",
      status: "submitted",
      items: [
        {
          sku_id: "",
          quantity: "",
          current_stock: "",
        },
      ],
    }
  );

  useEffect(() => {
    void loadData();
  }, []);

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);

  const loadData = async () => {
    try {
      const [orderList, skuList] = await Promise.all([fetchOrders(), fetchSkus()]);
      setOrders(orderList);
      setSkus(skuList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos obtener pedidos o productos");
    }
  };

  const skuLabel = (id: number) => {
    const sku = skus.find((s) => s.id === id);
    return sku ? `${sku.name} (${sku.code})` : `SKU ${id}`;
  };

  const handleItemChange = (index: number, field: keyof OrderFormItem, value: string) => {
    setOrderForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addOrderItem = () => setOrderForm((prev) => ({ ...prev, items: [...prev.items, { sku_id: "", quantity: "", current_stock: "" }] }));
  const removeOrderItem = (index: number) =>
    setOrderForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));

  const resetForm = () => {
    setEditingId(null);
    setOrderForm({ destination: "", notes: "", status: "submitted", items: [{ sku_id: "", quantity: "", current_stock: "" }] });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!orderForm.items.length || orderForm.items.some((item) => !item.sku_id || !item.quantity)) {
      setError("Completa al menos un ítem con producto y cantidad");
      return;
    }
    try {
      const payload = {
        destination: orderForm.destination || "Destino sin nombre",
        status: orderForm.status,
        notes: orderForm.notes || undefined,
        items: orderForm.items.map((item) => ({
          sku_id: Number(item.sku_id),
          quantity: Number(item.quantity),
          current_stock: item.current_stock ? Number(item.current_stock) : undefined,
        })) as OrderItem[],
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

  const startEdit = (order: Order) => {
    setEditingId(order.id);
    setOrderForm({
      destination: order.destination,
      notes: order.notes || "",
      status: order.status,
      items: order.items.map((item) => ({
        sku_id: String(item.sku_id),
        quantity: String(item.quantity),
        current_stock: item.current_stock != null ? String(item.current_stock) : "",
      })),
    });
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

  const handleDelete = async (orderId: number) => {
    if (!window.confirm("¿Eliminar el pedido?")) return;
    try {
      await deleteOrder(orderId);
      await loadData();
      setSuccess("Pedido eliminado");
    } catch (err) {
      console.error(err);
      setError("No pudimos eliminar el pedido");
    }
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
          subheader="Altas, bajas y modificaciones"
          action={
            <IconButton onClick={loadData}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Stack component="form" spacing={2} onSubmit={handleSubmit}>
                <TextField
                  label="Destino"
                  value={orderForm.destination}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, destination: e.target.value }))}
                  placeholder="Local, cliente o depósito"
                />
                <TextField
                  select
                  label="Estado"
                  value={orderForm.status}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, status: e.target.value as OrderStatus }))}
                >
                  {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
                    <MenuItem key={status} value={status}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Notas"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                  multiline
                  minRows={2}
                />
                <Typography variant="subtitle2">Ítems</Typography>
                <Stack spacing={1}>
                  {orderForm.items.map((item, index) => (
                    <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                      <TextField
                        select
                        required
                        label="Producto"
                        value={item.sku_id}
                        onChange={(e) => handleItemChange(index, "sku_id", e.target.value)}
                        sx={{ flex: 1 }}
                      >
                        {sortedSkus.map((sku) => (
                          <MenuItem key={sku.id} value={sku.id}>
                            {sku.name} ({sku.code})
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        required
                        label="Cantidad"
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        sx={{ width: 150 }}
                      />
                      <TextField
                        label="Stock local"
                        type="number"
                        inputProps={{ step: "0.01" }}
                        value={item.current_stock}
                        onChange={(e) => handleItemChange(index, "current_stock", e.target.value)}
                        sx={{ width: 150 }}
                      />
                      <Button disabled={orderForm.items.length <= 1} onClick={() => removeOrderItem(index)} color="error">
                        Quitar
                      </Button>
                    </Stack>
                  ))}
                  <Button variant="outlined" startIcon={<PlaylistAddIcon />} onClick={addOrderItem}>
                    Agregar ítem
                  </Button>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained">
                    {editingId ? "Actualizar" : "Crear"}
                  </Button>
                  {editingId && (
                    <Button onClick={resetForm}>Cancelar</Button>
                  )}
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Bandeja de pedidos ({orders.length})
              </Typography>
              <Stack spacing={1}>
                {orders.map((order) => (
                  <Card key={order.id} variant="outlined">
                    <CardContent>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
                        <Box>
                          <Typography fontWeight={700}>Pedido #{order.id}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Destino: {order.destination} · Creado: {new Date(order.created_at).toLocaleDateString()}
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
                          <TextField
                            select
                            size="small"
                            label="Estado"
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          >
                            {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
                              <MenuItem key={status} value={status}>
                                {label}
                              </MenuItem>
                            ))}
                          </TextField>
                          <Button variant="outlined" onClick={() => startEdit(order)}>
                            Editar
                          </Button>
                          <Button color="error" onClick={() => handleDelete(order.id)}>
                            Eliminar
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}
