import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InventoryIcon from "@mui/icons-material/Inventory2";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import StoreIcon from "@mui/icons-material/Store";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ChangeEvent, Dispatch, FormEvent, Fragment, RefObject, SetStateAction, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  createDeposit,
  createRecipe,
  createSku,
  createSupplier,
  createUser,
  createMermaCause,
  createMermaType,
  deleteMermaCause,
  deleteMermaType,
  deleteUser,
  Deposit,
  fetchPermissions,
  fetchRolePermissions,
  fetchDeposits,
  fetchRecipes,
  fetchRoles,
  fetchMermaCauses,
  fetchMermaTypes,
  fetchSkuTypes,
  fetchStockMovementTypes,
  fetchSkus,
  fetchSuppliers,
  fetchUnits,
  fetchUsers,
  Recipe,
  SKU,
  MermaCause,
  MermaStage,
  MermaType,
  SKUType,
  StockMovementType,
  Supplier,
  UnitOfMeasure,
  UnitOption,
  createSkuType,
  updateSkuType,
  deleteSkuType,
  createStockMovementType,
  updateStockMovementType,
  deleteStockMovementType,
  updateDeposit,
  updateDepositStatus,
  updateMermaCause,
  updateMermaType,
  updateRecipe,
  updateRecipeStatus,
  updateSku,
  updateSkuStatus,
  updateSupplier,
  updateUser,
  updateRolePermissions,
  Permission,
  Role,
  User,
} from "../lib/api";

const RECIPE_PRODUCT_CODES = ["PT", "SEMI", "MP"];
const MERMA_STAGE_OPTIONS: { value: MermaStage; label: string }[] = [
  { value: "PRODUCTION", label: "Producción" },
  { value: "EMPAQUE", label: "Empaque" },
  { value: "STOCK", label: "Stock/Depósito" },
  { value: "TRANSITO_POST_REMITO", label: "Tránsito post-remito" },
  { value: "ADMINISTRATIVA", label: "Administrativa" },
];
const mermaStageLabel = (stage: MermaStage) => MERMA_STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;

type RecipeFormItem = { component_id: string; quantity: string };

type TabKey = "productos" | "recetas" | "depositos" | "proveedores" | "usuarios" | "catalogos" | "permisos";

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>("productos");
  const [skus, setSkus] = useState<SKU[]>([]);
  const [skuTypes, setSkuTypes] = useState<SKUType[]>([]);
  const [movementTypes, setMovementTypes] = useState<StockMovementType[]>([]);
  const [mermaTypes, setMermaTypes] = useState<MermaType[]>([]);
  const [mermaCauses, setMermaCauses] = useState<MermaCause[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<number, Set<string>>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionModuleFilter, setPermissionModuleFilter] = useState("");
  const [permissionActionFilter, setPermissionActionFilter] = useState("");
  const [permissionRoleFilter, setPermissionRoleFilter] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [skuSearch, setSkuSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [depositSearch, setDepositSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showInactiveSkus, setShowInactiveSkus] = useState(false);
  const [showInactiveRecipes, setShowInactiveRecipes] = useState(false);
  const [showInactiveDeposits, setShowInactiveDeposits] = useState(false);
  const [showInactiveSuppliers, setShowInactiveSuppliers] = useState(false);
  const [expandedSkus, setExpandedSkus] = useState<Record<number, boolean>>({});
  const [expandedRecipes, setExpandedRecipes] = useState<Record<number, boolean>>({});
  const [expandedDeposits, setExpandedDeposits] = useState<Record<number, boolean>>({});
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>({});
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<number, boolean>>({});
  const skuCodeRef = useRef<HTMLInputElement>(null);
  const recipeProductRef = useRef<HTMLInputElement>(null);
  const depositNameRef = useRef<HTMLInputElement>(null);
  const supplierNameRef = useRef<HTMLInputElement>(null);
  const userEmailRef = useRef<HTMLInputElement>(null);
  const skuTypeCodeRef = useRef<HTMLInputElement>(null);
  const movementTypeCodeRef = useRef<HTMLInputElement>(null);
  const mermaTypeStageRef = useRef<HTMLInputElement>(null);
  const mermaCauseStageRef = useRef<HTMLInputElement>(null);

  const [skuForm, setSkuForm] = useState<{
    id?: number;
    code: string;
    name: string;
    sku_type_id: number | "";
    unit: UnitOfMeasure;
    units_per_kg?: number | "";
    notes: string;
    is_active: boolean;
    alert_green_min?: number | "";
    alert_yellow_min?: number | "";
  }>(
    {
      code: "",
      name: "",
      sku_type_id: "",
      unit: "unit",
      units_per_kg: "",
      notes: "",
      is_active: true,
      alert_green_min: "",
      alert_yellow_min: "",
    }
  );
  const [depositForm, setDepositForm] = useState<{
    id?: number;
    name: string;
    location: string;
    controls_lot: boolean;
    is_store: boolean;
    is_active: boolean;
  }>({
    name: "",
    location: "",
    controls_lot: true,
    is_store: false,
    is_active: true,
  });
  const [recipeForm, setRecipeForm] = useState<{ id?: number; product_id: string; name: string; items: RecipeFormItem[]; is_active: boolean }>(
    {
      product_id: "",
      name: "",
      items: [{ component_id: "", quantity: "" }],
      is_active: true,
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
  const [supplierForm, setSupplierForm] = useState<{ id?: number; name: string; tax_id: string; email: string; phone: string; is_active: boolean }>(
    {
      name: "",
      tax_id: "",
      email: "",
      phone: "",
      is_active: true,
    }
  );
  const [skuTypeForm, setSkuTypeForm] = useState<{ id?: number; code: string; label: string; is_active: boolean }>({
    code: "",
    label: "",
    is_active: true,
  });
  const [movementTypeForm, setMovementTypeForm] = useState<{ id?: number; code: string; label: string; is_active: boolean }>({
    code: "",
    label: "",
    is_active: true,
  });
  const [mermaTypeForm, setMermaTypeForm] = useState<{ id?: number; stage: MermaStage; code: string; label: string; is_active: boolean }>({
    stage: "PRODUCTION",
    code: "",
    label: "",
    is_active: true,
  });
  const [mermaCauseForm, setMermaCauseForm] = useState<{ id?: number; stage: MermaStage; code: string; label: string; is_active: boolean }>({
    stage: "PRODUCTION",
    code: "",
    label: "",
    is_active: true,
  });

  useEffect(() => {
    void loadData();
  }, []);

  const sortedSkus = useMemo(() => [...skus].sort((a, b) => a.name.localeCompare(b.name)), [skus]);
  const sortedDeposits = useMemo(() => [...deposits].sort((a, b) => a.name.localeCompare(b.name)), [deposits]);
  const skuMap = useMemo(() => new Map(skus.map((sku) => [sku.id, sku])), [skus]);
  const skuTypeMap = useMemo(() => new Map(skuTypes.map((type) => [type.id, type])), [skuTypes]);
  const sortedSkuTypes = useMemo(() => [...skuTypes].sort((a, b) => a.code.localeCompare(b.code)), [skuTypes]);
  const sortedMovementTypes = useMemo(() => [...movementTypes].sort((a, b) => a.code.localeCompare(b.code)), [movementTypes]);
  const sortedMermaTypes = useMemo(
    () => [...mermaTypes].sort((a, b) => a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code)),
    [mermaTypes]
  );
  const sortedMermaCauses = useMemo(
    () => [...mermaCauses].sort((a, b) => a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code)),
    [mermaCauses]
  );
  const sortedRoles = useMemo(() => [...roles].sort((a, b) => a.name.localeCompare(b.name)), [roles]);
  const sortedPermissions = useMemo(
    () => [...permissions].sort((a, b) => a.category.localeCompare(b.category) || a.action.localeCompare(b.action)),
    [permissions]
  );

  const permissionModuleOptions = useMemo(
    () => Array.from(new Set(permissions.map((permission) => permission.category))).sort((a, b) => a.localeCompare(b)),
    [permissions]
  );

  const permissionActionOptions = useMemo(() => {
    const basePermissions = permissionModuleFilter
      ? permissions.filter((permission) => permission.category === permissionModuleFilter)
      : permissions;
    return Array.from(new Set(basePermissions.map((permission) => permission.action))).sort((a, b) => a.localeCompare(b));
  }, [permissionModuleFilter, permissions]);

  const filteredPermissions = useMemo(
    () =>
      sortedPermissions.filter((permission) => {
        if (permissionModuleFilter && permission.category !== permissionModuleFilter) {
          return false;
        }
        if (permissionActionFilter && permission.action !== permissionActionFilter) {
          return false;
        }
        return true;
      }),
    [permissionActionFilter, permissionModuleFilter, sortedPermissions]
  );

  const filteredRoles = useMemo(
    () => (permissionRoleFilter ? sortedRoles.filter((role) => role.id === Number(permissionRoleFilter)) : sortedRoles),
    [permissionRoleFilter, sortedRoles]
  );

  const matchesSearch = (text: string, search: string) => text.toLowerCase().includes(search.trim().toLowerCase());

  const filteredSkus = useMemo(
    () =>
      sortedSkus.filter(
        (sku) => (showInactiveSkus || sku.is_active) && (!skuSearch || matchesSearch(`${sku.name} ${sku.code}`, skuSearch))
      ),
    [sortedSkus, showInactiveSkus, skuSearch]
  );
  const recipeComponents = useMemo(
    () => sortedSkus.filter((sku) => RECIPE_PRODUCT_CODES.includes(sku.sku_type_code) && sku.is_active),
    [sortedSkus]
  );
  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) => {
        if (!showInactiveRecipes && !recipe.is_active) return false;
        if (!recipeSearch) return true;
        const product = skuMap.get(recipe.product_id);
        return matchesSearch(`${recipe.name} ${product?.name ?? ""}`, recipeSearch);
      }),
    [recipes, recipeSearch, skuMap, showInactiveRecipes]
  );
  const filteredDeposits = useMemo(
    () =>
      sortedDeposits.filter((deposit) => {
        if (!showInactiveDeposits && !deposit.is_active) return false;
        return depositSearch ? matchesSearch(`${deposit.name} ${deposit.location ?? ""}`, depositSearch) : true;
      }),
    [sortedDeposits, depositSearch, showInactiveDeposits]
  );
  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        userSearch ? matchesSearch(`${user.full_name} ${user.email} ${user.role_name ?? ""}`, userSearch) : true
      ),
    [users, userSearch]
  );
  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter((supplier) => {
        if (!showInactiveSuppliers && !supplier.is_active) return false;
        return supplierSearch
          ? matchesSearch(`${supplier.name} ${supplier.tax_id ?? ""} ${supplier.email ?? ""}`, supplierSearch)
          : true;
      }),
    [suppliers, supplierSearch, showInactiveSuppliers]
  );
  const selectedSkuType = skuForm.sku_type_id ? skuTypeMap.get(Number(skuForm.sku_type_id)) : undefined;
  const isSemiSku = selectedSkuType?.code === "SEMI";

  const loadData = async () => {
    try {
      const [
        skuList,
        depositList,
        recipeList,
        roleList,
        userList,
        unitList,
        skuTypeList,
        movementTypeList,
        mermaTypeList,
        mermaCauseList,
        supplierList,
        permissionList,
      ] = await Promise.all([
        fetchSkus({ include_inactive: true }),
        fetchDeposits({ include_inactive: true }),
        fetchRecipes({ include_inactive: true }),
        fetchRoles(),
        fetchUsers(),
        fetchUnits(),
        fetchSkuTypes({ include_inactive: true }),
        fetchStockMovementTypes({ include_inactive: true }),
        fetchMermaTypes({ include_inactive: true }),
        fetchMermaCauses({ include_inactive: true }),
        fetchSuppliers({ include_inactive: true }),
        fetchPermissions(),
      ]);
      setSkus(skuList);
      setDeposits(depositList);
      setRecipes(recipeList);
      setRoles(roleList);
      setUsers(userList);
      setUnits(unitList);
      setSkuTypes(skuTypeList);
      setMovementTypes(movementTypeList);
      setMermaTypes(mermaTypeList);
      setMermaCauses(mermaCauseList);
      setSuppliers(supplierList);
      setPermissions(permissionList);

      const rolePermissionEntries = await Promise.all(
        roleList.map(async (role) => {
          const keys = await fetchRolePermissions(role.id);
          return [role.id, new Set(keys)] as const;
        })
      );
      setRolePermissions(Object.fromEntries(rolePermissionEntries));

      const defaultSkuType = skuTypeList.find((t) => t.code === "MP" && t.is_active) ?? skuTypeList.find((t) => t.is_active);
      if (defaultSkuType && !skuForm.sku_type_id) {
        setSkuForm((prev) => ({ ...prev, sku_type_id: defaultSkuType.id }));
      }
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

  const toggleRolePermission = (roleId: number, permissionKey: string) => {
    setRolePermissions((prev) => {
      const current = new Set(prev[roleId] ?? []);
      if (current.has(permissionKey)) {
        current.delete(permissionKey);
      } else {
        current.add(permissionKey);
      }
      return { ...prev, [roleId]: current };
    });
  };

  const saveRolePermissions = async () => {
    try {
      setSavingPermissions(true);
      resetMessages();
      for (const role of sortedRoles) {
        const keys = Array.from(rolePermissions[role.id] ?? []);
        await updateRolePermissions(role.id, { permissions: keys });
      }
      setSuccess("Permisos actualizados correctamente.");
    } catch (err) {
      console.error(err);
      setError("No pudimos actualizar los permisos. Reintenta.");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleSkuSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!skuForm.sku_type_id) {
        setError("Selecciona un tipo de SKU");
        return;
      }
      const selectedType = skuTypes.find((type) => type.id === skuForm.sku_type_id);
      if (!selectedType) {
        setError("Tipo de SKU inválido");
        return;
      }
      const isSemi = selectedType.code === "SEMI";
      const unitsPerKgValue = isSemi ? Number(skuForm.units_per_kg || 1) : undefined;
      if (isSemi && (!unitsPerKgValue || unitsPerKgValue <= 0)) {
        setError("Configura las unidades por kg para SEMI");
        return;
      }
      const alertGreen = skuForm.alert_green_min === "" ? null : Number(skuForm.alert_green_min);
      const alertYellow = skuForm.alert_yellow_min === "" ? null : Number(skuForm.alert_yellow_min);
      if ([alertGreen, alertYellow].some((value) => value !== null && Number.isNaN(value))) {
        setError("Los umbrales de alerta deben ser numéricos");
        return;
      }
      if ([alertGreen, alertYellow].some((value) => value !== null && value < 0)) {
        setError("Los umbrales de alerta no pueden ser negativos");
        return;
      }
      if ((alertGreen === null) !== (alertYellow === null)) {
        setError("Configura ambos umbrales de alerta (verde y amarillo)");
        return;
      }
      if (alertGreen !== null && alertYellow !== null && alertYellow >= alertGreen) {
        setError("El umbral amarillo debe ser menor al verde");
        return;
      }
      const { id, units_per_kg, alert_green_min, alert_yellow_min, ...rest } = skuForm;
      const payload = {
        ...rest,
        unit: isSemi ? "kg" : skuForm.unit,
        units_per_kg: unitsPerKgValue,
        sku_type_id: selectedType.id,
        notes: skuForm.notes || null,
        is_active: skuForm.is_active,
        alert_green_min: alertGreen,
        alert_yellow_min: alertYellow,
      };
      if (skuForm.id) {
        await updateSku(skuForm.id, payload);
        setSuccess("Producto actualizado");
      } else {
        await createSku(payload);
        setSuccess("Producto creado");
      }
      const defaultSkuType = skuTypes.find((t) => t.code === "MP" && t.is_active) ?? skuTypes.find((t) => t.is_active);
      setSkuForm({
        code: "",
        name: "",
        sku_type_id: defaultSkuType?.id ?? "",
        unit: "unit",
        units_per_kg: "",
        notes: "",
        is_active: true,
        alert_green_min: "",
        alert_yellow_min: "",
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el producto. Revisa duplicados o datos faltantes.");
    }
  };

  const handleDepositSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const { id, ...rest } = depositForm;
      const payload = { ...rest, location: depositForm.location || null };
      if (depositForm.id) {
        await updateDeposit(depositForm.id, payload);
        setSuccess("Depósito actualizado");
      } else {
        await createDeposit(payload);
        setSuccess("Depósito creado");
      }
      setDepositForm({ name: "", location: "", controls_lot: true, is_store: false, is_active: true });
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
        is_active: recipeForm.is_active,
      };
      if (recipeForm.id) {
        await updateRecipe(recipeForm.id, payload);
        setSuccess("Receta actualizada");
      } else {
        await createRecipe(payload);
        setSuccess("Receta creada");
      }
      setRecipeForm({ id: undefined, product_id: "", name: "", items: [{ component_id: "", quantity: "" }], is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar la receta. Verifica los datos");
    }
  };

  const handleUserSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const editingUser = userForm.id ? users.find((entry) => entry.id === userForm.id) : undefined;
      if (editingUser && isAdminUser(editingUser) && !userForm.is_active) {
        setError("No se puede desactivar el usuario admin.");
        return;
      }
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

  const handleSupplierSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        name: supplierForm.name,
        tax_id: supplierForm.tax_id || null,
        email: supplierForm.email || null,
        phone: supplierForm.phone || null,
        is_active: supplierForm.is_active,
      };
      if (supplierForm.id) {
        await updateSupplier(supplierForm.id, payload);
        setSuccess("Proveedor actualizado");
      } else {
        await createSupplier(payload);
        setSuccess("Proveedor creado");
      }
      setSupplierForm({ id: undefined, name: "", tax_id: "", email: "", phone: "", is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el proveedor. Revisa duplicados o datos requeridos.");
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

  const queueScrollToForm = (ref?: RefObject<HTMLInputElement>) => {
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      ref?.current?.focus({ preventScroll: true });
    }, 0);
  };

  const startEditRecipe = (recipe: Recipe) => {
    setRecipeForm({
      id: recipe.id,
      product_id: String(recipe.product_id),
      name: recipe.name,
      items: recipe.items.map((item) => ({ component_id: String(item.component_id), quantity: String(item.quantity) })),
      is_active: recipe.is_active,
    });
    setTab("recetas");
    queueScrollToForm(recipeProductRef);
  };

  const startEditSupplier = (supplier: Supplier) => {
    setSupplierForm({
      id: supplier.id,
      name: supplier.name,
      tax_id: supplier.tax_id ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      is_active: supplier.is_active,
    });
    setTab("proveedores");
    queueScrollToForm(supplierNameRef);
  };

  const toggleSupplierStatus = async (supplier: Supplier) => {
    if (supplier.is_active && !window.confirm("¿Confirmas desactivar el proveedor?")) return;
    try {
      await updateSupplier(supplier.id, { is_active: !supplier.is_active });
      setSuccess(`Proveedor ${supplier.is_active ? "desactivado" : "activado"}`);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos actualizar el estado del proveedor.");
    }
  };

  const startEditSku = (sku: SKU) => {
    setSkuForm({
      id: sku.id,
      code: sku.code,
      name: sku.name,
      sku_type_id: sku.sku_type_id,
      unit: sku.unit,
      units_per_kg: sku.units_per_kg ?? "",
      notes: sku.notes ?? "",
      is_active: sku.is_active,
      alert_green_min: sku.alert_green_min ?? "",
      alert_yellow_min: sku.alert_yellow_min ?? "",
    });
    queueScrollToForm(skuCodeRef);
  };
  const startEditDeposit = (deposit: Deposit) => {
    setDepositForm({
      id: deposit.id,
      name: deposit.name,
      location: deposit.location ?? "",
      controls_lot: deposit.controls_lot,
      is_store: deposit.is_store,
      is_active: deposit.is_active,
    });
    queueScrollToForm(depositNameRef);
  };
  const startEditUser = (user: User) => {
    setUserForm({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      password: "",
      role_id: user.role_id ? String(user.role_id) : "",
      is_active: user.is_active,
    });
    queueScrollToForm(userEmailRef);
  };

  const skuLabel = (sku: SKU) => `${sku.name} (${sku.code})`;
  const unitLabel = (unitCode?: UnitOfMeasure) => units.find((u) => u.code === unitCode)?.label || unitCode || "";
  const skuAlertSummary = (sku: SKU) => {
    const parts: string[] = [];
    if (sku.alert_green_min != null) parts.push(`Verde >= ${sku.alert_green_min}`);
    if (sku.alert_yellow_min != null) parts.push(`Amarillo >= ${sku.alert_yellow_min}`);
    return parts.length ? parts.join(" · ") : "Sin alerta";
  };
  const toggleExpanded = (setter: Dispatch<SetStateAction<Record<number, boolean>>>, id: number) =>
    setter((prev) => ({ ...prev, [id]: !prev[id] }));
  const normalizeRoleName = (value: string) =>
    value
      .toUpperCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  const isAdminUser = (user: User | undefined) =>
    user?.email?.toLowerCase() === "admin@local" || ["ADMIN", "ADMINISTRACION"].includes(normalizeRoleName(user?.role_name ?? ""));
  const confirmInactivate = () => window.confirm("¿Confirmas inactivar el registro?");

  const recipeItemUnit = (componentId: string) => {
    if (!componentId) return "";
    const component = skuMap.get(Number(componentId));
    return component ? unitLabel(component.unit) : "";
  };

  const filteredProducts = recipeComponents;

  const handleDelete = async (type: "sku" | "deposit" | "recipe" | "user", id: number) => {
    if (!window.confirm("¿Eliminar el registro?")) return;
    try {
      if (type === "user") {
        const user = users.find((entry) => entry.id === id);
        if (isAdminUser(user)) {
          setError("No se puede eliminar el usuario admin.");
          return;
        }
        await deleteUser(id);
      }
      setSuccess("Registro eliminado");
      await loadData();
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        try {
          const parsed = JSON.parse(err.message);
          setError(parsed?.detail ?? "No pudimos eliminar el registro");
          return;
        } catch {
          setError(err.message);
          return;
        }
      }
      setError("No pudimos eliminar el registro");
    }
  };

  const handleStatusChange = async (type: "sku" | "deposit" | "recipe", id: number, isActive: boolean) => {
    if (!isActive && !confirmInactivate()) return;
    try {
      if (type === "sku") await updateSkuStatus(id, isActive);
      if (type === "deposit") await updateDepositStatus(id, isActive);
      if (type === "recipe") await updateRecipeStatus(id, isActive);
      setSuccess(isActive ? "Registro activado" : "Registro inactivado");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos actualizar el estado");
    }
  };

  const startEditSkuType = (skuType: SKUType) => {
    setSkuTypeForm({ ...skuType });
    queueScrollToForm(skuTypeCodeRef);
  };

  const startEditMovementType = (movementType: StockMovementType) => {
    setMovementTypeForm({ ...movementType });
    queueScrollToForm(movementTypeCodeRef);
  };

  const startEditMermaType = (mermaType: MermaType) => {
    setMermaTypeForm({ ...mermaType });
    queueScrollToForm(mermaTypeStageRef);
  };

  const startEditMermaCause = (mermaCause: MermaCause) => {
    setMermaCauseForm({ ...mermaCause });
    queueScrollToForm(mermaCauseStageRef);
  };

  const handleSkuTypeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!skuTypeForm.code || !skuTypeForm.label) {
        setError("Completa código y etiqueta");
        return;
      }
      if (skuTypeForm.id) {
        await updateSkuType(skuTypeForm.id, { label: skuTypeForm.label, is_active: skuTypeForm.is_active });
        setSuccess("Tipo de SKU actualizado");
      } else {
        await createSkuType({
          code: skuTypeForm.code.toUpperCase(),
          label: skuTypeForm.label,
          is_active: skuTypeForm.is_active,
        });
        setSuccess("Tipo de SKU creado");
      }
      setSkuTypeForm({ id: undefined, code: "", label: "", is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el tipo de SKU. ¿Código duplicado?");
    }
  };

  const handleMovementTypeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!movementTypeForm.code || !movementTypeForm.label) {
        setError("Completa código y etiqueta");
        return;
      }
      if (movementTypeForm.id) {
        await updateStockMovementType(movementTypeForm.id, {
          label: movementTypeForm.label,
          is_active: movementTypeForm.is_active,
        });
        setSuccess("Tipo de movimiento actualizado");
      } else {
        await createStockMovementType({
          code: movementTypeForm.code.toUpperCase(),
          label: movementTypeForm.label,
          is_active: movementTypeForm.is_active,
        });
        setSuccess("Tipo de movimiento creado");
      }
      setMovementTypeForm({ id: undefined, code: "", label: "", is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el tipo de movimiento. ¿Código duplicado?");
    }
  };

  const handleMermaTypeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!mermaTypeForm.code || !mermaTypeForm.label) {
        setError("Completa código, etapa y etiqueta");
        return;
      }
      if (mermaTypeForm.id) {
        await updateMermaType(mermaTypeForm.id, {
          stage: mermaTypeForm.stage,
          label: mermaTypeForm.label,
          is_active: mermaTypeForm.is_active,
        });
        setSuccess("Tipo de merma actualizado");
      } else {
        await createMermaType({
          stage: mermaTypeForm.stage,
          code: mermaTypeForm.code,
          label: mermaTypeForm.label,
          is_active: mermaTypeForm.is_active,
        });
        setSuccess("Tipo de merma creado");
      }
      setMermaTypeForm({ id: undefined, stage: "PRODUCTION", code: "", label: "", is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el tipo de merma. ¿Código duplicado?");
    }
  };

  const handleMermaCauseSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!mermaCauseForm.code || !mermaCauseForm.label) {
        setError("Completa código, etapa y etiqueta");
        return;
      }
      if (mermaCauseForm.id) {
        await updateMermaCause(mermaCauseForm.id, {
          stage: mermaCauseForm.stage,
          label: mermaCauseForm.label,
          is_active: mermaCauseForm.is_active,
        });
        setSuccess("Causa de merma actualizada");
      } else {
        await createMermaCause({
          stage: mermaCauseForm.stage,
          code: mermaCauseForm.code,
          label: mermaCauseForm.label,
          is_active: mermaCauseForm.is_active,
        });
        setSuccess("Causa de merma creada");
      }
      setMermaCauseForm({ id: undefined, stage: "PRODUCTION", code: "", label: "", is_active: true });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar la causa de merma. ¿Código duplicado?");
    }
  };

  const handleSkuTypeDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar/desactivar el tipo de SKU?")) return;
    try {
      await deleteSkuType(id);
      setSuccess("Tipo de SKU actualizado");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos eliminar el tipo de SKU");
    }
  };

  const handleMovementTypeDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar/desactivar el tipo de movimiento?")) return;
    try {
      await deleteStockMovementType(id);
      setSuccess("Tipo de movimiento actualizado");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos eliminar el tipo de movimiento");
    }
  };

  const handleMermaTypeDelete = async (id: number) => {
    if (!window.confirm("¿Desactivar el tipo de merma?")) return;
    try {
      await deleteMermaType(id);
      setSuccess("Tipo de merma desactivado");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos desactivar el tipo de merma");
    }
  };

  const handleMermaCauseDelete = async (id: number) => {
    if (!window.confirm("¿Desactivar la causa de merma?")) return;
    try {
      await deleteMermaCause(id);
      setSuccess("Causa de merma desactivada");
      await loadData();
    } catch (err) {
      console.error(err);
      setError("No pudimos desactivar la causa de merma");
    }
  };

  const renderProductos = () => (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Producto" subheader={skuForm.id ? "Editar" : "Alta"} avatar={<InventoryIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleSkuSubmit}>
              <TextField
                label="Código"
                required
                value={skuForm.code}
                onChange={(e) => setSkuForm((prev) => ({ ...prev, code: e.target.value }))}
                inputRef={skuCodeRef}
              />
              <TextField label="Nombre" required value={skuForm.name} onChange={(e) => setSkuForm((prev) => ({ ...prev, name: e.target.value }))} />
              <TextField
                select
                label="Tipo"
                required
                value={skuForm.sku_type_id}
                onChange={(e) => {
                  const typeId = Number(e.target.value);
                  const type = skuTypeMap.get(typeId);
                  setSkuForm((prev) => ({
                    ...prev,
                    sku_type_id: typeId,
                    unit: type?.code === "SEMI" ? "kg" : prev.unit,
                    units_per_kg: type?.code === "SEMI" ? prev.units_per_kg || 1 : "",
                  }));
                }}
                helperText="Tipos administrables"
              >
                {skuTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id} disabled={!type.is_active}>
                    {type.code} — {type.label}
                    {!type.is_active ? " (inactivo)" : ""}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Unidad"
                value={skuForm.unit}
                onChange={(e) => setSkuForm((prev) => ({ ...prev, unit: e.target.value as UnitOfMeasure }))}
                helperText={isSemiSku ? "Los SEMI operan en kg como unidad base" : undefined}
                disabled={isSemiSku}
              >
                {units.map((unit) => (
                  <MenuItem key={unit.code} value={unit.code}>
                    {unit.label}
                  </MenuItem>
                ))}
              </TextField>
              {isSemiSku && (
                <TextField
                  label="Unidades por kg (SEMI)"
                  type="number"
                  inputProps={{ min: "0.0001", step: "0.01" }}
                  value={skuForm.units_per_kg}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, units_per_kg: Number(e.target.value) }))}
                  helperText="Equivalencia de la unidad operativa vs kg base"
                  required
                />
              )}
              <TextField
                label="Notas"
                value={skuForm.notes}
                onChange={(e) => setSkuForm((prev) => ({ ...prev, notes: e.target.value }))}
                multiline
                minRows={2}
              />
              <Stack spacing={1}>
                <Typography variant="subtitle2">Alertas de stock (semaforo)</Typography>
                <TextField
                  label="Umbral verde (>=)"
                  type="number"
                  inputProps={{ min: "0", step: "0.01" }}
                  value={skuForm.alert_green_min}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, alert_green_min: e.target.value === "" ? "" : Number(e.target.value) }))}
                  helperText="Opcional. Ej: 100"
                />
                <TextField
                  label="Umbral amarillo (>=)"
                  type="number"
                  inputProps={{ min: "0", step: "0.01" }}
                  value={skuForm.alert_yellow_min}
                  onChange={(e) => setSkuForm((prev) => ({ ...prev, alert_yellow_min: e.target.value === "" ? "" : Number(e.target.value) }))}
                  helperText="Opcional. Ej: 20"
                />
              </Stack>
              <FormControlLabel
                control={<Switch checked={skuForm.is_active} onChange={(e) => setSkuForm((prev) => ({ ...prev, is_active: e.target.checked }))} />}
                label="Activo (visible por defecto en los combos)"
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {skuForm.id ? "Actualizar" : "Crear"}
                </Button>
                {skuForm.id && (
                  <Button
                    onClick={() => {
                      const defaultSkuType = skuTypes.find((t) => t.code === "MP" && t.is_active) ?? skuTypes.find((t) => t.is_active);
                      setSkuForm({
                        id: undefined,
                        code: "",
                        name: "",
                        sku_type_id: defaultSkuType?.id ?? "",
                        unit: "unit",
                        units_per_kg: "",
                        notes: "",
                        is_active: true,
                        alert_green_min: "",
                        alert_yellow_min: "",
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Productos"
            subheader="Listado compacto"
            action={<Chip label={`${filteredSkus.length} de ${skus.length}`} />}
          />
          <Divider />
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                label="Buscar por nombre o código"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                size="small"
                sx={{ maxWidth: 320 }}
              />
              <FormControlLabel
                control={<Switch checked={showInactiveSkus} onChange={(e) => setShowInactiveSkus(e.target.checked)} />}
                label="Mostrar inactivos"
              />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Conv. SEMI</TableCell>
                  <TableCell>Alertas</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSkus.map((sku) => (
                  <Fragment key={sku.id}>
                    <TableRow hover>
                      <TableCell>
                        <Tooltip title={expandedSkus[sku.id] ? "Ocultar detalle" : "Ver detalle"}>
                          <IconButton size="small" onClick={() => toggleExpanded(setExpandedSkus, sku.id)}>
                            {expandedSkus[sku.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{sku.code}</TableCell>
                      <TableCell>{sku.name}</TableCell>
                      <TableCell>{`${sku.sku_type_code} — ${sku.sku_type_label}`}</TableCell>
                      <TableCell>{unitLabel(sku.unit)}</TableCell>
                      <TableCell>
                        {sku.sku_type_code === "SEMI" ? `${sku.units_per_kg ?? 1} un = 1 kg` : "—"}
                      </TableCell>
                      <TableCell>{skuAlertSummary(sku)}</TableCell>
                      <TableCell>{sku.is_active ? "Activo" : "Inactivo"}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditSku(sku)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {sku.is_active ? (
                          <Tooltip title="Inactivar">
                            <IconButton size="small" color="warning" onClick={() => handleStatusChange("sku", sku.id, false)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activar">
                            <IconButton size="small" color="success" onClick={() => handleStatusChange("sku", sku.id, true)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={9} sx={{ py: 0 }}>
                        <Collapse in={expandedSkus[sku.id]} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 1 }}>
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle2">Detalle</Typography>
                              <Typography variant="body2">
                                <strong>Notas:</strong> {sku.notes ? sku.notes : "—"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Alertas:</strong> {skuAlertSummary(sku)}
                              </Typography>
                              {sku.sku_type_code === "SEMI" && (
                                <Typography variant="body2">
                                  <strong>Conversión SEMI:</strong> {sku.units_per_kg ?? 1} un = 1 kg
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderCatalogos = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Tipos de SKU" subheader="Catálogo administrable" avatar={<LibraryAddIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleSkuTypeSubmit}>
              <TextField
                label="Código"
                value={skuTypeForm.code}
                onChange={(e) => setSkuTypeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                inputProps={{ style: { textTransform: "uppercase" } }}
                required
                disabled={!!skuTypeForm.id}
                inputRef={skuTypeCodeRef}
              />
              <TextField
                label="Nombre visible"
                value={skuTypeForm.label}
                onChange={(e) => setSkuTypeForm((prev) => ({ ...prev, label: e.target.value }))}
                required
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={skuTypeForm.is_active}
                    onChange={(e) => setSkuTypeForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Activo"
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {skuTypeForm.id ? "Actualizar" : "Crear"}
                </Button>
                {skuTypeForm.id && (
                  <Button onClick={() => setSkuTypeForm({ id: undefined, code: "", label: "", is_active: true })}>Cancelar</Button>
                )}
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedSkuTypes.map((type) => (
                  <TableRow key={type.id} hover>
                    <TableCell>{type.code}</TableCell>
                    <TableCell>{type.label}</TableCell>
                    <TableCell>{type.is_active ? "Activo" : "Inactivo"}</TableCell>
                    <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditSkuType(type)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      <Tooltip title="Eliminar / desactivar">
                        <IconButton size="small" color="error" onClick={() => handleSkuTypeDelete(type.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Tipos de movimiento de stock" subheader="Impacto en kardex" avatar={<LibraryAddIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleMovementTypeSubmit}>
              <TextField
                label="Código"
                value={movementTypeForm.code}
                onChange={(e) => setMovementTypeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                inputProps={{ style: { textTransform: "uppercase" } }}
                required
                disabled={!!movementTypeForm.id}
                inputRef={movementTypeCodeRef}
              />
              <TextField
                label="Nombre visible"
                value={movementTypeForm.label}
                onChange={(e) => setMovementTypeForm((prev) => ({ ...prev, label: e.target.value }))}
                required
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={movementTypeForm.is_active}
                    onChange={(e) => setMovementTypeForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Activo"
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {movementTypeForm.id ? "Actualizar" : "Crear"}
                </Button>
                {movementTypeForm.id && (
                  <Button onClick={() => setMovementTypeForm({ id: undefined, code: "", label: "", is_active: true })}>Cancelar</Button>
                )}
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedMovementTypes.map((type) => (
                  <TableRow key={type.id} hover>
                    <TableCell>{type.code}</TableCell>
                    <TableCell>{type.label}</TableCell>
                    <TableCell>{type.is_active ? "Activo" : "Inactivo"}</TableCell>
                    <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditMovementType(type)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      <Tooltip title="Eliminar / desactivar">
                        <IconButton size="small" color="error" onClick={() => handleMovementTypeDelete(type.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Tipos de merma" subheader="Catálogo por etapa" avatar={<LibraryAddIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleMermaTypeSubmit}>
              <TextField
                select
                label="Etapa"
                value={mermaTypeForm.stage}
                onChange={(e) => setMermaTypeForm((prev) => ({ ...prev, stage: e.target.value as MermaStage }))}
                inputRef={mermaTypeStageRef}
              >
                {MERMA_STAGE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Código"
                value={mermaTypeForm.code}
                onChange={(e) => setMermaTypeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                inputProps={{ style: { textTransform: "uppercase" } }}
                required
                disabled={!!mermaTypeForm.id}
              />
              <TextField
                label="Nombre visible"
                value={mermaTypeForm.label}
                onChange={(e) => setMermaTypeForm((prev) => ({ ...prev, label: e.target.value }))}
                required
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={mermaTypeForm.is_active}
                    onChange={(e) => setMermaTypeForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Activo"
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {mermaTypeForm.id ? "Actualizar" : "Crear"}
                </Button>
                {mermaTypeForm.id && (
                  <Button onClick={() => setMermaTypeForm({ id: undefined, stage: "PRODUCTION", code: "", label: "", is_active: true })}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Etapa</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedMermaTypes.map((type) => (
                  <TableRow key={type.id} hover>
                    <TableCell>{mermaStageLabel(type.stage)}</TableCell>
                  <TableCell>{type.code}</TableCell>
                  <TableCell>{type.label}</TableCell>
                  <TableCell>{type.is_active ? "Activo" : "Inactivo"}</TableCell>
                  <TableCell align="right">
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                        <Switch
                          checked={type.is_active}
                          onChange={async (e) => {
                            try {
                              await updateMermaType(type.id, { is_active: e.target.checked });
                              await loadData();
                            } catch (err) {
                              console.error(err);
                              setError("No pudimos actualizar el estado");
                            }
                          }}
                        />
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditMermaType(type)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desactivar">
                          <IconButton size="small" color="error" onClick={() => handleMermaTypeDelete(type.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Causas de merma" subheader="Catálogo por etapa" avatar={<LibraryAddIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleMermaCauseSubmit}>
              <TextField
                select
                label="Etapa"
                value={mermaCauseForm.stage}
                onChange={(e) => setMermaCauseForm((prev) => ({ ...prev, stage: e.target.value as MermaStage }))}
                inputRef={mermaCauseStageRef}
              >
                {MERMA_STAGE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Código"
                value={mermaCauseForm.code}
                onChange={(e) => setMermaCauseForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                inputProps={{ style: { textTransform: "uppercase" } }}
                required
                disabled={!!mermaCauseForm.id}
              />
              <TextField
                label="Nombre visible"
                value={mermaCauseForm.label}
                onChange={(e) => setMermaCauseForm((prev) => ({ ...prev, label: e.target.value }))}
                required
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={mermaCauseForm.is_active}
                    onChange={(e) => setMermaCauseForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Activo"
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {mermaCauseForm.id ? "Actualizar" : "Crear"}
                </Button>
                {mermaCauseForm.id && (
                  <Button onClick={() => setMermaCauseForm({ id: undefined, stage: "PRODUCTION", code: "", label: "", is_active: true })}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Etapa</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedMermaCauses.map((cause) => (
                  <TableRow key={cause.id} hover>
                    <TableCell>{mermaStageLabel(cause.stage)}</TableCell>
                  <TableCell>{cause.code}</TableCell>
                  <TableCell>{cause.label}</TableCell>
                  <TableCell>{cause.is_active ? "Activo" : "Inactivo"}</TableCell>
                  <TableCell align="right">
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                        <Switch
                          checked={cause.is_active}
                          onChange={async (e) => {
                            try {
                              await updateMermaCause(cause.id, { is_active: e.target.checked });
                              await loadData();
                            } catch (err) {
                              console.error(err);
                              setError("No pudimos actualizar el estado");
                            }
                          }}
                        />
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditMermaCause(cause)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desactivar">
                          <IconButton size="small" color="error" onClick={() => handleMermaCauseDelete(cause.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDepositos = () => (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Depósito" subheader={depositForm.id ? "Editar" : "Alta"} avatar={<StoreIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleDepositSubmit}>
              <TextField
                label="Nombre"
                required
                value={depositForm.name}
                onChange={(e) => setDepositForm((prev) => ({ ...prev, name: e.target.value }))}
                inputRef={depositNameRef}
              />
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
              <FormControlLabel
                control={<Switch checked={depositForm.is_store} onChange={(e) => setDepositForm((prev) => ({ ...prev, is_store: e.target.checked }))} />}
                label="Es local (destino de pedidos)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={depositForm.is_active}
                    onChange={(e) => setDepositForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Activo"
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained">
                  {depositForm.id ? "Actualizar" : "Crear"}
                </Button>
                {depositForm.id && (
                  <Button onClick={() => setDepositForm({ name: "", location: "", controls_lot: true, is_store: false, is_active: true })}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Depósitos"
            subheader="Listado y edición"
            action={<Chip label={`${filteredDeposits.length} de ${deposits.length}`} />}
          />
          <Divider />
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                label="Buscar por nombre o ubicación"
                value={depositSearch}
                onChange={(e) => setDepositSearch(e.target.value)}
                size="small"
                sx={{ maxWidth: 320 }}
              />
              <FormControlLabel
                control={<Switch checked={showInactiveDeposits} onChange={(e) => setShowInactiveDeposits(e.target.checked)} />}
                label="Mostrar inactivos"
              />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Nombre</TableCell>
                  <TableCell>Ubicación</TableCell>
                  <TableCell>Controla lote</TableCell>
                  <TableCell>Es local</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDeposits.map((deposit) => (
                  <Fragment key={deposit.id}>
                    <TableRow hover>
                      <TableCell>
                        <Tooltip title={expandedDeposits[deposit.id] ? "Ocultar detalle" : "Ver detalle"}>
                          <IconButton size="small" onClick={() => toggleExpanded(setExpandedDeposits, deposit.id)}>
                            {expandedDeposits[deposit.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{deposit.name}</TableCell>
                      <TableCell>{deposit.location || "—"}</TableCell>
                      <TableCell>{deposit.controls_lot ? "Sí" : "No"}</TableCell>
                      <TableCell>{deposit.is_store ? "Sí" : "No"}</TableCell>
                      <TableCell>{deposit.is_active ? "Activo" : "Inactivo"}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditDeposit(deposit)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {deposit.is_active ? (
                          <Tooltip title="Inactivar">
                            <IconButton size="small" color="warning" onClick={() => handleStatusChange("deposit", deposit.id, false)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activar">
                            <IconButton size="small" color="success" onClick={() => handleStatusChange("deposit", deposit.id, true)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0 }}>
                        <Collapse in={expandedDeposits[deposit.id]} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 1 }}>
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle2">Detalle</Typography>
                              <Typography variant="body2">
                                <strong>ID:</strong> {deposit.id}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Ubicación:</strong> {deposit.location || "—"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Controla lote:</strong> {deposit.controls_lot ? "Sí" : "No"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Es local:</strong> {deposit.is_store ? "Sí" : "No"}
                              </Typography>
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderProveedores = () => (
    <Stack spacing={2}>
      <Card>
        <CardHeader title={supplierForm.id ? `Editar proveedor #${supplierForm.id}` : "Nuevo proveedor"} avatar={<LocalMallIcon color="primary" />} />
        <Divider />
        <CardContent>
          <Stack component="form" spacing={2} onSubmit={handleSupplierSubmit}>
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
              onChange={(e) => setSupplierForm((prev) => ({ ...prev, is_active: e.target.value === "activo" }))}
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
                  onClick={() => setSupplierForm({ id: undefined, name: "", tax_id: "", email: "", phone: "", is_active: true })}
                >
                  Cancelar edición
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Proveedores" subheader="Listado y edición" action={<Chip label={`${filteredSuppliers.length} de ${suppliers.length}`} />} />
        <Divider />
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 2 }}>
            <TextField
              label="Buscar por nombre, CUIT o email"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              size="small"
              sx={{ maxWidth: 320 }}
            />
            <FormControlLabel
              control={<Switch checked={showInactiveSuppliers} onChange={(e) => setShowInactiveSuppliers(e.target.checked)} />}
              label="Mostrar inactivos"
            />
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Proveedor</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <Fragment key={supplier.id}>
                  <TableRow hover>
                    <TableCell>
                      <Tooltip title={expandedSuppliers[supplier.id] ? "Ocultar detalle" : "Ver detalle"}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedSuppliers((prev) => ({ ...prev, [supplier.id]: !prev[supplier.id] }))
                          }
                        >
                          {expandedSuppliers[supplier.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.email ?? "—"}</TableCell>
                    <TableCell>{supplier.phone ?? "—"}</TableCell>
                    <TableCell>{supplier.is_active ? "Activo" : "Inactivo"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => startEditSupplier(supplier)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button size="small" onClick={() => toggleSupplierStatus(supplier)}>
                        {supplier.is_active ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0 }}>
                      <Collapse in={expandedSuppliers[supplier.id]} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 1 }}>
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle2">Detalle</Typography>
                            <Typography variant="body2">
                              <strong>ID:</strong> {supplier.id}
                            </Typography>
                            <Typography variant="body2">
                              <strong>CUIT / Tax ID:</strong> {supplier.tax_id ?? "—"}
                            </Typography>
                          </Stack>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
              {filteredSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No hay proveedores para mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderRecetas = () => (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Receta" subheader={recipeForm.id ? "Editar" : "Nueva"} avatar={<RestaurantMenuIcon color="primary" />} />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleRecipeSubmit}>
              <TextField
                select
                required
                label="Producto"
                value={recipeForm.product_id}
                onChange={(e) => setRecipeForm((prev) => ({ ...prev, product_id: e.target.value }))}
                inputRef={recipeProductRef}
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
              <FormControlLabel
                control={
                  <Switch
                    checked={recipeForm.is_active}
                    onChange={(e) => setRecipeForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Activo"
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
                      {recipeComponents.map((sku) => (
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
                  <Button onClick={() => setRecipeForm({ id: undefined, product_id: "", name: "", items: [{ component_id: "", quantity: "" }], is_active: true })}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Recetas registradas"
            subheader="Listado compacto (sin previsualizar ingredientes)"
            action={<Chip label={`${filteredRecipes.length} de ${recipes.length}`} />}
          />
          <Divider />
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              <TextField
                label="Buscar por nombre o producto"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                size="small"
                sx={{ maxWidth: 320 }}
              />
              <FormControlLabel
                control={<Switch checked={showInactiveRecipes} onChange={(e) => setShowInactiveRecipes(e.target.checked)} />}
                label="Mostrar inactivos"
              />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Receta</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecipes.map((recipe) => (
                  <Fragment key={recipe.id}>
                    <TableRow hover>
                      <TableCell>
                        <Tooltip title={expandedRecipes[recipe.id] ? "Ocultar detalle" : "Ver detalle"}>
                          <IconButton size="small" onClick={() => toggleExpanded(setExpandedRecipes, recipe.id)}>
                            {expandedRecipes[recipe.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{recipe.name || "Receta"}</TableCell>
                      <TableCell>{skuMap.get(recipe.product_id) ? skuLabel(skuMap.get(recipe.product_id) as SKU) : `SKU ${recipe.product_id}`}</TableCell>
                      <TableCell>{recipe.is_active ? "Activo" : "Inactivo"}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditRecipe(recipe)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {recipe.is_active ? (
                          <Tooltip title="Inactivar">
                            <IconButton size="small" color="warning" onClick={() => handleStatusChange("recipe", recipe.id, false)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activar">
                            <IconButton size="small" color="success" onClick={() => handleStatusChange("recipe", recipe.id, true)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0 }}>
                        <Collapse in={expandedRecipes[recipe.id]} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 1 }}>
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle2">Ingredientes</Typography>
                              {recipe.items.length ? (
                                recipe.items.map((item) => {
                                  const component = skuMap.get(item.component_id);
                                  const name = item.component_name || component?.name || `SKU ${item.component_id}`;
                                  const unit = item.component_unit || component?.unit;
                                  return (
                                    <Typography key={`${recipe.id}-${item.component_id}`} variant="body2">
                                      {name} · {item.quantity} {unitLabel(unit)}
                                    </Typography>
                                  );
                                })
                              ) : (
                                <Typography variant="body2">Sin ingredientes registrados.</Typography>
                              )}
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderUsuarios = () => {
    const editingUser = userForm.id ? users.find((entry) => entry.id === userForm.id) : undefined;
    const editingAdminUser = isAdminUser(editingUser);
    return (
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Usuario" subheader={userForm.id ? "Editar" : "Nuevo"} avatar={<AdminPanelSettingsIcon color="primary" />} />
            <Divider />
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={handleUserSubmit}>
                <TextField
                  label="Email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  inputRef={userEmailRef}
                />
                <TextField
                  label="Nombre"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
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
                  disabled={editingAdminUser}
                  helperText={editingAdminUser ? "El usuario admin no puede desactivarse." : undefined}
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
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Usuarios"
            subheader="Alta, baja y modificación"
            action={<Chip label={`${filteredUsers.length} de ${users.length}`} />}
          />
          <Divider />
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Buscar por nombre, email o rol"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                size="small"
                sx={{ maxWidth: 320 }}
              />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Nombre</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isAdmin = isAdminUser(user);
                  return (
                    <Fragment key={user.id}>
                      <TableRow hover>
                        <TableCell>
                          <Tooltip title={expandedUsers[user.id] ? "Ocultar detalle" : "Ver detalle"}>
                            <IconButton size="small" onClick={() => toggleExpanded(setExpandedUsers, user.id)}>
                              {expandedUsers[user.id] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role_name || "—"}</TableCell>
                        <TableCell>{user.is_active ? "Activo" : "Inactivo"}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => startEditUser(user)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isAdmin ? "El usuario admin no se puede eliminar" : "Eliminar"}>
                            <span>
                              <IconButton size="small" color="error" disabled={isAdmin} onClick={() => handleDelete("user", user.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0 }}>
                        <Collapse in={expandedUsers[user.id]} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 1 }}>
                            <Stack spacing={0.5}>
                              <Typography variant="subtitle2">Detalle</Typography>
                              <Typography variant="body2">
                                <strong>ID:</strong> {user.id}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Rol:</strong> {user.role_name || "Sin rol"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Estado:</strong> {user.is_active ? "Activo" : "Inactivo"}
                              </Typography>
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
    );
  };

  const renderPermisos = () => (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
        <Box>
          <Typography variant="h6">Matriz de permisos</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestioná qué acciones puede realizar cada rol. Los cambios se aplican al guardar.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => void saveRolePermissions()}
          disabled={savingPermissions || !sortedRoles.length || !sortedPermissions.length}
        >
          {savingPermissions ? "Guardando..." : "Guardar cambios"}
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
        <TextField
          select
          size="small"
          label="Módulo"
          value={permissionModuleFilter}
          onChange={(event) => {
            setPermissionModuleFilter(event.target.value);
            setPermissionActionFilter("");
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {permissionModuleOptions.map((module) => (
            <MenuItem key={module} value={module}>
              {module}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Acción"
          value={permissionActionFilter}
          onChange={(event) => setPermissionActionFilter(event.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {permissionActionOptions.map((action) => (
            <MenuItem key={action} value={action}>
              {action}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Rol"
          value={permissionRoleFilter}
          onChange={(event) => setPermissionRoleFilter(event.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {sortedRoles.map((role) => (
            <MenuItem key={role.id} value={role.id}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Box sx={{ overflowX: "auto" }}>
        <Table
          size="small"
          sx={{
            width: "100%",
            tableLayout: "fixed",
            minWidth: 720,
            "& th, & td": {
              px: 1,
              py: 0.75,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 140 }}>Módulo</TableCell>
              <TableCell sx={{ width: 140 }}>Acción</TableCell>
              <TableCell sx={{ width: 240 }}>Descripción</TableCell>
              {filteredRoles.map((role) => (
                <TableCell
                  key={role.id}
                  align="center"
                  sx={{
                    width: 140,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {role.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPermissions.map((permission) => (
              <TableRow key={permission.key} hover>
                <TableCell sx={{ width: 140 }}>{permission.category}</TableCell>
                <TableCell sx={{ width: 140 }}>{permission.action}</TableCell>
                <TableCell sx={{ width: 240 }}>
                  <Tooltip title={permission.label} placement="top-start">
                    <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {permission.label}
                    </Box>
                  </Tooltip>
                </TableCell>
                {filteredRoles.map((role) => {
                  const checked = rolePermissions[role.id]?.has(permission.key) ?? false;
                  return (
                    <TableCell key={`${role.id}-${permission.key}`} align="center">
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleRolePermission(role.id, permission.key)}
                        icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                        checkedIcon={<CheckBoxIcon fontSize="small" />}
                        size="small"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
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
          <Tab label="Catálogos" value="catalogos" icon={<LibraryAddIcon />} iconPosition="start" />
          <Tab label="Proveedores" value="proveedores" icon={<LocalMallIcon />} iconPosition="start" />
          <Tab label="Usuarios" value="usuarios" icon={<AdminPanelSettingsIcon />} iconPosition="start" />
          <Tab label="Permisos" value="permisos" icon={<AdminPanelSettingsIcon />} iconPosition="start" />
        </Tabs>
        <Divider />
        <CardContent>
          {tab === "productos" && renderProductos()}
          {tab === "recetas" && renderRecetas()}
          {tab === "depositos" && renderDepositos()}
          {tab === "catalogos" && renderCatalogos()}
          {tab === "proveedores" && renderProveedores()}
          {tab === "usuarios" && renderUsuarios()}
          {tab === "permisos" && renderPermisos()}
        </CardContent>
      </Card>
      <Box sx={{ color: "text.secondary", fontSize: 12 }}>
        Pantalla única para altas, bajas y modificaciones de productos, recetas, depósitos, proveedores, usuarios y catálogos base.
      </Box>
    </Stack>
  );
}
