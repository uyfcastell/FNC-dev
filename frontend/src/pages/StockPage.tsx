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
import { FormEvent, useEffect, useState } from "react";

import {
  createDeposit,
  createSku,
  createStockMovement,
  Deposit,
  fetchDeposits,
  fetchStockLevels,
  fetchSkus,
  MovementType,
  SKUTag,
  SKU,
  StockLevel,
} from "../lib/api";

export function StockPage() {
  const [stock, setStock] = useState<StockLevel[] | null>(null);
  const [skus, setSkus] = useState<SKU[] | null>(null);
  const [deposits, setDeposits] = useState<Deposit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [skuForm, setSkuForm] = useState({
    code: "",
    name: "",
    tag: "MP" as SKUTag,
    unit: "kg",
    notes: "",
  });

  const [depositForm, setDepositForm] = useState({
    name: "",
    location: "",
    controls_lot: true,
  });

  const [movementForm, setMovementForm] = useState<{
    sku_id: string;
    deposit_id: string;
    movement_type: MovementType;
    quantity: string;
    reference: string;
    lot_code: string;
  }>({
    sku_id: "",
    deposit_id: "",
    movement_type: "production",
    quantity: "",
    reference: "",
    lot_code: "",
  });

  useEffect(() => {
    void reloadData();
  }, []);

  const reloadData = async () => {
    try {
      const [stockLevels, skuList, depositList] = await Promise.all([fetchStockLevels(), fetchSkus(), fetchDeposits()]);
      setStock(stockLevels);
      setSkus(skuList);
      setDeposits(depositList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos obtener datos. ¿Está levantado el backend?");
      setStock([]);
    }
  };

  const getUnit = (skuCode: string) => skus?.find((s) => s.code === skuCode)?.unit ?? "";

  const handleCreateSku = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createSku({ ...skuForm, notes: skuForm.notes || null });
      setSuccess("SKU creado correctamente");
      setSkuForm({ code: "", name: "", tag: "MP", unit: "kg", notes: "" });
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
      });
      setSuccess("Depósito creado correctamente");
      setDepositForm({ name: "", location: "", controls_lot: true });
      await reloadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos crear el depósito. ¿Nombre duplicado?");
    }
  };

  const handleCreateMovement = async (event: FormEvent) => {
    event.preventDefault();
    if (!movementForm.sku_id || !movementForm.deposit_id || !movementForm.quantity) {
      setError("Selecciona SKU, depósito y cantidad");
      return;
    }
    try {
      await createStockMovement({
        ...movementForm,
        sku_id: Number(movementForm.sku_id),
        deposit_id: Number(movementForm.deposit_id),
        quantity: Number(movementForm.quantity),
        reference: movementForm.reference || undefined,
        lot_code: movementForm.lot_code || undefined,
      });
      setSuccess("Movimiento registrado");
      setMovementForm({
        sku_id: "",
        deposit_id: "",
        movement_type: movementForm.movement_type,
        quantity: "",
        reference: "",
        lot_code: "",
      });
      await reloadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar el movimiento. Verifica saldo o datos.");
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <InventoryIcon color="primary" />
        Stock y kardex
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      <Grid container spacing={2}>
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
                  value={skuForm.tag}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, tag: e.target.value as SKUTag }))}
                >
                  <MenuItem value="MP">Materia Prima</MenuItem>
                  <MenuItem value="SEMI">Semielaborado</MenuItem>
                  <MenuItem value="PT">Producto Terminado</MenuItem>
                  <MenuItem value="CON">Consumible</MenuItem>
                </TextField>
                <TextField
                  label="Unidad de medida"
                  value={skuForm.unit}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, unit: e.target.value }))}
                />
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
                <Button type="submit" variant="contained">
                  Crear depósito
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Movimiento de stock" subheader="Ingresos, consumos, ajustes y remitos" />
            <Divider />
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={handleCreateMovement}>
                <TextField
                  select
                  required
                  label="SKU"
                  value={movementForm.sku_id}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, sku_id: e.target.value }))}
                  helperText={!skus?.length ? "Carga SKUs primero" : undefined}
                >
                  {skus?.map((sku) => (
                    <MenuItem key={sku.id} value={sku.id}>
                      {sku.code} · {sku.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  required
                  label="Depósito"
                  value={movementForm.deposit_id}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, deposit_id: e.target.value }))}
                  helperText={!deposits?.length ? "Crea un depósito primero" : undefined}
                >
                  {deposits?.map((deposit) => (
                    <MenuItem key={deposit.id} value={deposit.id}>
                      {deposit.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Tipo de movimiento"
                  value={movementForm.movement_type}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, movement_type: e.target.value as MovementType }))}
                >
                  <MenuItem value="production">Producción</MenuItem>
                  <MenuItem value="consumption">Consumo</MenuItem>
                  <MenuItem value="adjustment">Ajuste</MenuItem>
                  <MenuItem value="transfer">Transferencia</MenuItem>
                  <MenuItem value="remito">Remito</MenuItem>
                  <MenuItem value="merma">Merma</MenuItem>
                </TextField>
                <TextField
                  required
                  label="Cantidad"
                  type="number"
                  inputProps={{ step: "0.01" }}
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
                        label={row.quantity > 0 ? "En rango" : "Sin stock"}
                        color={row.quantity > 0 ? "success" : "warning"}
                        variant="outlined"
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