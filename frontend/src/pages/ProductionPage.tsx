import ManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import {
  Alert,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AddCircleOutline, DeleteForever } from "@mui/icons-material";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "../components/SearchableSelect";
import {
  createRecipe,
  createStockMovement,
  createDailyOverhead,
  DailyOverhead,
  DailyOverheadAllocationMethod,
  DailyOverheadAllocationRow,
  fetchDailyOverheadAllocations,
  fetchDailyOverheads,
  Deposit,
  fetchDeposits,
  fetchProductionLines,
  fetchRecipes,
  fetchSkus,
  fetchStockMovementTypes,
  ProductionLine,
  Recipe,
  SKU,
  StockMovementType,
  updateDailyOverhead,
} from "../lib/api";

const PRODUCTION_TYPE_CODES: string[] = ["PT", "SEMI", "MP"];
type RecipeFormItem = { component_id: number | null; quantity: string };

export function ProductionPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [movementTypes, setMovementTypes] = useState<StockMovementType[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"production" | "overheads">("production");

  const [overheadDate, setOverheadDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyOverhead, setDailyOverhead] = useState<DailyOverhead | null>(null);
  const [overheadForm, setOverheadForm] = useState({
    energy_cost: "0",
    gas_cost: "0",
    allocation_method: "units" as DailyOverheadAllocationMethod,
    notes: "",
  });
  const [overheadLoading, setOverheadLoading] = useState(false);
  const [overheadSaving, setOverheadSaving] = useState(false);
  const [overheadError, setOverheadError] = useState<string | null>(null);
  const [overheadSuccess, setOverheadSuccess] = useState<string | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<DailyOverheadAllocationRow[]>([]);
  const [allocationMessage, setAllocationMessage] = useState<string | null>(null);

  const [recipeForm, setRecipeForm] = useState<{
    product_id: number | null;
    name: string;
    items: RecipeFormItem[];
  }>({
    product_id: null,
    name: "",
    items: [
      { component_id: null, quantity: "" },
      { component_id: null, quantity: "" },
    ],
  });

  const [productionForm, setProductionForm] = useState({
    product_sku_id: null as number | null,
    deposit_id: null as number | null,
    production_line_id: null as number | null,
    lot_code: "",
    quantity: "",
    reference: "",
  });

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);
  const sortedDeposits = useMemo(() => [...deposits].sort((a, b) => a.name.localeCompare(b.name)), [deposits]);
  const productionSkus = useMemo(
    () => sortedSkus.filter((sku) => PRODUCTION_TYPE_CODES.includes(sku.sku_type_code)),
    [sortedSkus]
  );
  const productOptions = useMemo(
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
  const componentOptions = useMemo(
    () =>
      sortedSkus.map((sku) => ({
        value: sku.id,
        label: `${sku.name} (${sku.code})`,
      })),
    [sortedSkus]
  );
  const selectedProductionProduct = productionSkus.find((sku) => sku.id === productionForm.product_sku_id) ?? null;
  const selectedProductionRecipe = useMemo(
    () => recipes.find((recipe) => recipe.product_id === productionForm.product_sku_id) ?? null,
    [productionForm.product_sku_id, recipes]
  );
  const productionQuantityNumber = useMemo(
    () => (productionForm.quantity ? Number(productionForm.quantity) : 0),
    [productionForm.quantity]
  );

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    void loadDailyOverhead(overheadDate);
  }, [overheadDate]);

  const loadData = async () => {
    try {
      const [skuList, depositList, recipeList, movementTypeList, productionLineList] = await Promise.all([
        fetchSkus({ tags: PRODUCTION_TYPE_CODES }),
        fetchDeposits(),
        fetchRecipes(),
        fetchStockMovementTypes({ include_inactive: true }),
        fetchProductionLines(),
      ]);
      setSkus(skuList);
      setDeposits(depositList);
      setRecipes(recipeList);
      setMovementTypes(movementTypeList);
      setProductionLines(productionLineList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar catálogo y recetas. ¿Está levantado el backend?");
    }
  };

  const loadDailyOverhead = async (dateValue: string) => {
    setOverheadLoading(true);
    setOverheadError(null);
    setOverheadSuccess(null);
    try {
      const records = await fetchDailyOverheads({ date_from: dateValue, date_to: dateValue });
      if (records.length > 0) {
        const record = records[0];
        setDailyOverhead(record);
        setOverheadForm({
          energy_cost: record.energy_cost.toString(),
          gas_cost: record.gas_cost.toString(),
          allocation_method: record.allocation_method,
          notes: record.notes ?? "",
        });
        await loadAllocations(record.id);
      } else {
        setDailyOverhead(null);
        setOverheadForm({ energy_cost: "0", gas_cost: "0", allocation_method: "units", notes: "" });
        setAllocations([]);
        setAllocationMessage(null);
      }
    } catch (err) {
      console.error(err);
      setOverheadError("No pudimos cargar los costos indirectos.");
    } finally {
      setOverheadLoading(false);
    }
  };

  const loadAllocations = async (overheadId: number) => {
    setAllocationLoading(true);
    setAllocationError(null);
    setAllocationMessage(null);
    try {
      const response = await fetchDailyOverheadAllocations(overheadId);
      setAllocations(response.items);
      setAllocationMessage(response.message ?? null);
    } catch (err) {
      console.error(err);
      setAllocationError("No pudimos cargar la asignación de costos.");
      setAllocations([]);
    } finally {
      setAllocationLoading(false);
    }
  };

  const getSkuLabel = (id: number) => {
    const sku = skus.find((s) => s.id === id);
    return sku ? `${sku.name} (${sku.code})` : `SKU ${id}`;
  };

  const unitLabels: Record<string, string> = {
    unit: "Unidad",
    kg: "Kilogramo",
    g: "Gramo",
    l: "Litro",
    ml: "Mililitro",
    pack: "Pack",
    box: "Caja",
    m: "Metro",
    cm: "Centímetro",
  };
  const unitBadges: Record<string, string> = {
    unit: "UN",
    kg: "KG",
    g: "G",
    l: "L",
    ml: "ML",
    pack: "PACK",
    box: "CAJA",
    m: "M",
    cm: "CM",
  };

  const getComponentUnit = (componentId: number | null) => {
    if (!componentId) return "";
    const sku = skus.find((s) => s.id === componentId);
    if (!sku) return "";
    const preferredUnit = sku.sku_type_code === "SEMI" ? sku.secondary_unit ?? "unit" : sku.unit;
    return unitLabels[preferredUnit] ?? preferredUnit;
  };

  const handleRecipeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipeForm.product_id || recipeForm.items.some((item) => !item.component_id || !item.quantity)) {
      setError("Completa producto y componentes");
      return;
    }
    try {
      const recipeName = recipeForm.name || getSkuLabel(recipeForm.product_id);
      await createRecipe({
        product_id: recipeForm.product_id,
        name: recipeName,
	is_active: true,
        items: recipeForm.items.map((item) => ({
          component_id: Number(item.component_id),
          quantity: Number(item.quantity),
        })),
      });
      setSuccess("Receta creada");
      setRecipeForm({
        product_id: null,
        name: "",
        items: [
          { component_id: null, quantity: "" },
          { component_id: null, quantity: "" },
        ],
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos crear la receta. Revisa duplicados o componentes.");
    }
  };

  const handleProductionSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!productionForm.product_sku_id || !productionForm.deposit_id || !productionForm.production_line_id || !productionForm.quantity) {
      setError("Selecciona SKU, depósito, línea y cantidad para registrar la producción");
      return;
    }
    const productionMovementType = movementTypes.find((type) => type.code === "PRODUCTION" && type.is_active);
    if (!productionMovementType) {
      setError("Configura el tipo de movimiento PRODUCTION en catálogos");
      return;
    }
    try {
      const productSku = skus.find((s) => s.id === Number(productionForm.product_sku_id));
      const unit = productSku?.sku_type_code === "SEMI" ? "kg" : productSku?.unit;
      await createStockMovement({
        sku_id: Number(productionForm.product_sku_id),
        deposit_id: Number(productionForm.deposit_id),
        production_line_id: Number(productionForm.production_line_id),
        quantity: Number(productionForm.quantity),
        movement_type_id: productionMovementType.id,
        unit: unit,
        lot_code: productionForm.lot_code.trim() || undefined,
        reference: productionForm.reference || "Orden de producción",
      });
      setSuccess("Producción registrada en stock");
      setProductionForm({ product_sku_id: null, deposit_id: null, production_line_id: null, lot_code: "", quantity: "", reference: "" });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar la producción. Verifica datos o saldo.");
    }
  };

  const handleOverheadSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setOverheadError(null);
    setOverheadSuccess(null);
    setAllocationError(null);

    if (!overheadDate) {
      setOverheadError("La fecha es obligatoria.");
      return;
    }
    const energyCost = Number(overheadForm.energy_cost);
    const gasCost = Number(overheadForm.gas_cost);
    if (Number.isNaN(energyCost) || Number.isNaN(gasCost) || energyCost < 0 || gasCost < 0) {
      setOverheadError("Los costos deben ser numéricos y mayores o iguales a cero.");
      return;
    }

    const payload = {
      date: overheadDate,
      energy_cost: energyCost,
      gas_cost: gasCost,
      allocation_method: overheadForm.allocation_method,
      notes: overheadForm.notes.trim() || null,
    };

    setOverheadSaving(true);
    try {
      let saved: DailyOverhead;
      if (dailyOverhead?.id) {
        saved = await updateDailyOverhead(dailyOverhead.id, payload);
        setOverheadSuccess("Costos indirectos actualizados.");
      } else {
        saved = await createDailyOverhead(payload);
        setOverheadSuccess("Costos indirectos guardados.");
      }
      setDailyOverhead(saved);
      setOverheadForm({
        energy_cost: saved.energy_cost.toString(),
        gas_cost: saved.gas_cost.toString(),
        allocation_method: saved.allocation_method,
        notes: saved.notes ?? "",
      });
      await loadAllocations(saved.id);
    } catch (err) {
      console.error(err);
      setOverheadError("No pudimos guardar los costos indirectos.");
    } finally {
      setOverheadSaving(false);
    }
  };

  const handleItemChange = (index: number, field: "component_id" | "quantity", value: string | number | null) => {
    setRecipeForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addComponentRow = () => {
    setRecipeForm((prev) => ({ ...prev, items: [...prev.items, { component_id: null, quantity: "" }] }));
  };

  const removeComponentRow = (index: number) => {
    setRecipeForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const productionUnitCode: string | undefined = useMemo(() => {
    if (!selectedProductionProduct) return undefined;
    return selectedProductionProduct.sku_type_code === "SEMI"
      ? "kg"
      : selectedProductionProduct.unit ?? selectedProductionProduct.secondary_unit ?? selectedProductionProduct.unit;
  }, [selectedProductionProduct]);

  const productionUnitLabel = productionUnitCode ? unitLabels[productionUnitCode] ?? productionUnitCode.toUpperCase() : undefined;
  const productionUnitBadge = productionUnitCode ? unitBadges[productionUnitCode] ?? productionUnitCode.toUpperCase() : undefined;
  const overheadTotalCost = useMemo(() => {
    const energyCost = Number(overheadForm.energy_cost);
    const gasCost = Number(overheadForm.gas_cost);
    return (Number.isFinite(energyCost) ? energyCost : 0) + (Number.isFinite(gasCost) ? gasCost : 0);
  }, [overheadForm.energy_cost, overheadForm.gas_cost]);
  const allocationMethod = dailyOverhead?.allocation_method ?? overheadForm.allocation_method;
  const isWeightedAllocation = allocationMethod === "weighted_units";

  const computedComponents = useMemo(() => {
    if (!selectedProductionRecipe || !selectedProductionProduct || productionQuantityNumber <= 0) return [];
    return selectedProductionRecipe.items.map((item) => {
      const component = skus.find((s) => s.id === item.component_id);
      const componentType = component?.sku_type_label ?? component?.sku_type_code ?? "Componente";
      const componentUnitCode =
        item.component_unit ??
        (component?.sku_type_code === "SEMI" ? component?.secondary_unit ?? "unit" : component?.unit ?? "unit");
      const requiredQuantity = productionQuantityNumber * item.quantity;
      return {
        id: item.component_id,
        name: component ? `${component.name} (${component.code})` : `SKU ${item.component_id}`,
        type: componentType,
        unitCode: componentUnitCode,
        unitLabel: unitLabels[componentUnitCode ?? ""] ?? componentUnitCode ?? "",
        quantity: requiredQuantity,
      };
    });
  }, [productionQuantityNumber, selectedProductionProduct, selectedProductionRecipe, skus, unitLabels]);

  const formatQuantity = (value: number) =>
    new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3, minimumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ManufacturingIcon color="primary" />
        Producción en curso
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab value="production" label="Producción" />
        <Tab value="overheads" label="Costos indirectos" />
      </Tabs>

      {tab === "production" && (
        <>
          <Stack spacing={2}>
            <Card>
              <CardHeader title="Registrar producción" subheader="Suma stock de PT o SEMI en un depósito" />
              <Divider />
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={handleProductionSubmit}>
                  <SearchableSelect
                    label="Producto"
                    required
                    options={productOptions}
                    value={productionForm.product_sku_id}
                    onChange={(value) => setProductionForm((prev) => ({ ...prev, product_sku_id: value }))}
                    helperText="Selecciona el SKU producido"
                  />
                  {selectedProductionProduct?.sku_type_code === "SEMI" && (
                    <Typography variant="caption" color="text.secondary">
                      SEMI base: kg. Equivalencia: {selectedProductionProduct.units_per_kg ?? 1} un = 1 kg
                    </Typography>
                  )}
                  <SearchableSelect
                    label="Depósito de entrada"
                    required
                    options={depositOptions}
                    value={productionForm.deposit_id}
                    onChange={(value) => setProductionForm((prev) => ({ ...prev, deposit_id: value }))}
                  />
                  <SearchableSelect
                    label="Línea de producción"
                    required
                    options={productionLineOptions}
                    value={productionForm.production_line_id}
                    onChange={(value) => setProductionForm((prev) => ({ ...prev, production_line_id: value }))}
                    helperText="Obligatorio para registrar un lote de producción"
                  />
                  <TextField
                    label="Lote (opcional)"
                    placeholder="YYMMDD-Lx-SKU-###"
                    value={productionForm.lot_code}
                    onChange={(e) => setProductionForm((prev) => ({ ...prev, lot_code: e.target.value }))}
                    helperText="Si lo dejas vacío, el sistema lo generará"
                  />
                  <TextField
                    required
                    label="Cantidad producida"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    value={productionForm.quantity}
                    onChange={(e) => setProductionForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    InputProps={
                      productionUnitBadge
                        ? {
                            endAdornment: (
                              <InputAdornment position="end">
                                <Chip size="small" color="primary" label={productionUnitBadge} />
                              </InputAdornment>
                            ),
                          }
                        : undefined
                    }
                    helperText={productionUnitLabel ? `Unidad del producto: ${productionUnitLabel}` : undefined}
                  />
                  {selectedProductionProduct && (
                    <Card variant="outlined" sx={{ bgcolor: "grey.50" }}>
                      <CardHeader
                        titleTypographyProps={{ variant: "subtitle1" }}
                        title="Componentes necesarios para esta producción"
                        subheader={
                          selectedProductionRecipe
                            ? "Cálculo automático según la receta del SKU seleccionado"
                            : "No hay receta cargada para este SKU"
                        }
                      />
                      {selectedProductionRecipe && computedComponents.length > 0 && (
                        <CardContent sx={{ pt: 0 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Componente</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Unidad</TableCell>
                                <TableCell align="right">Cantidad requerida</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {computedComponents.map((component) => (
                                <TableRow key={component.id}>
                                  <TableCell>{component.name}</TableCell>
                                  <TableCell>{component.type}</TableCell>
                                  <TableCell>{component.unitLabel}</TableCell>
                                  <TableCell align="right">
                                    <Chip size="small" label={`${formatQuantity(component.quantity)} ${unitBadges[component.unitCode ?? ""] ?? ""}`} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      )}
                    </Card>
                  )}
                  <TextField
                    label="Referencia / Orden"
                    value={productionForm.reference}
                    onChange={(e) => setProductionForm((prev) => ({ ...prev, reference: e.target.value }))}
                  />
                  <Button type="submit" variant="contained">
                    Registrar producción
                  </Button>
                </Stack>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Definir receta" subheader="SKU producido y componentes requeridos" />
              <Divider />
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={handleRecipeSubmit}>
                  <SearchableSelect
                    label="Producto final"
                    required
                    options={productOptions}
                    value={recipeForm.product_id}
                    onChange={(value) => setRecipeForm((prev) => ({ ...prev, product_id: value }))}
                  />
                  <TextField
                    label="Nombre de receta"
                    placeholder="Si lo dejas vacío usamos el nombre del SKU"
                    value={recipeForm.name}
                    onChange={(e) => setRecipeForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Componentes</Typography>
                    {recipeForm.items.map((item, index) => (
                      <Stack key={index} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                          <SearchableSelect
                            label="Componente"
                            required
                            options={componentOptions}
                            value={item.component_id}
                            onChange={(value) => handleItemChange(index, "component_id", value)}
                          />
                        </Box>
                        <TextField label="Unidad" value={getComponentUnit(item.component_id)} sx={{ width: 140 }} InputProps={{ readOnly: true }} />
                        <TextField
                          required
                          label="Cantidad"
                          type="number"
                          inputProps={{ step: "0.01" }}
                          sx={{ width: 140 }}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        />
                        <Tooltip title="Eliminar componente">
                          <IconButton color="error" onClick={() => removeComponentRow(index)} disabled={recipeForm.items.length <= 1}>
                            <DeleteForever />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ))}
                    <Button startIcon={<AddCircleOutline />} onClick={addComponentRow}>
                      Agregar componente
                    </Button>
                  </Stack>
                  <Button type="submit" variant="contained">
                    Guardar receta
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
          <Card variant="outlined">
            <CardHeader title="Recetas registradas" subheader="Componentes por producto" />
            <Divider />
            <CardContent>
              {recipes.length === 0 && <Alert severity="info">Aún no hay recetas cargadas.</Alert>}
              {recipes.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell>Receta</TableCell>
                      <TableCell>Componentes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recipes.map((recipe) => (
                      <TableRow key={recipe.id}>
                        <TableCell>{getSkuLabel(recipe.product_id)}</TableCell>
                        <TableCell>{recipe.name}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {recipe.items.map((item, idx) => (
                              <Chip
                                key={`${recipe.id}-${idx}`}
                                label={`${getSkuLabel(item.component_id)} · ${item.quantity} ${
                                  item.component_unit ? unitLabels[item.component_unit] ?? item.component_unit : getComponentUnit(item.component_id ?? null)
                                }`}
                              />
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "overheads" && (
        <Stack spacing={2}>
          <Card>
            <CardHeader title="Costos indirectos diarios" subheader="Carga posterior a la producción (UTE / Gas)" />
            <Divider />
            <CardContent>
              {overheadError && <Alert severity="warning" sx={{ mb: 2 }}>{overheadError}</Alert>}
              {overheadSuccess && (
                <Alert severity="success" onClose={() => setOverheadSuccess(null)} sx={{ mb: 2 }}>
                  {overheadSuccess}
                </Alert>
              )}
              {overheadLoading && <Alert severity="info" sx={{ mb: 2 }}>Cargando costos indirectos...</Alert>}
              <Stack component="form" spacing={2} onSubmit={handleOverheadSubmit}>
                <TextField
                  label="Fecha"
                  type="date"
                  required
                  value={overheadDate}
                  onChange={(e) => setOverheadDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                  <TextField
                    label="Costo energía"
                    type="number"
                    inputProps={{ min: 0, step: "0.01" }}
                    value={overheadForm.energy_cost}
                    onChange={(e) => setOverheadForm((prev) => ({ ...prev, energy_cost: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                  <TextField
                    label="Costo gas"
                    type="number"
                    inputProps={{ min: 0, step: "0.01" }}
                    value={overheadForm.gas_cost}
                    onChange={(e) => setOverheadForm((prev) => ({ ...prev, gas_cost: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                </Stack>
                <TextField
                  select
                  label="Método de prorrateo"
                  value={overheadForm.allocation_method}
                  onChange={(e) =>
                    setOverheadForm((prev) => ({ ...prev, allocation_method: e.target.value as DailyOverheadAllocationMethod }))
                  }
                >
                  <MenuItem value="units">Por unidades</MenuItem>
                  <MenuItem value="weighted_units">Por unidades ponderadas</MenuItem>
                </TextField>
                <TextField
                  label="Notas (opcional)"
                  multiline
                  minRows={2}
                  value={overheadForm.notes}
                  onChange={(e) => setOverheadForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Button type="submit" variant="contained" disabled={overheadSaving || overheadLoading}>
                    {dailyOverhead ? "Actualizar" : "Guardar"}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Total del día: {formatCurrency(overheadTotalCost)}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardHeader title="Asignación por producto" subheader="Prorrateo según producción del día" />
            <Divider />
            <CardContent>
              {allocationError && <Alert severity="warning" sx={{ mb: 2 }}>{allocationError}</Alert>}
              {allocationLoading && <Alert severity="info" sx={{ mb: 2 }}>Cargando asignación...</Alert>}
              {!allocationLoading && allocationMessage && <Alert severity="info" sx={{ mb: 2 }}>{allocationMessage}</Alert>}
              {!allocationLoading && !allocationMessage && allocations.length === 0 && !dailyOverhead && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Guardá el registro para calcular la asignación.
                </Alert>
              )}
              {allocations.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Unidades producidas</TableCell>
                      {isWeightedAllocation && <TableCell align="right">Peso</TableCell>}
                      {isWeightedAllocation && <TableCell align="right">Unidades ponderadas</TableCell>}
                      <TableCell align="right">Costo asignado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allocations.map((row) => (
                      <TableRow key={row.sku_id}>
                        <TableCell>
                          {row.sku_name} ({row.sku_code})
                        </TableCell>
                        <TableCell align="right">{formatQuantity(row.units_produced)}</TableCell>
                        {isWeightedAllocation && <TableCell align="right">{formatQuantity(row.overhead_weight ?? 1)}</TableCell>}
                        {isWeightedAllocation && <TableCell align="right">{formatQuantity(row.weighted_units ?? 0)}</TableCell>}
                        <TableCell align="right">{formatCurrency(row.allocated_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  );
}
