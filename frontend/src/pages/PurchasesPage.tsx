import LocalMallIcon from "@mui/icons-material/LocalMall";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createPurchaseReceipt,
  createSupplier,
  fetchDeposits,
  fetchPurchaseReceipts,
  fetchSkus,
  fetchSuppliers,
  fetchUnits,
  Deposit,
  PurchaseReceipt,
  SKU,
  Supplier,
  UnitOfMeasure,
} from "../lib/api";
import { SearchableSelect } from "../components/SearchableSelect";

type PurchaseItemForm = {
  sku_id: number | null;
  quantity: string;
  unit: UnitOfMeasure | "";
  lot_code: string;
  expiry_date: string;
  unit_cost: string;
};

export function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    tax_id: "",
    email: "",
    phone: "",
  });

  const [receiptForm, setReceiptForm] = useState({
    supplier_id: "",
    deposit_id: "",
    received_at: "",
    document_number: "",
    notes: "",
  });

  const [items, setItems] = useState<PurchaseItemForm[]>([
    { sku_id: null, quantity: "", unit: "", lot_code: "", expiry_date: "", unit_cost: "" },
  ]);

  const skuOptions = useMemo(
    () =>
      skus
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((sku) => ({
          value: sku.id,
          label: `${sku.name} (${sku.code})`,
          description: `Unidad: ${sku.unit}`,
        })),
    [skus],
  );

  const depositOptions = useMemo(
    () =>
      deposits
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((deposit) => ({
          value: deposit.id,
          label: deposit.name,
          description: deposit.location || undefined,
        })),
    [deposits],
  );

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [supplierList, skuList, depositList, unitList, receiptList] = await Promise.all([
        fetchSuppliers({ include_inactive: true }),
        fetchSkus(),
        fetchDeposits(),
        fetchUnits(),
        fetchPurchaseReceipts(),
      ]);
      setSuppliers(supplierList);
      setSkus(skuList);
      setDeposits(depositList);
      setUnits(unitList.map((unit) => unit.code));
      setReceipts(receiptList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar datos de compras. ¿Está levantado el backend?");
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { sku_id: null, quantity: "", unit: "", lot_code: "", expiry_date: "", unit_cost: "" },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, patch: Partial<PurchaseItemForm>) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const handleCreateSupplier = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createSupplier({
        name: supplierForm.name,
        tax_id: supplierForm.tax_id || null,
        email: supplierForm.email || null,
        phone: supplierForm.phone || null,
        is_active: true,
      });
      setSuccess("Proveedor creado correctamente");
      setSupplierForm({ name: "", tax_id: "", email: "", phone: "" });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos crear el proveedor. ¿Nombre duplicado?");
    }
  };

  const handleCreateReceipt = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!receiptForm.supplier_id || !receiptForm.deposit_id) {
      setError("Selecciona proveedor y depósito.");
      return;
    }
    if (!items.length || items.some((item) => !item.sku_id || !item.quantity || !item.unit)) {
      setError("Completa SKU, cantidad y unidad en cada ítem.");
      return;
    }
    try {
      await createPurchaseReceipt({
        supplier_id: Number(receiptForm.supplier_id),
        deposit_id: Number(receiptForm.deposit_id),
        received_at: receiptForm.received_at || null,
        document_number: receiptForm.document_number || null,
        notes: receiptForm.notes || null,
        items: items.map((item) => ({
          sku_id: Number(item.sku_id),
          quantity: Number(item.quantity),
          unit: item.unit as UnitOfMeasure,
          lot_code: item.lot_code || null,
          expiry_date: item.expiry_date || null,
          unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
        })),
      });
      setSuccess("Ingreso de compra registrado");
      setReceiptForm({
        supplier_id: "",
        deposit_id: "",
        received_at: "",
        document_number: "",
        notes: "",
      });
      setItems([{ sku_id: null, quantity: "", unit: "", lot_code: "", expiry_date: "", unit_cost: "" }]);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar la compra. Verifica los datos.");
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalMallIcon color="primary" />
        Compras e ingresos de proveedor
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
            <CardHeader title="Alta de proveedor" subheader="Datos básicos de contacto" />
            <Divider />
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={handleCreateSupplier}>
                <TextField
                  required
                  label="Nombre"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <TextField
                  label="CUIT / Tax ID"
                  value={supplierForm.tax_id}
                  onChange={(e) => setSupplierForm((prev) => ({ ...prev, tax_id: e.target.value }))}
                />
                <TextField
                  label="Email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <TextField
                  label="Teléfono"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <Button type="submit" variant="contained">
                  Crear proveedor
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Ingreso de compra" subheader="Proveedor, depósito y líneas" />
            <Divider />
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={handleCreateReceipt}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Proveedor"
                      value={receiptForm.supplier_id}
                      onChange={(e) => setReceiptForm((prev) => ({ ...prev, supplier_id: e.target.value }))}
                      fullWidth
                      required
                    >
                      <MenuItem value="">Seleccionar</MenuItem>
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <SearchableSelect
                      label="Depósito"
                      required
                      options={depositOptions}
                      value={receiptForm.deposit_id ? Number(receiptForm.deposit_id) : null}
                      onChange={(value) => setReceiptForm((prev) => ({ ...prev, deposit_id: value ? String(value) : "" }))}
                      helperText={!deposits.length ? "Crea un depósito primero" : undefined}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Fecha recepción"
                      type="date"
                      value={receiptForm.received_at}
                      onChange={(e) => setReceiptForm((prev) => ({ ...prev, received_at: e.target.value }))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Documento"
                      value={receiptForm.document_number}
                      onChange={(e) => setReceiptForm((prev) => ({ ...prev, document_number: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      label="Notas"
                      value={receiptForm.notes}
                      onChange={(e) => setReceiptForm((prev) => ({ ...prev, notes: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Divider />
                <Typography variant="subtitle1">Ítems de compra</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Unidad</TableCell>
                      <TableCell>Lote</TableCell>
                      <TableCell>Vencimiento</TableCell>
                      <TableCell>Costo</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={`item-${index}`}>
                        <TableCell sx={{ minWidth: 220 }}>
                          <SearchableSelect
                            label="SKU"
                            options={skuOptions}
                            value={item.sku_id}
                            onChange={(value) => updateItem(index, { sku_id: value })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: e.target.value })}
                            inputProps={{ min: 0, step: "0.01" }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            value={item.unit}
                            onChange={(e) => updateItem(index, { unit: e.target.value as UnitOfMeasure })}
                          >
                            <MenuItem value="">Seleccionar</MenuItem>
                            {units.map((unit) => (
                              <MenuItem key={unit} value={unit}>
                                {unit}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={item.lot_code}
                            onChange={(e) => updateItem(index, { lot_code: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => updateItem(index, { expiry_date: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) => updateItem(index, { unit_cost: e.target.value })}
                            inputProps={{ min: 0, step: "0.01" }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length === 1}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Stack direction="row" spacing={1} justifyContent="space-between">
                  <Button variant="outlined" onClick={handleAddItem}>
                    Agregar ítem
                  </Button>
                  <Button type="submit" variant="contained">
                    Registrar compra
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Ingresos recientes" subheader="Últimos ingresos registrados" />
            <Divider />
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Depósito</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell align="right">Ítems</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{receipt.supplier_name ?? receipt.supplier_id}</TableCell>
                      <TableCell>{receipt.deposit_name ?? receipt.deposit_id}</TableCell>
                      <TableCell>{receipt.received_at}</TableCell>
                      <TableCell>{receipt.document_number ?? "—"}</TableCell>
                      <TableCell align="right">{receipt.items.length}</TableCell>
                    </TableRow>
                  ))}
                  {receipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Sin ingresos registrados todavía.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
