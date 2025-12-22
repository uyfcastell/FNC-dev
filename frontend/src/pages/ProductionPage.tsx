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
  Grid,
  IconButton,
  LinearProgress,
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
import { AddCircleOutline, DeleteForever } from "@mui/icons-material";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "../components/SearchableSelect";
import {
  createRecipe,
  createStockMovement,
  Deposit,
  fetchDeposits,
  fetchRecipes,
  fetchSkus,
  fetchStockMovementTypes,
  Recipe,
  SKU,
  StockMovementType,
} from "../lib/api";

const PRODUCTION_TYPE_CODES: string[] = ["PT", "SEMI", "MP"];
type RecipeFormItem = { component_id: number | null; quantity: string };

export function ProductionPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [movementTypes, setMovementTypes] = useState<StockMovementType[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const componentOptions = useMemo(
    () =>
      sortedSkus.map((sku) => ({
        value: sku.id,
        label: `${sku.name} (${sku.code})`,
      })),
    [sortedSkus]
  );
  const selectedProductionProduct = productionSkus.find((sku) => sku.id === productionForm.product_sku_id) ?? null;

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [skuList, depositList, recipeList, movementTypeList] = await Promise.all([
        fetchSkus({ tags: PRODUCTION_TYPE_CODES }),
        fetchDeposits(),
        fetchRecipes(),
        fetchStockMovementTypes({ include_inactive: true }),
      ]);
      setSkus(skuList);
      setDeposits(depositList);
      setRecipes(recipeList);
      setMovementTypes(movementTypeList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar catálogo y recetas. ¿Está levantado el backend?");
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
    if (!productionForm.product_sku_id || !productionForm.deposit_id || !productionForm.quantity) {
      setError("Selecciona SKU, depósito y cantidad para registrar la producción");
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
        quantity: Number(productionForm.quantity),
        movement_type_id: productionMovementType.id,
        unit: unit,
        reference: productionForm.reference || "Orden de producción",
      });
      setSuccess("Producción registrada en stock");
      setProductionForm({ product_sku_id: null, deposit_id: null, quantity: "", reference: "" });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar la producción. Verifica datos o saldo.");
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
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
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
                <TextField
                  required
                  label="Cantidad producida"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  value={productionForm.quantity}
                  onChange={(e) => setProductionForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
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
        </Grid>
        <Grid item xs={12} md={6}>
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
        </Grid>
      </Grid>
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
      <Card variant="outlined">
        <CardHeader title="Bitácora rápida (mock)" subheader="Ejemplo visual de lotes en curso" />
        <Divider />
        <CardContent>
          {[65, 35, 100].map((progress, idx) => (
            <Stack key={idx} spacing={1} sx={{ mb: 2 }}>
              <Typography variant="body2">Lote de ejemplo {idx + 1}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <LinearProgress value={progress} variant="determinate" sx={{ flexGrow: 1 }} />
                <Typography variant="body2" color="text.secondary">{`${progress}%`}</Typography>
              </Box>
            </Stack>
          ))}
        </CardContent>
      </Card>
    </Stack>
  );
}
