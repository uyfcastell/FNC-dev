import InventoryIcon from "@mui/icons-material/Inventory2";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "../components/SearchableSelect";
import {
  ApiError,
  createDeposit,
  createSku,
  createStockMovement,
  Deposit,
  fetchDeposits,
  fetchSkuTypes,
  fetchStockMovementTypes,
  fetchStockLevels,
  fetchProductionLines,
  fetchSkus,
  ProductionLine,
  SKU,
  SKUType,
  StockMovementType,
  StockLevel,
  fetchUnits,
  UnitOption,
  UnitOfMeasure,
} from "../lib/api";
import { getOperationalDeposits } from "../lib/deposits";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function StockPage() {
  const { can } = useAuth();
  const canAdjustStock = can("stock.adjust");
  const canRegisterStock = can("stock.register");
  const canTransferStock = can("stock.transfer");

  const [stock, setStock] = useState<StockLevel[] | null>(null);
  const [skus, setSkus] = useState<SKU[] | null>(null);
  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [skuTypes, setSkuTypes] = useState<SKUType[]>([]);
  const [movementTypes, setMovementTypes] = useState<StockMovementType[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [skuForm, setSkuForm] = useState<{
    code: string;
    name: string;
    sku_type_id: number | "";
    unit: UnitOfMeasure;
    notes: string;
    is_active: boolean;
  }>({
    code: "",
    name: "",
    sku_type_id: "",
    unit: "kg",
    notes: "",
    is_active: true,
  });

  const [depositForm, setDepositForm] = useState({
    name: "",
    location: "",
    controls_lot: true,
    is_store: false,
  });

  const [movementForm, setMovementForm] = useState<{
    sku_id: number | null;
    deposit_id: number | null;
    movement_type_id: number | null;
    quantity: string;
    unit: UnitOfMeasure | null;
    reference: string;
    lot_code: string;
    production_line_id: number | null;
  }>({
    sku_id: null,
    deposit_id: null,
    movement_type_id: null,
    quantity: "",
    unit: null,
    reference: "",
    lot_code: "",
    production_line_id: null,
  });

  const sortedSkus = useMemo(() => (skus ? [...skus].sort((a, b) => a.name.localeCompare(b.name)) : []), [skus]);
  const sortedDeposits = useMemo(
    () => (deposits ? [...getOperationalDeposits(deposits)].sort((a, b) => a.name.localeCompare(b.name)) : []),
    [deposits]
  );
  const unitLabel = (unitCode?: UnitOfMeasure) => units.find((u) => u.code === unitCode)?.label ?? unitCode ?? "";
  const movementSkuOptions = useMemo(
    () =>
      sortedSkus.map((sku) => ({
        value: sku.id,
        label: `${sku.name} (${sku.code})`,
        description:
          sku.sku_type_code === "SEMI" && sku.units_per_kg
            ? `Base: kg · Secundaria: unidad (${sku.units_per_kg} un/kg)`
            : `Unidad: ${unitLabel(sku.unit)}`,
      })),
    [sortedSkus, units]
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
  const selectedMovementSku = useMemo(() => sortedSkus.find((sku) => sku.id === movementForm.sku_id) ?? null, [sortedSkus, movementForm.sku_id]);
  const movementUnitLabel = selectedMovementSku ? unitLabel(selectedMovementSku.unit) : null;
  const isSemiMovementSku = selectedMovementSku?.sku_type_code === "SEMI";
  const selectedMovementType = useMemo(
    () => movementTypes.find((type) => type.id === movementForm.movement_type_id) ?? null,
    [movementTypes, movementForm.movement_type_id]
  );
  const semiUnitsPerKg = isSemiMovementSku ? selectedMovementSku?.units_per_kg || 1 : null;
  const quantityUnitLabel = movementForm.unit ? unitLabel(movementForm.unit) : movementUnitLabel;
  const isProductionMovement = selectedMovementType?.code === "PRODUCTION";
  const navigate = useNavigate();

  useEffect(() => {
    void reloadData();
  }, []);

  useEffect(() => {
    if (units.length && !skuForm.unit) {
      setSkuForm((prev) => ({ ...prev, unit: units[0].code }));
    }
  }, [units, skuForm.unit]);

  useEffect(() => {
    if (!skuForm.sku_type_id && skuTypes.length) {
      const defaultType = skuTypes.find((type) => type.code === "MP" && type.is_active) ?? skuTypes.find((type) => type.is_active);
      if (defaultType) {
        setSkuForm((prev) => ({ ...prev, sku_type_id: defaultType.id }));
      }
    }
  }, [skuTypes, skuForm.sku_type_id]);

  useEffect(() => {
    if (!movementForm.movement_type_id && movementTypes.length) {
      const defaultType =
        movementTypes.find((type) => ["PURCHASE", "ADJUSTMENT", "TRANSFER"].includes(type.code) && type.is_active) ??
        movementTypes.find((type) => type.code === "PRODUCTION" && type.is_active) ??
        movementTypes.find((type) => type.is_active);
      if (defaultType) {
        setMovementForm((prev) => ({ ...prev, movement_type_id: defaultType.id }));
      }
    }
  }, [movementTypes, movementForm.movement_type_id]);

  useEffect(() => {
    if (!selectedMovementSku) return;
    if (selectedMovementSku.sku_type_code === "SEMI") {
      const isConsumption = selectedMovementType?.code === "CONSUMPTION";
      const desiredUnit: UnitOfMeasure = isConsumption ? "unit" : "kg";
      setMovementForm((prev) => (prev.unit === desiredUnit ? prev : { ...prev, unit: desiredUnit }));
    } else if (!movementForm.unit) {
      setMovementForm((prev) => ({ ...prev, unit: selectedMovementSku.unit }));
    }
  }, [selectedMovementSku, selectedMovementType, movementForm.unit]);

  const reloadData = async () => {
    try {
      const [stockLevels, skuList, depositList, unitList, skuTypeList, movementTypeList, productionLineList] = await Promise.all([
        fetchStockLevels(),
        fetchSkus(),
        fetchDeposits(),
        fetchUnits(),
        fetchSkuTypes({ include_inactive: true }),
        fetchStockMovementTypes({ include_inactive: true }),
        fetchProductionLines(),
      ]);
      setStock(stockLevels);
      setSkus(skuList);
      setDeposits(depositList);
      setUnits(unitList);
      setSkuTypes(skuTypeList);
      setMovementTypes(movementTypeList);
      setProductionLines(productionLineList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos obtener datos. ¿Está levantado el backend?");
      setStock([]);
    }
  };

  const getUnit = (skuCode: string) => skus?.find((s) => s.code === skuCode)?.unit ?? "";
  const alertStatusConfig: Record<
    string,
    { label: string; color: "success" | "warning" | "error" | "default" }
  > = {
    green: { label: "En rango", color: "success" },
    yellow: { label: "Atención", color: "warning" },
    red: { label: "Crítico", color: "error" },
    none: { label: "Sin alerta", color: "default" },
  };
  const alertDetail = (row: StockLevel) => {
    const parts = [
      row.alert_green_min != null ? `Verde >= ${row.alert_green_min}` : null,
      row.alert_yellow_min != null ? `Amarillo >= ${row.alert_yellow_min}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Sin umbrales configurados";
  };

  const handleCreateSku = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!skuForm.sku_type_id) {
        setError("Selecciona un tipo de SKU");
        return;
      }
      const defaultType = skuTypes.find((type) => type.code === "MP" && type.is_active) ?? skuTypes.find((type) => type.is_active);
      await createSku({ ...skuForm, sku_type_id: Number(skuForm.sku_type_id), notes: skuForm.notes || null, is_active: true });
      setSuccess("SKU creado correctamente");
      setSkuForm({
        code: "",
        name: "",
        sku_type_id: defaultType?.id ?? "",
        unit: "kg",
        notes: "",
        is_active: true,
      });
      await reloadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos crear el SKU. ¿Código duplicado?");
    }
  };

  const handleCreateDeposit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createDeposit({
        name: depositForm.name,
        location: depositForm.location || null,
        controls_lot: depositForm.controls_lot,
        is_store: depositForm.is_store,
	is_active: true,
      });
      setSuccess("Depósito creado correctamente");
      setDepositForm({ name: "", location: "", controls_lot: true, is_store: false });
      await reloadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos crear el depósito. ¿Nombre duplicado?");
    }
  };

  const handleCreateMovement = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!movementForm.sku_id || !movementForm.deposit_id || !movementForm.quantity || !movementForm.movement_type_id) {
      setError("Selecciona SKU, depósito, tipo de movimiento y cantidad");
      return;
    }
    if (isProductionMovement && !movementForm.production_line_id) {
      setError("Selecciona la línea de producción para movimientos de tipo PRODUCCIÓN");
      return;
    }
    const payload = {
      sku_id: Number(movementForm.sku_id),
      deposit_id: Number(movementForm.deposit_id),
      movement_type_id: Number(movementForm.movement_type_id),
      quantity: Number(movementForm.quantity),
      unit: movementForm.unit || undefined,
      reference: movementForm.reference || undefined,
      lot_code: movementForm.lot_code || undefined,
      production_line_id: movementForm.production_line_id || undefined,
    };
    try {
      if (import.meta.env.DEV) {
        console.info("[stock] POST /stock/movements payload", payload);
      }
      await createStockMovement(payload);
      setSuccess("Movimiento registrado");
      setMovementForm({
        sku_id: null,
        deposit_id: null,
        movement_type_id: movementForm.movement_type_id,
        quantity: "",
        unit: null,
        reference: "",
        lot_code: "",
        production_line_id: isProductionMovement ? movementForm.production_line_id : null,
      });
      await reloadData();
    } catch (err) {
      if (err instanceof ApiError) {
        console.error("[stock] POST /stock/movements failed", {
          payload,
          status: err.status,
          detail: err.message,
        });
        setError(`No pudimos registrar el movimiento: ${err.message}`);
        return;
      }
      console.error("[stock] POST /stock/movements failed", { payload, error: err });
      setError("No pudimos registrar el movimiento. Verifica los datos.");
    }
  };

  const productionLineOptions = useMemo(
    () => productionLines.filter((line) => line.is_active).map((line) => ({ value: line.id, label: line.name })),
    [productionLines]
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InventoryIcon color="primary" />
          Stock
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/stock/movimientos")}>
          Ver movimientos
        </Button>
      </Stack>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      <Grid container spacing={2}>
        {canAdjustStock && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Alta rápida de SKU" subheader="Código, categoría y unidad de medida" />
            <Divider />
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={handleCreateSku}>
                <TextField
                  required
                  label="Código"
                  value={skuForm.code}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
                <TextField
                  required
                  label="Nombre"
                  value={skuForm.name}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <TextField
                  select
                  label="Tipo"
                  value={skuForm.sku_type_id}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, sku_type_id: Number(e.target.value) }))}
                  helperText="Catálogo administrable"
                  required
                >
                  {skuTypes
                    .filter((type) => type.is_active)
                    .map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.code} — {type.label}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  label="Unidad de medida"
                  value={skuForm.unit}
                  select
                  helperText="Elegí una unidad del catálogo"
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, unit: e.target.value as UnitOfMeasure }))}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.code} value={unit.code}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Notas"
                  value={skuForm.notes}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, notes: e.target.value }))}
                  multiline
                  minRows={2}
                />
                <Button type="submit" variant="contained">
                  Crear SKU
                </Button>
              </Stack>
            </CardContent>
            </Card>
          </Grid>
        )}
        {canAdjustStock && (
          <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Alta de depósito" subheader="Ubicación y control de lotes" />
            <Divider />
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={handleCreateDeposit}>
                <TextField
                  required
                  label="Nombre"
                  value={depositForm.name}
                  onChange={(e) => setDepositForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <TextField
                  label="Ubicación"
                  value={depositForm.location}
                  onChange={(e) => setDepositForm((prev) => ({ ...prev, location: e.target.value }))}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={depositForm.controls_lot}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, controls_lot: e.target.checked }))}
                    />
                  }
                  label="Controla lote"
                />
                <FormControlLabel
                  control={<Switch checked={depositForm.is_store} onChange={(e) => setDepositForm((prev) => ({ ...prev, is_store: e.target.checked }))} />}
                  label="Es local (destino de pedidos)"
                />
                <Button type="submit" variant="contained">
                  Crear depósito
                </Button>
              </Stack>
            </CardContent>
            </Card>
          </Grid>
        )}
        {(canRegisterStock || canAdjustStock || canTransferStock) && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Movimiento de stock" subheader="Ingresos, consumos, ajustes y remitos" />
              <Divider />
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={handleCreateMovement}>
                <SearchableSelect
                  label="SKU"
                  required
                  options={movementSkuOptions}
                  value={movementForm.sku_id}
                  onChange={(value) => setMovementForm((prev) => ({ ...prev, sku_id: value }))}
                  helperText={!skus?.length ? "Carga SKUs primero" : undefined}
                />
                {movementUnitLabel && (
                  <Typography variant="body2" color="text.secondary">
                    Unidad: {movementUnitLabel}
                  </Typography>
                )}
                <SearchableSelect
                  label="Depósito"
                  required
                  options={depositOptions}
                  value={movementForm.deposit_id}
                  onChange={(value) => setMovementForm((prev) => ({ ...prev, deposit_id: value }))}
                  helperText={!deposits?.length ? "Crea un depósito primero" : undefined}
                />
                <TextField
                  select
                  label="Tipo de movimiento"
                  value={movementForm.movement_type_id ?? ""}
                  onChange={(e) => {
                    const selectedTypeId = Number(e.target.value);
                    const selectedType = movementTypes.find((type) => type.id === selectedTypeId);
                    setMovementForm((prev) => ({
                      ...prev,
                      movement_type_id: selectedTypeId,
                      production_line_id: selectedType?.code === "PRODUCTION" ? prev.production_line_id : null,
                    }));
                  }}
                  helperText={!movementTypes.length ? "Configura los tipos de movimiento primero" : undefined}
                  required
                >
                  {movementTypes
                    .filter((type) => type.is_active)
                    .map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.code} — {type.label}
                      </MenuItem>
                    ))}
                </TextField>
                {isProductionMovement && (
                  <SearchableSelect
                    label="Línea de producción"
                    required
                    options={productionLineOptions}
                    value={movementForm.production_line_id}
                    onChange={(value) => setMovementForm((prev) => ({ ...prev, production_line_id: value }))}
                    helperText={!productionLineOptions.length ? "Configura líneas de producción activas" : undefined}
                  />
                )}
                {isSemiMovementSku && (
                  <>
                    <TextField
                      select
                      label="Unidad"
                      value={movementForm.unit ?? ""}
                      onChange={(e) => setMovementForm((prev) => ({ ...prev, unit: e.target.value as UnitOfMeasure }))}
                      helperText="El stock se descuenta en kg (base)"
                    >
                      <MenuItem value="kg">kg (base)</MenuItem>
                      <MenuItem value="unit">Unidades (conv.)</MenuItem>
                    </TextField>
                    {semiUnitsPerKg && (
                      <Typography variant="caption" color="text.secondary">
                        Equivalencia SEMI: {semiUnitsPerKg} un = 1 kg
                      </Typography>
                    )}
                  </>
                )}
                <TextField
                  required
                  label="Cantidad"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  InputProps={quantityUnitLabel ? { endAdornment: <InputAdornment position="end">{quantityUnitLabel}</InputAdornment> } : undefined}
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <TextField
                  label="Referencia (orden, remito, ajuste)"
                  value={movementForm.reference}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, reference: e.target.value }))}
                />
                <TextField
                  label="Lote"
                  value={movementForm.lot_code}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, lot_code: e.target.value }))}
                />
                <Button type="submit" variant="contained">
                  Registrar
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        )}
      </Grid>
      <Card>
        <CardHeader
          title="Saldos por depósito"
          subheader="Consolidado en tiempo real según movimientos registrados"
          action={<Chip label="Vista diaria" color="secondary" variant="outlined" />}
        />
        <Divider />
        <CardContent>
          {!stock && (
            <Stack spacing={1}>
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
            </Stack>
          )}
          {stock && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Depósito</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell>UoM</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stock.map((row) => (
                  <TableRow key={`${row.sku_code}-${row.deposit_id}`}>
                    <TableCell>{row.sku_code}</TableCell>
                    <TableCell>{row.deposit_name}</TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell>{getUnit(row.sku_code)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={(alertStatusConfig[row.alert_status ?? "none"] ?? alertStatusConfig.none).label}
                        color={(alertStatusConfig[row.alert_status ?? "none"] ?? alertStatusConfig.none).color}
                        variant="outlined"
                        title={alertDetail(row)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {stock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Sin movimientos todavía. Registra ingresos o consumos para ver el kardex.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
