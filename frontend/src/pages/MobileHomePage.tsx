import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import ProductionIcon from "@mui/icons-material/PrecisionManufacturing";
import WarningIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import {
  createStockMovement,
  Deposit,
  fetchDeposits,
  fetchSkus,
  MovementType,
  SKUTag,
  SKU,
} from "../lib/api";

const ALLOWED_TAGS: SKUTag[] = ["MP", "SEMI", "PT"];

export function MobileHomePage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [productionForm, setProductionForm] = useState({
    sku_id: "",
    deposit_id: "",
    quantity: "",
    reference: "",
  });

  const [mermaForm, setMermaForm] = useState({
    sku_id: "",
    deposit_id: "",
    quantity: "",
    reference: "Merma/Descarte",
  });

  useEffect(() => {
    void loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [skuList, depositList] = await Promise.all([fetchSkus(), fetchDeposits()]);
      setSkus(skuList);
      setDeposits(depositList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar catálogo o depósitos. ¿Está levantado el backend?");
    }
  };

  const productionSkus = useMemo(() => skus.filter((sku) => ALLOWED_TAGS.includes(sku.tag)), [skus]);

  const handleMovement = async (
    event: FormEvent,
    movement_type: MovementType,
    formState: typeof productionForm | typeof mermaForm,
    reset: () => void
  ) => {
    event.preventDefault();
    if (!formState.sku_id || !formState.deposit_id || !formState.quantity) {
      setError("Completa SKU, depósito y cantidad");
      return;
    }
    try {
      await createStockMovement({
        sku_id: Number(formState.sku_id),
        deposit_id: Number(formState.deposit_id),
        quantity: Number(formState.quantity),
        movement_type,
        reference: formState.reference || undefined,
      });
      setSuccess("Registrado correctamente");
      setError(null);
      reset();
      await loadCatalog();
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar el movimiento. Verifica saldo o datos.");
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        Producción y mermas (modo móvil)
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader
          titleTypographyProps={{ sx: { fontSize: 20, fontWeight: 700 } }}
          title="Registrar producción"
          subheader="Solo PT / SEMI / MP"
          avatar={<ProductionIcon color="primary" />}
        />
        <CardContent>
          <Stack component="form" spacing={2} onSubmit={(e) => handleMovement(e, "production", productionForm, () => setProductionForm({ sku_id: "", deposit_id: "", quantity: "", reference: "" }))}>
            <TextField
              select
              required
              label="SKU producido"
              value={productionForm.sku_id}
              onChange={(e) => setProductionForm((prev) => ({ ...prev, sku_id: e.target.value }))}
              InputLabelProps={{ sx: { fontSize: 16 } }}
            >
              {productionSkus.map((sku) => (
                <MenuItem key={sku.id} value={sku.id} sx={{ fontSize: 16 }}>
                  {sku.code} · {sku.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              required
              label="Depósito"
              value={productionForm.deposit_id}
              onChange={(e) => setProductionForm((prev) => ({ ...prev, deposit_id: e.target.value }))}
              InputLabelProps={{ sx: { fontSize: 16 } }}
            >
              {deposits.map((deposit) => (
                <MenuItem key={deposit.id} value={deposit.id} sx={{ fontSize: 16 }}>
                  {deposit.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              label="Cantidad"
              type="number"
              inputProps={{ step: "0.01", style: { fontSize: 18, height: 24 } }}
              value={productionForm.quantity}
              onChange={(e) => setProductionForm((prev) => ({ ...prev, quantity: e.target.value }))}
            />
            <TextField
              label="Referencia / Orden"
              value={productionForm.reference}
              onChange={(e) => setProductionForm((prev) => ({ ...prev, reference: e.target.value }))}
            />
            <Button type="submit" variant="contained" size="large" sx={{ py: 1.5, fontSize: 16 }}>
              Guardar producción
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader
          titleTypographyProps={{ sx: { fontSize: 20, fontWeight: 700 } }}
          title="Registrar merma / descarte"
          avatar={<WarningIcon color="warning" />}
        />
        <CardContent>
          <Stack
            component="form"
            spacing={2}
            onSubmit={(e) =>
              handleMovement(e, "merma", mermaForm, () => setMermaForm({ sku_id: "", deposit_id: "", quantity: "", reference: "Merma/Descarte" }))
            }
          >
            <TextField
              select
              required
              label="SKU"
              value={mermaForm.sku_id}
              onChange={(e) => setMermaForm((prev) => ({ ...prev, sku_id: e.target.value }))}
              InputLabelProps={{ sx: { fontSize: 16 } }}
            >
              {productionSkus.map((sku) => (
                <MenuItem key={sku.id} value={sku.id} sx={{ fontSize: 16 }}>
                  {sku.code} · {sku.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              required
              label="Depósito"
              value={mermaForm.deposit_id}
              onChange={(e) => setMermaForm((prev) => ({ ...prev, deposit_id: e.target.value }))}
              InputLabelProps={{ sx: { fontSize: 16 } }}
            >
              {deposits.map((deposit) => (
                <MenuItem key={deposit.id} value={deposit.id} sx={{ fontSize: 16 }}>
                  {deposit.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              label="Cantidad a descontar"
              type="number"
              inputProps={{ step: "0.01", style: { fontSize: 18, height: 24 } }}
              value={mermaForm.quantity}
              onChange={(e) => setMermaForm((prev) => ({ ...prev, quantity: e.target.value }))}
            />
            <TextField
              label="Motivo / referencia"
              value={mermaForm.reference}
              onChange={(e) => setMermaForm((prev) => ({ ...prev, reference: e.target.value }))}
            />
            <Button type="submit" variant="contained" color="warning" size="large" sx={{ py: 1.5, fontSize: 16 }}>
              Registrar merma
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardHeader
          title="Pedidos y remitos"
          subheader="Consulta rápida para operarios"
          avatar={<ReceiptIcon color="secondary" />}
          titleTypographyProps={{ sx: { fontSize: 20, fontWeight: 700 } }}
        />
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <Typography variant="body1" sx={{ fontSize: 16 }}>
                Consulta pedidos aprobados y remitos listos para despacho directamente desde la tablet.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                component={RouterLink}
                to="/mobile/pedidos"
                variant="outlined"
                fullWidth
                size="large"
                sx={{ py: 1.5, fontSize: 16 }}
              >
                Ver pedidos y remitos
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ textAlign: "center", color: "text.secondary", fontSize: 12 }}>
        Modo optimizado para tablet / smartphone — botones y textos grandes para evitar errores de toque.
      </Box>
    </Stack>
  );
}
