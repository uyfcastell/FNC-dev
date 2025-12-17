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
  MenuItem,
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
import { FormEvent, useEffect, useState } from "react";

import {
  createRecipe,
  createStockMovement,
  Deposit,
  fetchDeposits,
  fetchRecipes,
  fetchSkus,
  Recipe,
  SKUTag,
  SKU,
} from "../lib/api";

export function ProductionPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [recipeForm, setRecipeForm] = useState<{
    product_id: string;
    name: string;
    items: { component_id: string; quantity: string }[];
  }>({
    product_id: "",
    name: "",
    items: [
      { component_id: "", quantity: "" },
      { component_id: "", quantity: "" },
    ],
  });

  const [productionForm, setProductionForm] = useState({
    product_sku_id: "",
    deposit_id: "",
    quantity: "",
    reference: "",
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [skuList, depositList, recipeList] = await Promise.all([fetchSkus(), fetchDeposits(), fetchRecipes()]);
      setSkus(skuList);
      setDeposits(depositList);
      setRecipes(recipeList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar catálogo y recetas. ¿Está levantado el backend?");
    }
  };

  const getSkuLabel = (id: number) => {
    const sku = skus.find((s) => s.id === id);
    return sku ? `${sku.code} · ${sku.name}` : `SKU ${id}`;
  };

  const handleRecipeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipeForm.product_id || recipeForm.items.some((item) => !item.component_id || !item.quantity)) {
      setError("Completa producto y componentes");
      return;
    }
    try {
      await createRecipe({
        product_id: Number(recipeForm.product_id),
        name: recipeForm.name || getSkuLabel(Number(recipeForm.product_id)),
        items: recipeForm.items.map((item) => ({
          component_id: Number(item.component_id),
          quantity: Number(item.quantity),
        })),
      });
      setSuccess("Receta creada");
      setRecipeForm({
        product_id: "",
        name: "",
        items: [
          { component_id: "", quantity: "" },
          { component_id: "", quantity: "" },
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
    try {
      await createStockMovement({
        sku_id: Number(productionForm.product_sku_id),
        deposit_id: Number(productionForm.deposit_id),
        quantity: Number(productionForm.quantity),
        movement_type: "production",
        reference: productionForm.reference || "Orden de producción",
      });
      setSuccess("Producción registrada en stock");
      setProductionForm({ product_sku_id: "", deposit_id: "", quantity: "", reference: "" });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos registrar la producción. Verifica datos o saldo.");
    }
  };

  const handleItemChange = (index: number, field: "component_id" | "quantity", value: string) => {
    setRecipeForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addComponentRow = () => {
    setRecipeForm((prev) => ({ ...prev, items: [...prev.items, { component_id: "", quantity: "" }] }));
  };

  const removeComponentRow = (index: number) => {
    setRecipeForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const productionTags: SKUTag[] = ["PT", "SEMI"];

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
                <TextField
                  select
                  required
                  label="Producto"
                  value={productionForm.product_sku_id}
                  onChange={(e) => setProductionForm((prev) => ({ ...prev, product_sku_id: e.target.value }))}
                  helperText="Selecciona el SKU producido"
                >
                  {skus
                    .filter((sku) => productionTags.includes(sku.tag))
                    .map((sku) => (
                      <MenuItem key={sku.id} value={sku.id}>
                        {sku.code} · {sku.name}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  select
                  required
                  label="Depósito de entrada"
                  value={productionForm.deposit_id}
                  onChange={(e) => setProductionForm((prev) => ({ ...prev, deposit_id: e.target.value }))}
                >
                  {deposits.map((deposit) => (
                    <MenuItem key={deposit.id} value={deposit.id}>
                      {deposit.name}
                    </MenuItem>
                  ))}
                </TextField>
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
                <TextField
                  select
                  required
                  label="Producto final"
                  value={recipeForm.product_id}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, product_id: e.target.value }))}
                >
                  {skus.map((sku) => (
                    <MenuItem key={sku.id} value={sku.id}>
                      {sku.code} · {sku.name}
                    </MenuItem>
                  ))}
                </TextField>
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
                      <TextField
                        select
                        required
                        label="Componente"
                        sx={{ flex: 1 }}
                        value={item.component_id}
                        onChange={(e) => handleItemChange(index, "component_id", e.target.value)}
                      >
                        {skus.map((sku) => (
                          <MenuItem key={sku.id} value={sku.id}>
                            {sku.code} · {sku.name}
                          </MenuItem>
                        ))}
                      </TextField>
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
                          <Chip key={`${recipe.id}-${idx}`} label={`${getSkuLabel(item.component_id)} · ${item.quantity}`} />
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
