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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { SearchableSelect } from "../components/SearchableSelect";
import {
  createStockMovement,
  Deposit,
  fetchDeposits,
  fetchProductionLines,
  fetchSkus,
  fetchStockMovementTypes,
  ProductionLine,
  SKU,
  StockMovementType,
} from "../lib/api";

const ALLOWED_TYPE_CODES: string[] = ["MP", "SEMI", "PT"];

export function MobileProductionPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [movementTypes, setMovementTypes] = useState<StockMovementType[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [productionForm, setProductionForm] = useState({
    sku_id: null as number | null,
    deposit_id: null as number | null,
    production_line_id: null as number | null,
    lot_code: "",
    quantity: "",
    reference: "",
  });

  const [mermaForm, setMermaForm] = useState({
    sku_id: null as number | null,
    deposit_id: null as number | null,
    quantity: "",
    reference: "Merma/Descarte",
  });

  useEffect(() => {
    void loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [skuList, depositList, movementTypeList, productionLineList] = await Promise.all([
        fetchSkus(),
        fetchDeposits(),
        fetchStockMovementTypes({ include_inactive: true }),
        fetchProductionLines(),
      ]);
      setSkus(skuList);
      setDeposits(depositList);
      setMovementTypes(movementTypeList);
      setProductionLines(productionLineList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar catálogo o depósitos. ¿Está levantado el backend?");
    }
  };

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);
  const productionSkus = useMemo(
    () => sortedSkus.filter((sku) => ALLOWED_TYPE_CODES.includes(sku.sku_type_code)),
    [sortedSkus]
  );
  const sortedDeposits = useMemo(() => [...deposits].sort((a, b) => a.name.localeCompare(b.name)), [deposits]);
  const skuOptions = useMemo(
    () =>
      productionSkus.map((sku) => ({
        value: sku.id,
        label: `${sku.name} (${sku.code})`,
      })),
    [productionSkus]
  );
  const depositOptions = useMemo(
    () =>
      sortedDeposits.map((deposit) => ({
        value: deposit.id,
        label: deposit.name,
        description: deposit.location || undefined,
      })),
    [sortedDeposits]
  );
  const productionLineOptions = useMemo(
    () =>
      productionLines
        .filter((line) => line.is_active)
        .map((line) => ({
          value: line.id,
          label: line.name,
        })),
    [productionLines]
  );
  const selectedProductionSku = productionSkus.find((sku) => sku.id === productionForm.sku_id);
  const selectedMermaSku = productionSkus.find((sku) => sku.id === mermaForm.sku_id);

  const handleMovement = async (
    event: FormEvent,
    movementTypeCode: string,
    formState: typeof productionForm | typeof mermaForm,
    reset: () => void
  ) => {
    event.preventDefault();
    if (!formState.sku_id || !formState.deposit_id || !formState.quantity || (movementTypeCode === "PRODUCTION" && !("production_line_id" in formState ? formState.production_line_id : null))) {
      setError(movementTypeCode === "PRODUCTION" ? "Completa SKU, depósito, línea y cantidad" : "Completa SKU, depósito y cantidad");
      return;
    }
    const movementType = movementTypes.find((type) => type.code === movementTypeCode && type.is_active);
    if (!movementType) {
      setError("Configura los tipos de movimiento antes de registrar");
      return;
    }
    const sku = skus.find((s) => s.id === Number(formState.sku_id));
    const isSemi = sku?.sku_type_code === "SEMI";
    const unit = isSemi ? (movementTypeCode === "CONSUMPTION" ? "unit" : "kg") : sku?.unit;
    try {
      await createStockMovement({
        sku_id: Number(formState.sku_id),
        deposit_id: Number(formState.deposit_id),
        quantity: Number(formState.quantity),
        movement_type_id: movementType.id,
        unit: unit,
        reference: formState.reference || undefined,
        production_line_id: "production_line_id" in formState ? (formState.production_line_id ?? undefined) : undefined,
        lot_code: "lot_code" in formState ? formState.lot_code.trim() || undefined : undefined,
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
          <Stack
            component="form"
            spacing={2}
            onSubmit={(e) =>
              handleMovement(e, "PRODUCTION", productionForm, () =>
                setProductionForm({ sku_id: null, deposit_id: null, production_line_id: null, lot_code: "", quantity: "", reference: "" })
              )
            }
            >
            <SearchableSelect
              label="SKU producido"
              required
              options={skuOptions}
              value={productionForm.sku_id}
              onChange={(value) => setProductionForm((prev) => ({ ...prev, sku_id: value }))}
              textFieldProps={{ InputLabelProps: { sx: { fontSize: 16 } } }}
            />
            {selectedProductionSku?.sku_type_code === "SEMI" && (
              <Typography variant="caption" color="text.secondary">
                SEMI en kg (base). Equivalencia: {selectedProductionSku.units_per_kg ?? 1} un = 1 kg
              </Typography>
            )}
            <SearchableSelect
              label="Depósito"
              required
              options={depositOptions}
              value={productionForm.deposit_id}
              onChange={(value) => setProductionForm((prev) => ({ ...prev, deposit_id: value }))}
              textFieldProps={{ InputLabelProps: { sx: { fontSize: 16 } } }}
            />
            <SearchableSelect
              label="Línea de producción"
              required
              options={productionLineOptions}
              value={productionForm.production_line_id}
              onChange={(value) => setProductionForm((prev) => ({ ...prev, production_line_id: value }))}
              textFieldProps={{ InputLabelProps: { sx: { fontSize: 16 } } }}
            />
            <TextField
              label="Lote (opcional)"
              placeholder="YYMMDD-Lx-SKU-###"
              value={productionForm.lot_code}
              onChange={(e) => setProductionForm((prev) => ({ ...prev, lot_code: e.target.value }))}
              InputProps={{ sx: { fontSize: 16 } }}
            />
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
              handleMovement(e, "MERMA", mermaForm, () => setMermaForm({ sku_id: null, deposit_id: null, quantity: "", reference: "Merma/Descarte" }))
            }
          >
            <SearchableSelect
              label="SKU"
              required
              options={skuOptions}
              value={mermaForm.sku_id}
              onChange={(value) => setMermaForm((prev) => ({ ...prev, sku_id: value }))}
              textFieldProps={{ InputLabelProps: { sx: { fontSize: 16 } } }}
            />
            {selectedMermaSku?.sku_type_code === "SEMI" && (
              <Typography variant="caption" color="text.secondary">
                SEMI en kg (base). Equivalencia: {selectedMermaSku.units_per_kg ?? 1} un = 1 kg
              </Typography>
            )}
            <SearchableSelect
              label="Depósito"
              required
              options={depositOptions}
              value={mermaForm.deposit_id}
              onChange={(value) => setMermaForm((prev) => ({ ...prev, deposit_id: value }))}
              textFieldProps={{ InputLabelProps: { sx: { fontSize: 16 } } }}
            />
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
