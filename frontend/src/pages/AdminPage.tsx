import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory2";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import StoreIcon from "@mui/icons-material/Store";
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
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import {
  createDeposit,
  createRecipe,
  createSku,
  createUser,
  deleteDeposit,
  deleteRecipe,
  deleteSku,
  deleteUser,
  Deposit,
  fetchDeposits,
  fetchRecipes,
  fetchRoles,
  fetchSkus,
  fetchUnits,
  fetchUsers,
  Recipe,
  SKUTag,
  SKU,
  UnitOfMeasure,
  UnitOption,
  updateDeposit,
  updateRecipe,
  updateSku,
  updateUser,
  Role,
  User,
} from "../lib/api";

const PRODUCTION_TAGS: SKUTag[] = ["PT", "SEMI"];

type RecipeFormItem = { component_id: string; quantity: string };

type TabKey = "productos" | "recetas" | "depositos" | "usuarios";

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>("productos");
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [skuForm, setSkuForm] = useState<{ id?: number; code: string; name: string; tag: SKUTag; unit: UnitOfMeasure; notes: string }>(
    {
      code: "",
      name: "",
      tag: "MP",
      unit: "unit",
      notes: "",
    }
  );
  const [depositForm, setDepositForm] = useState<{ id?: number; name: string; location: string; controls_lot: boolean }>({
    name: "",
    location: "",
    controls_lot: true,
  });
  const [recipeForm, setRecipeForm] = useState<{ id?: number; product_id: string; name: string; items: RecipeFormItem[] }>(
    {
      product_id: "",
      name: "",
      items: [{ component_id: "", quantity: "" }],
    }
  );
  const [userForm, setUserForm] = useState<{ id?: number; email: string; full_name: string; password: string; role_id: string; is_active: boolean }>(
    {
      email: "",
      full_name: "",
      password: "",
      role_id: "",
      is_active: true,
    }
  );

  useEffect(() => {
    void loadData();
  }, []);

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);
  const sortedDeposits = useMemo(() => [...deposits].sort((a, b) => a.name.localeCompare(b.name)), [deposits]);
  const skuMap = useMemo(() => new Map(skus.map((sku) => [sku.id, sku])), [skus]);

  const loadData = async () => {
    try {
      const [skuList, depositList, recipeList, roleList, userList, unitList] = await Promise.all([
        fetchSkus(),
        fetchDeposits(),
        fetchRecipes(),
        fetchRoles(),
        fetchUsers(),
        fetchUnits(),
      ]);
      setSkus(skuList);
      setDeposits(depositList);
      setRecipes(recipeList);
      setRoles(roleList);
      setUsers(userList);
      setUnits(unitList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los catálogos. ¿Está levantado el backend?");
    }
  };

  const resetMessages = () => {
    setSuccess(null);
    setError(null);
  };

  const handleSkuSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (skuForm.id) {
        await updateSku(skuForm.id, { ...skuForm, notes: skuForm.notes || null });
        setSuccess("Producto actualizado");
      } else {
        await createSku({ ...skuForm, notes: skuForm.notes || null });
        setSuccess("Producto creado");
      }
      setSkuForm({ code: "", name: "", tag: "MP", unit: "unit", notes: "" });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el producto. Revisa duplicados o datos faltantes.");
    }
  };

  const handleDepositSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (depositForm.id) {
        await updateDeposit(depositForm.id, { ...depositForm, location: depositForm.location || null });
        setSuccess("Depósito actualizado");
      } else {
        await createDeposit({ ...depositForm, location: depositForm.location || null });
        setSuccess("Depósito creado");
      }
      setDepositForm({ name: "", location: "", controls_lot: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el depósito. ¿Nombre duplicado?");
    }
  };

  const handleRecipeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipeForm.product_id || recipeForm.items.some((i) => !i.component_id || !i.quantity)) {
      setError("Completa el producto y los componentes");
      return;
    }
    try {
      const payload = {
        product_id: Number(recipeForm.product_id),
        name: recipeForm.name || skuMap.get(Number(recipeForm.product_id))?.name || "Receta",
        items: recipeForm.items.map((item) => ({ component_id: Number(item.component_id), quantity: Number(item.quantity) })),
      };
      if (recipeForm.id) {
        await updateRecipe(recipeForm.id, payload);
        setSuccess("Receta actualizada");
      } else {
        await createRecipe(payload);
        setSuccess("Receta creada");
      }
      setRecipeForm({ id: undefined, product_id: "", name: "", items: [{ component_id: "", quantity: "" }] });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar la receta. Verifica los datos");
    }
  };

  const handleUserSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        email: userForm.email,
        full_name: userForm.full_name,
        password: userForm.password,
        role_id: userForm.role_id ? Number(userForm.role_id) : undefined,
        is_active: userForm.is_active,
      };
      if (userForm.id) {
        await updateUser(userForm.id, { ...payload, password: userForm.password || undefined });
        setSuccess("Usuario actualizado");
      } else {
        await createUser(payload);
        setSuccess("Usuario creado");
      }
      setUserForm({ id: undefined, email: "", full_name: "", password: "", role_id: "", is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el usuario. Revisa duplicados o datos requeridos.");
    }
  };

  const handleRecipeItemChange = (index: number, field: keyof RecipeFormItem, value: string) => {
    setRecipeForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addRecipeItem = () => setRecipeForm((prev) => ({ ...prev, items: [...prev.items, { component_id: "", quantity: "" }] }));
  const removeRecipeItem = (index: number) =>
    setRecipeForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));

  const startEditRecipe = (recipe: Recipe) => {
    setRecipeForm({
      id: recipe.id,
      product_id: String(recipe.product_id),
      name: recipe.name,
      items: recipe.items.map((item) => ({ component_id: String(item.component_id), quantity: String(item.quantity) })),
    });
    setTab("recetas");
  };

  const startEditSku = (sku: SKU) => setSkuForm({ ...sku, notes: sku.notes ?? "", id: sku.id });
  const startEditDeposit = (deposit: Deposit) =>
    setDepositForm({ id: deposit.id, name: deposit.name, location: deposit.location ?? "", controls_lot: deposit.controls_lot });
  const startEditUser = (user: User) =>
    setUserForm({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      password: "",
      role_id: user.role_id ? String(user.role_id) : "",
      is_active: user.is_active,
    });

  const skuLabel = (sku: SKU) => `${sku.name} (${sku.code})`;
  const unitLabel = (unitCode?: UnitOfMeasure) => units.find((u) => u.code === unitCode)?.label || unitCode || "";

  const recipeItemUnit = (componentId: string) => {
    if (!componentId) return "";
    const component = skuMap.get(Number(componentId));
    return component ? unitLabel(component.unit) : "";
  };

  const filteredProducts = sortedSkus.filter((sku) => PRODUCTION_TAGS.includes(sku.tag));

  const handleDelete = async (type: "sku" | "deposit" | "recipe" | "user", id: number) => {
    if (!window.confirm("¿Eliminar el registro?")) return;
    try {
      if (type === "sku") await deleteSku(id);
      if (type === "deposit") await deleteDeposit(id);
      if (type === "recipe") await deleteRecipe(id);
      if (type === "user") await deleteUser(id);
      setSuccess("Registro eliminado");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos eliminar el registro");
    }
  };

  const renderProductos = () => (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Producto" subheader={skuForm.id ? "Editar" : "Alta"} avatar={<InventoryIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleSkuSubmit}>
              <TextField label="Código" required value={skuForm.code} onChange={(e) => setSkuForm((prev) => ({ ...prev, code: e.target.value }))} />
              <TextField label="Nombre" required value={skuForm.name} onChange={(e) => setSkuForm((prev) => ({ ...prev, name: e.target.value }))} />
              <TextField select label="Tipo" value={skuForm.tag} onChange={(e) => setSkuForm((prev) => ({ ...prev, tag: e.target.value as SKUTag }))}>
                <MenuItem value="MP">Materia prima</MenuItem>
                <MenuItem value="SEMI">Semielaborado</MenuItem>
                <MenuItem value="PT">Producto terminado</MenuItem>
                <MenuItem value="CON">Consumible / material</MenuItem>
              </TextField>
              <TextField
                select
                label="Unidad"
                value={skuForm.unit}
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
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {skuForm.id ? "Actualizar" : "Crear"}
                </Button>
                {skuForm.id && (
                  <Button onClick={() => setSkuForm({ code: "", name: "", tag: "MP", unit: "unit", notes: "" })}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Productos" subheader="Alta, baja y modificación" action={<Chip label={`${skus.length} items`} />} />
          <Divider />
          <CardContent>
            <Stack spacing={1}>
              {sortedSkus.map((sku) => (
                <Card key={sku.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
                      <Box>
                        <Typography fontWeight={700}>{skuLabel(sku)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tipo: {sku.tag} · Unidad: {unitLabel(sku.unit)} {sku.notes ? `· ${sku.notes}` : ""}
                        </Typography>
                      </Box>
                      <Box>
                        <Tooltip title="Editar">
                          <IconButton onClick={() => startEditSku(sku)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton color="error" onClick={() => handleDelete("sku", sku.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDepositos = () => (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Depósito" subheader={depositForm.id ? "Editar" : "Alta"} avatar={<StoreIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleDepositSubmit}>
              <TextField label="Nombre" required value={depositForm.name} onChange={(e) => setDepositForm((prev) => ({ ...prev, name: e.target.value }))} />
              <TextField label="Ubicación" value={depositForm.location} onChange={(e) => setDepositForm((prev) => ({ ...prev, location: e.target.value }))} />
              <TextField
                select
                label="Controla lote"
                value={depositForm.controls_lot ? "si" : "no"}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDepositForm((prev) => ({ ...prev, controls_lot: e.target.value === "si" }))}
              >
                <MenuItem value="si">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {depositForm.id ? "Actualizar" : "Crear"}
                </Button>
                {depositForm.id && (
                  <Button onClick={() => setDepositForm({ name: "", location: "", controls_lot: true })}>Cancelar</Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Depósitos" subheader="Listado y edición" action={<Chip label={`${deposits.length} items`} />} />
          <Divider />
          <CardContent>
            <Stack spacing={1}>
              {sortedDeposits.map((deposit) => (
                <Card key={deposit.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                      <Box>
                        <Typography fontWeight={700}>{deposit.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {deposit.location || "Sin ubicación"} · Controla lote: {deposit.controls_lot ? "Sí" : "No"}
                        </Typography>
                      </Box>
                      <Box>
                        <Tooltip title="Editar">
                          <IconButton onClick={() => startEditDeposit(deposit)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton color="error" onClick={() => handleDelete("deposit", deposit.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderRecetas = () => (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12} md={5}>
        <Card>
          <CardHeader title="Receta" subheader={recipeForm.id ? "Editar" : "Nueva"} avatar={<RestaurantMenuIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleRecipeSubmit}>
              <TextField
                select
                required
                label="Producto (solo PT/SEMI)"
                value={recipeForm.product_id}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, product_id: e.target.value }))}
              >
                {filteredProducts.map((sku) => (
                  <MenuItem key={sku.id} value={sku.id}>
                    {skuLabel(sku)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Nombre de receta"
                value={recipeForm.name}
                placeholder="Si no lo completas usamos el nombre del producto"
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Typography variant="subtitle2">Componentes</Typography>
              <Stack spacing={1}>
                {recipeForm.items.map((item, index) => (
                  <Stack key={index} direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      required
                      label="Componente"
                      sx={{ flex: 1 }}
                      value={item.component_id}
                      onChange={(e) => handleRecipeItemChange(index, "component_id", e.target.value)}
                    >
                      {sortedSkus.map((sku) => (
                        <MenuItem key={sku.id} value={sku.id}>
                          {skuLabel(sku)}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Unidad" value={recipeItemUnit(item.component_id)} sx={{ width: 140 }} InputProps={{ readOnly: true }} />
                    <TextField
                      required
                      label="Cantidad"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      sx={{ width: 140 }}
                      value={item.quantity}
                      onChange={(e) => handleRecipeItemChange(index, "quantity", e.target.value)}
                    />
                    <Tooltip title="Eliminar">
                      <span>
                        <IconButton color="error" disabled={recipeForm.items.length <= 1} onClick={() => removeRecipeItem(index)}>
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ))}
                <Button startIcon={<LibraryAddIcon />} onClick={addRecipeItem} variant="outlined">
                  Agregar componente
                </Button>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {recipeForm.id ? "Actualizar" : "Guardar"}
                </Button>
                {recipeForm.id && (
                  <Button onClick={() => setRecipeForm({ id: undefined, product_id: "", name: "", items: [{ component_id: "", quantity: "" }] })}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card>
          <CardHeader title="Recetas registradas" subheader="BOM por producto" action={<Chip label={`${recipes.length} recetas`} />} />
          <Divider />
          <CardContent>
            <Stack spacing={1}>
              {recipes.map((recipe) => (
                <Card key={recipe.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography fontWeight={700}>
                          {skuMap.get(recipe.product_id) ? skuLabel(skuMap.get(recipe.product_id) as SKU) : `SKU ${recipe.product_id}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {recipe.name}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                          {recipe.items.map((item, idx) => (
                            <Chip
                              key={`${recipe.id}-${idx}`}
                              label={`${item.component_name ?? ""} (${item.component_code ?? ""}) · ${item.quantity} ${unitLabel(item.component_unit)}`}
                            />
                          ))}
                        </Stack>
                      </Box>
                      <Box>
                        <Tooltip title="Editar">
                          <IconButton onClick={() => startEditRecipe(recipe)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton color="error" onClick={() => handleDelete("recipe", recipe.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderUsuarios = () => (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12} md={5}>
        <Card>
          <CardHeader title="Usuario" subheader={userForm.id ? "Editar" : "Nuevo"} avatar={<AdminPanelSettingsIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleUserSubmit}>
              <TextField label="Email" required value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} />
              <TextField label="Nombre" required value={userForm.full_name} onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))} />
              <TextField
                label={userForm.id ? "Nueva contraseña (opcional)" : "Contraseña"}
                type="password"
                required={!userForm.id}
                value={userForm.password}
                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <TextField
                select
                label="Rol"
                value={userForm.role_id}
                onChange={(e) => setUserForm((prev) => ({ ...prev, role_id: e.target.value }))}
                helperText="Opcional"
              >
                <MenuItem value="">Sin rol</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Estado"
                value={userForm.is_active ? "activo" : "inactivo"}
                onChange={(e) => setUserForm((prev) => ({ ...prev, is_active: e.target.value === "activo" }))}
              >
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {userForm.id ? "Actualizar" : "Crear"}
                </Button>
                {userForm.id && (
                  <Button onClick={() => setUserForm({ id: undefined, email: "", full_name: "", password: "", role_id: "", is_active: true })}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card>
          <CardHeader title="Usuarios" subheader="Alta, baja y modificación" action={<Chip label={`${users.length} usuarios`} />} />
          <Divider />
          <CardContent>
            <Stack spacing={1}>
              {users.map((user) => (
                <Card key={user.id} variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} alignItems={{ sm: "center" }}>
                      <Box>
                        <Typography fontWeight={700}>{user.full_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email} · Rol: {user.role_name || "N/A"} · Estado: {user.is_active ? "Activo" : "Inactivo"}
                        </Typography>
                      </Box>
                      <Box>
                        <Tooltip title="Editar">
                          <IconButton onClick={() => startEditUser(user)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton color="error" onClick={() => handleDelete("user", user.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AdminPanelSettingsIcon color="primary" /> Administración de maestros
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => resetMessages()}>
          {success}
        </Alert>
      )}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, value) => {
            resetMessages();
            setTab(value);
          }}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
        >
          <Tab label="Productos" value="productos" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="Recetas" value="recetas" icon={<RestaurantMenuIcon />} iconPosition="start" />
          <Tab label="Depósitos" value="depositos" icon={<StoreIcon />} iconPosition="start" />
          <Tab label="Usuarios" value="usuarios" icon={<AdminPanelSettingsIcon />} iconPosition="start" />
        </Tabs>
        <Divider />
        <CardContent>
          {tab === "productos" && renderProductos()}
          {tab === "recetas" && renderRecetas()}
          {tab === "depositos" && renderDepositos()}
          {tab === "usuarios" && renderUsuarios()}
        </CardContent>
      </Card>
      <Box sx={{ color: "text.secondary", fontSize: 12 }}>Pantalla única para altas, bajas y modificaciones de productos, recetas, depósitos y usuarios.</Box>
    </Stack>
  );
}
