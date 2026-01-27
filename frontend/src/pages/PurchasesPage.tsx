import LocalMallIcon from "@mui/icons-material/LocalMall";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from "react";

import {
  createPurchaseReceipt,
  createSupplier,
  fetchDeposits,
  fetchPurchaseReceipts,
  fetchSkus,
  fetchSuppliers,
  fetchUnits,
  updateSupplier,
  Deposit,
  PurchaseReceipt,
  SKU,
  Supplier,
  UnitOfMeasure,
} from "../lib/api";
import { SearchableSelect } from "../components/SearchableSelect";

type SupplierForm = {
  id?: number;
  name: string;
  tax_id: string;
  email: string;
  phone: string;
  is_active: boolean;
};

type PurchaseItemForm = {
  sku_id: number | null;
  quantity: string;
  unit: UnitOfMeasure | "";
  lot_code: string;
  expiry_date: string;
  unit_cost: string;
};

export function PurchasesPage() {
  const [tab, setTab] = useState<"compras" | "proveedores">("compras");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [expandedReceiptId, setExpandedReceiptId] = useState<number | null>(null);
  const [supplierHistory, setSupplierHistory] = useState<PurchaseReceipt[]>([]);
  const [supplierHistoryLoading, setSupplierHistoryLoading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [supplierForm, setSupplierForm] = useState<SupplierForm>({
    name: "",
    tax_id: "",
    email: "",
    phone: "",
    is_active: true,
  });
  const supplierNameRef = useRef<HTMLInputElement>(null);
  const supplierFormRef = useRef<HTMLDivElement>(null);

  const [receiptForm, setReceiptForm] = useState({
    supplier_id: "",
    deposit_id: "",
    received_at: "",
    document_number: "",
    notes: "",
  });

  const [receiptFilters, setReceiptFilters] = useState({
    supplier_id: "",
    date_from: "",
    date_to: "",
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

  useEffect(() => {
    if (!supplierForm.id) {
      return;
    }
    supplierFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => supplierNameRef.current?.focus(), 100);
  }, [supplierForm.id]);

  const loadData = async () => {
    try {
      const [supplierList, skuList, depositList, unitList] = await Promise.all([
        fetchSuppliers({ include_inactive: true }),
        fetchSkus(),
        fetchDeposits(),
        fetchUnits(),
      ]);
      setSuppliers(supplierList);
      setSkus(skuList);
      setDeposits(depositList);
      setUnits(unitList.map((unit) => unit.code));
      await loadReceipts();
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar datos de compras. ¿Está levantado el backend?");
    }
  };

  const loadReceipts = async (params?: { supplier_id?: number; date_from?: string; date_to?: string }) => {
    const receiptList = await fetchPurchaseReceipts(params);
    setReceipts(receiptList);
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
      if (supplierForm.id) {
        await updateSupplier(supplierForm.id, {
          name: supplierForm.name,
          tax_id: supplierForm.tax_id || null,
          email: supplierForm.email || null,
          phone: supplierForm.phone || null,
          is_active: supplierForm.is_active,
        });
        setSuccess("Proveedor actualizado correctamente");
      } else {
        await createSupplier({
          name: supplierForm.name,
          tax_id: supplierForm.tax_id || null,
          email: supplierForm.email || null,
          phone: supplierForm.phone || null,
          is_active: supplierForm.is_active,
        });
        setSuccess("Proveedor creado correctamente");
      }
      setSupplierForm({ name: "", tax_id: "", email: "", phone: "", is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el proveedor. ¿Nombre duplicado?");
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

  const handleReceiptFilter = async () => {
    try {
      setError(null);
      await loadReceipts({
        supplier_id: receiptFilters.supplier_id ? Number(receiptFilters.supplier_id) : undefined,
        date_from: receiptFilters.date_from || undefined,
        date_to: receiptFilters.date_to || undefined,
      });
    } catch (err) {
      console.error(err);
      setError("No pudimos aplicar los filtros.");
    }
  };

  const handleResetFilters = async () => {
    setReceiptFilters({ supplier_id: "", date_from: "", date_to: "" });
    await loadReceipts();
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSupplierForm({
      id: supplier.id,
      name: supplier.name,
      tax_id: supplier.tax_id ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      is_active: supplier.is_active,
    });
    setTab("proveedores");
  };

  const handleToggleSupplier = async (supplier: Supplier) => {
    try {
      await updateSupplier(supplier.id, { is_active: !supplier.is_active });
      setSuccess(`Proveedor ${supplier.is_active ? "desactivado" : "activado"} correctamente`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos actualizar el estado del proveedor.");
    }
  };

  const handleSupplierHistory = async (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    setSupplierHistoryLoading(true);
    try {
      const data = await fetchPurchaseReceipts({ supplier_id: supplierId });
      setSupplierHistory(data);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar el historial del proveedor.");
    } finally {
      setSupplierHistoryLoading(false);
    }
  };

  const receiptTotals = useMemo(() => {
    const totalItems = receipts.reduce((acc, receipt) => acc + receipt.items.length, 0);
    const totalCost = receipts.reduce(
      (acc, receipt) =>
        acc +
        receipt.items.reduce((itemAcc, item) => itemAcc + (item.unit_cost ? item.unit_cost * item.quantity : 0), 0),
      0,
    );
    return { totalItems, totalCost };
  }, [receipts]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LocalMallIcon color="primary" />
        Compras e ingresos de proveedor
      </Typography>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab value="compras" label="Compras" />
        <Tab value="proveedores" label="Proveedores" />
      </Tabs>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {tab === "compras" && (
        <Grid container spacing={2}>
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
                          <MenuItem key={supplier.id} value={supplier.id} disabled={!supplier.is_active}>
                            {supplier.name}
                            {!supplier.is_active ? " (inactivo)" : ""}
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
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Card>
                <CardHeader title="Filtros" subheader="Acota el historial de ingresos" />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Proveedor"
                      value={receiptFilters.supplier_id}
                      onChange={(e) => setReceiptFilters((prev) => ({ ...prev, supplier_id: e.target.value }))}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Desde"
                      type="date"
                      value={receiptFilters.date_from}
                      onChange={(e) => setReceiptFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Hasta"
                      type="date"
                      value={receiptFilters.date_to}
                      onChange={(e) => setReceiptFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" onClick={handleReceiptFilter}>
                        Aplicar
                      </Button>
                      <Button variant="text" onClick={handleResetFilters}>
                        Limpiar
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Totales" subheader="Resumen del período filtrado" />
                <Divider />
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="body2">Ingresos: {receipts.length}</Typography>
                    <Typography variant="body2">Ítems totales: {receiptTotals.totalItems}</Typography>
                    <Typography variant="body2">
                      Costo estimado: ${receiptTotals.totalCost.toFixed(2)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Ingresos recientes" subheader="Últimos ingresos registrados" />
              <Divider />
              <CardContent>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Proveedor</TableCell>
                      <TableCell>Depósito</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Documento</TableCell>
                      <TableCell align="right">Ítems</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <Fragment key={receipt.id}>
                        <TableRow key={receipt.id} hover>
                          <TableCell width={48}>
                            <Tooltip title={expandedReceiptId === receipt.id ? "Ocultar detalle" : "Ver detalle"}>
                              <IconButton
                                size="small"
                                onClick={() => setExpandedReceiptId((prev) => (prev === receipt.id ? null : receipt.id))}
                              >
                                {expandedReceiptId === receipt.id ? (
                                  <ExpandLessIcon fontSize="small" />
                                ) : (
                                  <ExpandMoreIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{receipt.supplier_name ?? receipt.supplier_id}</TableCell>
                          <TableCell>{receipt.deposit_name ?? receipt.deposit_id}</TableCell>
                          <TableCell>{receipt.received_at}</TableCell>
                          <TableCell>{receipt.document_number ?? "—"}</TableCell>
                          <TableCell align="right">{receipt.items.length}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 0 }}>
                            <Collapse in={expandedReceiptId === receipt.id} timeout="auto" unmountOnExit>
                              <Stack spacing={1} sx={{ py: 2 }}>
                                <Typography variant="subtitle2">Detalle de ítems</Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>SKU</TableCell>
                                      <TableCell>Cantidad</TableCell>
                                      <TableCell>Unidad</TableCell>
                                      <TableCell>Lote</TableCell>
                                      <TableCell>Vencimiento</TableCell>
                                      <TableCell align="right">Costo</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {receipt.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>{item.sku_name}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>{item.lot_code ?? "—"}</TableCell>
                                        <TableCell>{item.expiry_date ?? "—"}</TableCell>
                                        <TableCell align="right">
                                          {item.unit_cost ? `$${item.unit_cost.toFixed(2)}` : "—"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Stack>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))}
                    {receipts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
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
      )}
      {tab === "proveedores" && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Card ref={supplierFormRef}>
              <CardHeader
                title={supplierForm.id ? `Editar proveedor #${supplierForm.id}` : "Alta de proveedor"}
                subheader="Datos básicos de contacto"
              />
              <Divider />
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={handleCreateSupplier}>
                  <TextField
                    required
                    label="Nombre"
                    value={supplierForm.name}
                    inputRef={supplierNameRef}
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
                  <TextField
                    select
                    label="Estado"
                    value={supplierForm.is_active ? "activo" : "inactivo"}
                    onChange={(e) =>
                      setSupplierForm((prev) => ({ ...prev, is_active: e.target.value === "activo" }))
                    }
                  >
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="inactivo">Inactivo</MenuItem>
                  </TextField>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained">
                      {supplierForm.id ? "Guardar cambios" : "Crear proveedor"}
                    </Button>
                    {supplierForm.id && (
                      <Button
                        variant="text"
                        onClick={() =>
                          setSupplierForm({ name: "", tax_id: "", email: "", phone: "", is_active: true })
                        }
                      >
                        Cancelar edición
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card>
              <CardHeader title="Listado de proveedores" subheader="Gestiona altas, modificaciones y estado" />
              <Divider />
              <CardContent>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Proveedor</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <Fragment key={supplier.id}>
                        <TableRow hover>
                          <TableCell width={48}>
                            <Tooltip title={expandedSuppliers[supplier.id] ? "Ocultar detalle" : "Ver detalle"}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setExpandedSuppliers((prev) => ({ ...prev, [supplier.id]: !prev[supplier.id] }))
                                }
                              >
                                {expandedSuppliers[supplier.id] ? (
                                  <ExpandLessIcon fontSize="small" />
                                ) : (
                                  <ExpandMoreIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.is_active ? "Activo" : "Inactivo"}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => handleEditSupplier(supplier)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Button size="small" onClick={() => handleSupplierHistory(supplier.id)}>
                              Historial
                            </Button>
                            <Button size="small" onClick={() => handleToggleSupplier(supplier)}>
                              {supplier.is_active ? "Desactivar" : "Activar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={4} sx={{ py: 0 }}>
                            <Collapse in={expandedSuppliers[supplier.id]} timeout="auto" unmountOnExit>
                              <Stack spacing={1} sx={{ py: 2 }}>
                                <Typography variant="subtitle2">Detalle de contacto</Typography>
                                <Typography variant="body2">CUIT / Tax ID: {supplier.tax_id ?? "—"}</Typography>
                                <Typography variant="body2">Email: {supplier.email ?? "—"}</Typography>
                                <Typography variant="body2">Teléfono: {supplier.phone ?? "—"}</Typography>
                              </Stack>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card sx={{ mt: 2 }}>
              <CardHeader
                title="Historial de compras"
                subheader={
                  selectedSupplierId
                    ? `Ingresos registrados para proveedor #${selectedSupplierId}`
                    : "Selecciona un proveedor para ver el historial"
                }
              />
              <Divider />
              <CardContent>
                {supplierHistoryLoading && <Typography variant="body2">Cargando historial...</Typography>}
                {!supplierHistoryLoading && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Depósito</TableCell>
                        <TableCell>Documento</TableCell>
                        <TableCell align="right">Ítems</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {supplierHistory.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell>{receipt.received_at}</TableCell>
                          <TableCell>{receipt.deposit_name ?? receipt.deposit_id}</TableCell>
                          <TableCell>{receipt.document_number ?? "—"}</TableCell>
                          <TableCell align="right">{receipt.items.length}</TableCell>
                        </TableRow>
                      ))}
                      {supplierHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            Sin ingresos registrados para este proveedor.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}
