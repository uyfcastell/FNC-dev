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
import { AddCircleOutline, DeleteForever, Save } from "@mui/icons-material";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";

import { SearchableSelect } from "../components/SearchableSelect";
import {
  createRecipe,
  createStockMovement,
  createDailyOverhead,
  createDailyOverheadItem,
  DailyOverhead,
  DailyOverheadAllocationMethod,
  DailyOverheadAllocationRow,
  DailyOverheadItem,
  DailyOverheadItemPayload,
  DailyOverheadItemType,
  deleteDailyOverheadItem,
  fetchDailyOverheadAllocations,
  fetchDailyOverheads,
  fetchDailyOverheadItems,
  fetchDailyPiecework,
  Deposit,
  fetchDeposits,
  fetchProductionLines,
  fetchProductionLots,
  fetchRecipes,
  fetchSkus,
  fetchStockMovementTypes,
  PieceworkLine,
  ProductionLine,
  Recipe,
  setProductionLinePieceRate,
  SKU,
  StockMovementType,
  updateDailyOverhead,
  updateDailyOverheadItem,
} from "../lib/api";
import { getOperationalDeposits } from "../lib/deposits";

const PRODUCTION_TYPE_CODES: string[] = ["MA", "PI", "PT", "PACK"];
const SHOW_INDIRECT_LABOR_SECTION = false;
const SHOW_PIECEWORK_SECTION = false;
type RecipeFormItem = { component_id: number | null; quantity: string };
type OverheadItemDraft = {
  tempId: string;
  id?: number;
  concept_name: string;
  concept_type: DailyOverheadItemType;
  amount: string;
  notes: string;
  isSaving?: boolean;
  isDeleting?: boolean;
  error?: string | null;
};

export function ProductionPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [movementTypes, setMovementTypes] = useState<StockMovementType[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"production" | "overheads">("production");

  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split("T")[0]);
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
  const [overheadItems, setOverheadItems] = useState<OverheadItemDraft[]>([]);
  const [overheadItemsLoading, setOverheadItemsLoading] = useState(false);
  const [overheadItemsError, setOverheadItemsError] = useState<string | null>(null);
  const [pieceworkLines, setPieceworkLines] = useState<PieceworkLine[]>([]);
  const [pieceworkLoading, setPieceworkLoading] = useState(false);
  const [pieceworkError, setPieceworkError] = useState<string | null>(null);
  const [pieceRateDrafts, setPieceRateDrafts] = useState<Record<number, string>>({});
  const [pieceRateSaving, setPieceRateSaving] = useState<Record<number, boolean>>({});

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
  const sortedDeposits = useMemo(
    () => [...getOperationalDeposits(deposits)].sort((a, b) => a.name.localeCompare(b.name)),
    [deposits]
  );
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
  const selectedProductionLine = useMemo(
    () => productionLines.find((line) => line.id === productionForm.production_line_id) ?? null,
    [productionForm.production_line_id, productionLines]
  );
  const productionLineOptions = useMemo(() => {
    const visibleLines = productionLines.filter((line) => line.is_active || line.id === selectedProductionLine?.id);
    return visibleLines.map((line) => ({
      value: line.id,
      label: line.is_active ? line.name : `${line.name} (inactiva)`,
    }));
  }, [productionLines, selectedProductionLine]);
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
    let isActive = true;
    const generateLotCode = async () => {
      if (!productionForm.product_sku_id || !productionForm.production_line_id || !productionDate) {
        setProductionForm((prev) => (prev.lot_code ? { ...prev, lot_code: "" } : prev));
        return;
      }
      const sku = skus.find((item) => item.id === productionForm.product_sku_id);
      if (!sku) {
        setProductionForm((prev) => (prev.lot_code ? { ...prev, lot_code: "" } : prev));
        return;
      }
      const datePart = productionDate.replace(/-/g, "").slice(2);
      const prefix = `${datePart}-L${productionForm.production_line_id}-${sku.code}`;
      try {
        const lots = await fetchProductionLots({
          sku_id: productionForm.product_sku_id,
          production_line_id: productionForm.production_line_id,
        });
        const maxSeq = lots
          .filter((lot) => lot.produced_at === productionDate && lot.lot_code.startsWith(prefix))
          .map((lot) => Number(lot.lot_code.split("-").slice(-1)[0] ?? 0))
          .filter((value) => Number.isFinite(value))
          .reduce((acc, value) => Math.max(acc, value), 0);
        const nextLot = `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
        if (isActive) {
          setProductionForm((prev) => ({ ...prev, lot_code: nextLot }));
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setProductionForm((prev) => ({ ...prev, lot_code: `${prefix}-001` }));
        }
      }
    };
    void generateLotCode();
    return () => {
      isActive = false;
    };
  }, [productionDate, productionForm.product_sku_id, productionForm.production_line_id, skus]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    void loadDailyOverhead(overheadDate);
    if (SHOW_PIECEWORK_SECTION) {
      void loadPiecework(overheadDate);
    }
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
        if (SHOW_INDIRECT_LABOR_SECTION) {
          await loadOverheadItems(record.id);
        } else {
          setOverheadItems([]);
          setOverheadItemsError(null);
        }
        await loadAllocations(record.id);
      } else {
        setDailyOverhead(null);
        setOverheadForm({ energy_cost: "0", gas_cost: "0", allocation_method: "units", notes: "" });
        setAllocations([]);
        setAllocationMessage(null);
        setOverheadItems([]);
        setOverheadItemsError(null);
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

  const toOverheadItemDraft = (item: DailyOverheadItem): OverheadItemDraft => ({
    tempId: `item-${item.id}`,
    id: item.id,
    concept_name: item.concept_name,
    concept_type: item.concept_type,
    amount: item.amount.toString(),
    notes: item.notes ?? "",
    isSaving: false,
    isDeleting: false,
    error: null,
  });

  const loadOverheadItems = async (overheadId: number) => {
    setOverheadItemsLoading(true);
    setOverheadItemsError(null);
    try {
      const items = await fetchDailyOverheadItems(overheadId);
      setOverheadItems(items.map(toOverheadItemDraft));
    } catch (err) {
      console.error(err);
      setOverheadItemsError("No pudimos cargar los ítems de mano de obra indirecta.");
      setOverheadItems([]);
    } finally {
      setOverheadItemsLoading(false);
    }
  };

  const loadPiecework = async (dateValue: string) => {
    setPieceworkLoading(true);
    setPieceworkError(null);
    try {
      const response = await fetchDailyPiecework({ date: dateValue });
      setPieceworkLines(response.lines ?? []);
      setPieceRateDrafts({});
    } catch (err) {
      console.error(err);
      setPieceworkError("No pudimos cargar el destajo por línea.");
      setPieceworkLines([]);
    } finally {
      setPieceworkLoading(false);
    }
  };

  const addOverheadItem = () => {
    setOverheadItems((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}-${prev.length}`,
        concept_name: "",
        concept_type: "labor_indirect",
        amount: "",
        notes: "",
        isSaving: false,
        isDeleting: false,
        error: null,
      },
    ]);
  };

  const updateOverheadItemField = (tempId: string, field: keyof OverheadItemDraft, value: string) => {
    setOverheadItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const next = { ...item, [field]: value };
        if (field !== "error") {
          next.error = null;
        }
        return next;
      })
    );
  };

  const saveOverheadItem = async (item: OverheadItemDraft) => {
    if (!dailyOverhead?.id) {
      setOverheadItemsError("Guardá el overhead diario antes de cargar jornales.");
      return;
    }
    const conceptName = item.concept_name.trim();
    const amountValue = Number(item.amount);
    if (!conceptName) {
      updateOverheadItemField(item.tempId, "error", "El concepto es obligatorio.");
      return;
    }
    if (Number.isNaN(amountValue) || amountValue < 0) {
      updateOverheadItemField(item.tempId, "error", "El monto debe ser numérico y mayor o igual a cero.");
      return;
    }

    setOverheadItems((prev) =>
      prev.map((row) => (row.tempId === item.tempId ? { ...row, isSaving: true, error: null } : row))
    );
    const payload: DailyOverheadItemPayload = {
      concept_type: item.concept_type,
      concept_name: conceptName,
      amount: amountValue,
      notes: item.notes.trim() || null,
    };
    try {
      let saved: DailyOverheadItem;
      if (item.id) {
        saved = await updateDailyOverheadItem(dailyOverhead.id, item.id, payload);
      } else {
        saved = await createDailyOverheadItem(dailyOverhead.id, payload);
      }
      setOverheadItems((prev) => prev.map((row) => (row.tempId === item.tempId ? toOverheadItemDraft(saved) : row)));
      await loadAllocations(dailyOverhead.id);
    } catch (err) {
      console.error(err);
      setOverheadItems((prev) =>
        prev.map((row) =>
          row.tempId === item.tempId ? { ...row, isSaving: false, error: "No pudimos guardar el ítem." } : row
        )
      );
    } finally {
      setOverheadItems((prev) => prev.map((row) => (row.tempId === item.tempId ? { ...row, isSaving: false } : row)));
    }
  };

  const deleteOverheadItem = async (item: OverheadItemDraft) => {
    if (!dailyOverhead?.id || !item.id) {
      setOverheadItems((prev) => prev.filter((row) => row.tempId !== item.tempId));
      return;
    }
    setOverheadItems((prev) =>
      prev.map((row) => (row.tempId === item.tempId ? { ...row, isDeleting: true } : row))
    );
    try {
      await deleteDailyOverheadItem(dailyOverhead.id, item.id);
      setOverheadItems((prev) => prev.filter((row) => row.tempId !== item.tempId));
      await loadAllocations(dailyOverhead.id);
    } catch (err) {
      console.error(err);
      setOverheadItems((prev) =>
        prev.map((row) =>
          row.tempId === item.tempId ? { ...row, isDeleting: false, error: "No pudimos eliminar el ítem." } : row
        )
      );
    }
  };

  const updatePieceRateDraft = (lineId: number, value: string) => {
    setPieceRateDrafts((prev) => ({ ...prev, [lineId]: value }));
  };

  const savePieceRate = async (line: PieceworkLine) => {
    const draftValue = pieceRateDrafts[line.production_line_id];
    const candidateValue =
      draftValue ?? (line.rate_per_unit !== null && line.rate_per_unit !== undefined ? line.rate_per_unit.toString() : "");
    const rateValue = Number(candidateValue);
    if (Number.isNaN(rateValue) || rateValue < 0) {
      setPieceworkError("La tarifa debe ser numérica y mayor o igual a cero.");
      return;
    }
    setPieceRateSaving((prev) => ({ ...prev, [line.production_line_id]: true }));
    setPieceworkError(null);
    try {
      await setProductionLinePieceRate(line.production_line_id, {
        rate_per_unit: rateValue,
        active_from: overheadDate,
      });
      await loadPiecework(overheadDate);
    } catch (err) {
      console.error(err);
      setPieceworkError("No pudimos guardar la tarifa de destajo.");
    } finally {
      setPieceRateSaving((prev) => ({ ...prev, [line.production_line_id]: false }));
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
        movement_date: productionDate || undefined,
        reference: productionForm.reference || "Orden de producción",
      });
      setSuccess("Producción registrada en stock");
      setProductionForm({ product_sku_id: null, deposit_id: null, production_line_id: null, lot_code: "", quantity: "", reference: "" });
      setProductionDate(new Date().toISOString().split("T")[0]);
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
      await loadOverheadItems(saved.id);
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
  const overheadItemsTotal = useMemo(() => {
    return overheadItems.reduce((acc, item) => {
      const amountValue = Number(item.amount);
      if (!Number.isFinite(amountValue) || amountValue < 0) return acc;
      return acc + amountValue;
    }, 0);
  }, [overheadItems]);

  const overheadTotalCost = useMemo(() => {
    const energyCost = Number(overheadForm.energy_cost);
    const gasCost = Number(overheadForm.gas_cost);
    return (
      (Number.isFinite(energyCost) ? energyCost : 0) +
      (Number.isFinite(gasCost) ? gasCost : 0) +
      overheadItemsTotal
    );
  }, [overheadForm.energy_cost, overheadForm.gas_cost, overheadItemsTotal]);
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
        Producción
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab value="production" label="Producción" />
        <Tab value="overheads" label="Indirectos (Versión BETA)" />
      </Tabs>

      {tab === "production" && (
        <>
          <Stack spacing={2}>
            <Card>
              <CardHeader title="Registrar producción" />
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
                  />
                  <TextField
                    label="Fecha"
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Lote"
                    placeholder="YYMMDD-Lx-SKU-###"
                    value={productionForm.lot_code}
                    InputProps={{ readOnly: true }}
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
          </Stack>
        </>
      )}

      {tab === "overheads" && (
        <Stack spacing={2}>
          <Card>
            <CardHeader title="Indirectos" subheader="Carga posterior a la producción (UTE / Gas)" />
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
                    label="Energía"
                    type="number"
                    inputProps={{ min: 0, step: "0.01" }}
                    value={overheadForm.energy_cost}
                    onChange={(e) => setOverheadForm((prev) => ({ ...prev, energy_cost: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  />
                  <TextField
                    label="Gas"
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
          {SHOW_INDIRECT_LABOR_SECTION && (
          <Card>
            <CardHeader title="Mano de obra indirecta (jornales)" subheader="Carga manual de jornales diarios" />
            <Divider />
            <CardContent>
              {overheadItemsError && <Alert severity="warning" sx={{ mb: 2 }}>{overheadItemsError}</Alert>}
              {overheadItemsLoading && <Alert severity="info" sx={{ mb: 2 }}>Cargando ítems...</Alert>}
              {!dailyOverhead && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Guardá primero el overhead del día para cargar jornales.
                </Alert>
              )}
              <Stack spacing={2}>
                {overheadItems.length === 0 && (
                  <Alert severity="info">No hay ítems cargados para esta fecha.</Alert>
                )}
                {overheadItems.length > 0 && (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Concepto</TableCell>
                        <TableCell>Monto</TableCell>
                        <TableCell>Notas</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overheadItems.map((item) => (
                        <Fragment key={item.tempId}>
                          <TableRow>
                            <TableCell sx={{ minWidth: 180 }}>
                              <TextField
                                fullWidth
                                size="small"
                                value={item.concept_name}
                                placeholder="Ej: Empaque"
                                onChange={(e) => updateOverheadItemField(item.tempId, "concept_name", e.target.value)}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: 140 }}>
                              <TextField
                                fullWidth
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: "0.01" }}
                                value={item.amount}
                                onChange={(e) => updateOverheadItemField(item.tempId, "amount", e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: 200 }}>
                              <TextField
                                fullWidth
                                size="small"
                                value={item.notes}
                                placeholder="Notas"
                                onChange={(e) => updateOverheadItemField(item.tempId, "notes", e.target.value)}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Guardar">
                                  <span>
                                    <IconButton
                                      color="primary"
                                      onClick={() => saveOverheadItem(item)}
                                      disabled={item.isSaving || item.isDeleting || !dailyOverhead}
                                    >
                                      <Save />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                  <span>
                                    <IconButton
                                      color="error"
                                      onClick={() => deleteOverheadItem(item)}
                                      disabled={item.isSaving || item.isDeleting}
                                    >
                                      <DeleteForever />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                          {item.error && (
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Typography variant="caption" color="error">
                                  {item.error}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <Button startIcon={<AddCircleOutline />} onClick={addOverheadItem}>
                  Agregar ítem
                </Button>
              </Stack>
            </CardContent>
          </Card>
          )}
          {SHOW_PIECEWORK_SECTION && (
          <Card>
            <CardHeader title="Destajo por línea (calculado)" subheader="Tarifa por unidad y cálculo automático" />
            <Divider />
            <CardContent>
              {pieceworkError && <Alert severity="warning" sx={{ mb: 2 }}>{pieceworkError}</Alert>}
              {pieceworkLoading && <Alert severity="info" sx={{ mb: 2 }}>Cargando destajo...</Alert>}
              {!pieceworkLoading && pieceworkLines.length === 0 && (
                <Alert severity="info">No hay líneas activas para calcular destajo.</Alert>
              )}
              {pieceworkLines.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Línea</TableCell>
                      <TableCell align="right">Unidades producidas</TableCell>
                      <TableCell>Tarifa por unidad</TableCell>
                      <TableCell align="right">Total destajo</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pieceworkLines.map((line) => {
                      const draftValue = pieceRateDrafts[line.production_line_id];
                      const rateValue =
                        draftValue ?? (line.rate_per_unit !== null && line.rate_per_unit !== undefined ? line.rate_per_unit.toString() : "");
                      const isSaving = pieceRateSaving[line.production_line_id] ?? false;
                      return (
                        <TableRow key={line.production_line_id}>
                          <TableCell>{line.production_line_name}</TableCell>
                          <TableCell align="right">{formatQuantity(line.units_produced)}</TableCell>
                          <TableCell sx={{ minWidth: 160 }}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              inputProps={{ min: 0, step: "0.01" }}
                              value={rateValue}
                              placeholder="Sin tarifa"
                              onChange={(e) => updatePieceRateDraft(line.production_line_id, e.target.value)}
                              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {line.cost_piecework !== null && line.cost_piecework !== undefined
                              ? formatCurrency(line.cost_piecework)
                              : "Sin tarifa"}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Guardar tarifa">
                              <span>
                                <IconButton
                                  color="primary"
                                  onClick={() => savePieceRate(line)}
                                  disabled={isSaving}
                                >
                                  <Save />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          )}
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
