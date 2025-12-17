import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { createOrder, fetchSkus, OrderStatus, SKU } from "../lib/api";

const ORDER_PIN = "1111";

export function OrderEntryPage() {
  const location = useLocation();
  const [skus, setSkus] = useState<SKU[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinValidated, setPinValidated] = useState<boolean>(() => sessionStorage.getItem("order-entry-pin-ok") === "true");

  const [form, setForm] = useState<{ destination: string; sku_id: string; quantity: string; current_stock: string; notes: string }>(
    {
      destination: "",
      sku_id: "",
      quantity: "",
      current_stock: "",
      notes: "",
    }
  );

  useEffect(() => {
    void loadSkus();
  }, []);

  useEffect(() => {
    const fromMenu = (location.state as { fromMenu?: boolean } | null)?.fromMenu;
    if (fromMenu && !pinValidated) {
      setPinValidated(true);
      sessionStorage.setItem("order-entry-pin-ok", "true");
    }
  }, [location.state, pinValidated]);

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);

  const loadSkus = async () => {
    try {
      const skuList = await fetchSkus();
      setSkus(skuList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los productos. ¿Backend activo?");
    }
  };

  const handlePinSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (pin === ORDER_PIN) {
      sessionStorage.setItem("order-entry-pin-ok", "true");
      setPinValidated(true);
      setError(null);
      return;
    }
    setError("PIN incorrecto. Intenta nuevamente.");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.sku_id || !form.quantity) {
      setError("Completa producto y cantidad");
      return;
    }
    try {
      const payloadStatus: OrderStatus = "submitted";
      await createOrder({
        destination: form.destination || "Pedido de local",
        notes: form.notes || undefined,
        status: payloadStatus,
        items: [
          {
            sku_id: Number(form.sku_id),
            quantity: Number(form.quantity),
            current_stock: form.current_stock ? Number(form.current_stock) : undefined,
          },
        ],
      });
      setSuccess("Pedido enviado");
      setForm({ destination: "", sku_id: "", quantity: "", current_stock: "", notes: "" });
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar el pedido. Revisa los datos");
    }
  };

  if (!pinValidated) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 520, mx: "auto", mt: 4 }}>
        <Card>
          <CardHeader title="Acceso a ingreso de pedidos" />
          <Divider />
          <CardContent>
            {error && <Alert severity="warning">{error}</Alert>}
            <Stack component="form" spacing={2} onSubmit={handlePinSubmit}>
              <Typography>Ingresa el PIN de 4 dígitos para continuar.</Typography>
              <TextField
                label="PIN"
                type="password"
                value={pin}
                inputProps={{ maxLength: 4, inputMode: "numeric" }}
                onChange={(e) => setPin(e.target.value)}
                required
              />
              <Button type="submit" variant="contained">
                Validar
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PlaylistAddIcon color="primary" /> Ingreso de pedidos
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      <Card>
        <CardHeader title="Nuevo pedido" subheader="Locales ingresan cantidad y stock actual" />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Stack component="form" spacing={2} onSubmit={handleSubmit}>
                <TextField
                  label="Local / destino"
                  value={form.destination}
                  onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
                  placeholder="Ej: Local Centro"
                />
                <TextField
                  select
                  required
                  label="Producto"
                  value={form.sku_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, sku_id: e.target.value }))}
                >
                  {sortedSkus.map((sku) => (
                    <MenuItem key={sku.id} value={sku.id}>
                      {sku.name} ({sku.code})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  label="Cantidad solicitada"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  value={form.quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <TextField
                  label="Stock actual en local"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  value={form.current_stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, current_stock: e.target.value }))}
                  helperText="Informativo para el equipo de despacho"
                />
                <TextField
                  label="Notas"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  multiline
                />
                <Button type="submit" variant="contained" size="large">
                  Enviar pedido
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: 2, border: "1px solid #e5e7eb" }}>
                <Typography fontWeight={700}>Acceso directo</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Esta pantalla puede abrirse directamente desde un acceso en el local. Si se ingresa la URL manualmente se solicitará el PIN de 4 dígitos.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Formato de producto: nombre + SKU, ordenados alfabéticamente para uso en móviles.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}
