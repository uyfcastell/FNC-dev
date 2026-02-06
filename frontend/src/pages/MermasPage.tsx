import WarningIcon from "@mui/icons-material/Warning";
import AddIcon from "@mui/icons-material/Add";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
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
  createMermaEvent,
  deleteMermaCause,
  deleteMermaType,
  Deposit,
  fetchDeposits,
  fetchMermaCauses,
  fetchMermaEvents,
  fetchMermaLots,
  fetchMermaTypes,
  fetchProductionLines,
  fetchSkus,
  fetchUnits,
  MermaAction,
  MermaCause,
  MermaEvent,
  MermaStage,
  MermaType,
  ProductionLine,
  SKU,
  UnitOption,
  UnitOfMeasure,
  updateMermaCause,
  updateMermaType,
} from "../lib/api";

type TabKey = "registro" | "listado" | "catalogos";

type MermaEventFormState = {
  stage: MermaStage;
  type_id: number | null;
  cause_id: number | null;
  sku_id: number | null;
  quantity: number | "";
  unit?: UnitOfMeasure;
  lot_code?: string | null;
  deposit_id?: number | null;
  remito_id?: number | null;
  order_id?: number | null;
  production_line_id?: number | null;
  reported_by_role?: string | null;
  notes?: string | null;
  detected_at?: string | null;
  affects_stock: boolean;
  action: MermaAction;
};

const MERMA_STAGE_OPTIONS: { value: MermaStage; label: string }[] = [
  { value: "PRODUCTION", label: "Producción" },
  { value: "EMPAQUE", label: "Empaque" },
  { value: "STOCK", label: "Stock/Depósito" },
  { value: "TRANSITO_POST_REMITO", label: "Tránsito post-remito" },
  { value: "ADMINISTRATIVA", label: "Administrativa" },
];

const MERMA_ACTION_OPTIONS: { value: MermaAction; label: string }[] = [
  { value: "NONE", label: "Sin acción" },
  { value: "DISCOUNT", label: "Descartado" },
  { value: "ADJUST", label: "Ajuste administrativo" },
];

const stageLabel = (stage?: MermaStage) => MERMA_STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage ?? "-";

export function MermasPage() {
  const [tab, setTab] = useState<TabKey>("registro");
  const [skus, setSkus] = useState<SKU[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [types, setTypes] = useState<MermaType[]>([]);
  const [causes, setCauses] = useState<MermaCause[]>([]);
  const [events, setEvents] = useState<MermaEvent[] | null>(null);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MermaEvent | null>(null);
  const [availableLots, setAvailableLots] = useState<{ id: number; lot_code: string }[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const unitLabel = (unitCode?: UnitOfMeasure) => units.find((u) => u.code === unitCode)?.label ?? unitCode ?? "";

  const [eventForm, setEventForm] = useState<MermaEventFormState>({
    stage: "PRODUCTION",
    type_id: null,
    cause_id: null,
    sku_id: null,
    quantity: "",
    unit: undefined,
    deposit_id: null,
    remito_id: null,
    order_id: null,
    production_line_id: null,
    reported_by_role: "",
    notes: null,
    detected_at: null,
    affects_stock: true,
    action: "NONE",
    lot_code: "",
  });

  const [filters, setFilters] = useState<{
    stage?: MermaStage;
    deposit_id?: string;
    production_line_id?: string;
    sku_id?: string;
    type_id?: string;
    cause_id?: string;
    affects_stock?: string;
    date_from?: string;
    date_to?: string;
  }>({});


  useEffect(() => {
    void loadReferenceData();
    void loadEvents();
  }, []);

  useEffect(() => {
    const availableTypes = types.filter((t) => t.stage === eventForm.stage && t.is_active);
    if (availableTypes.length && !availableTypes.find((t) => t.id === eventForm.type_id)) {
      setEventForm((prev) => ({ ...prev, type_id: availableTypes[0].id }));
    }
    const availableCauses = causes.filter((c) => c.stage === eventForm.stage && c.is_active);
    if (availableCauses.length && !availableCauses.find((c) => c.id === eventForm.cause_id)) {
      setEventForm((prev) => ({ ...prev, cause_id: availableCauses[0].id }));
    }
  }, [eventForm.stage, types, causes, eventForm.type_id, eventForm.cause_id]);

  useEffect(() => {
    if (eventForm.sku_id && !eventForm.unit) {
      const skuUnit = skus.find((s) => s.id === eventForm.sku_id)?.unit;
      if (skuUnit) {
        setEventForm((prev) => ({ ...prev, unit: skuUnit }));
      }
    }
  }, [eventForm.sku_id, eventForm.unit, skus]);

  useEffect(() => {
    const loadLotsForSku = async () => {
      if (!eventForm.sku_id) {
        setAvailableLots([]);
        return;
      }
      setLotsLoading(true);
      try {
        const lots = await fetchMermaLots({
          sku_id: eventForm.sku_id,
          deposit_id: eventForm.deposit_id ?? undefined,
          available_only: true,
        });
        setAvailableLots(lots.map((lot) => ({ id: lot.id, lot_code: lot.lot_code })));
        setEventForm((prev) => {
          const lotExists = !!prev.lot_code && lots.some((lot) => lot.lot_code === prev.lot_code);
          return lotExists ? prev : { ...prev, lot_code: "" };
        });
      } catch (err) {
        console.error("No pudimos cargar lotes para merma", err);
        setAvailableLots([]);
      } finally {
        setLotsLoading(false);
      }
    };
    void loadLotsForSku();
  }, [eventForm.sku_id, eventForm.deposit_id]);

  const handleFilterChange = (patch: Partial<typeof filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (next.date_from && next.date_to && next.date_to < next.date_from) {
        next.date_to = next.date_from;
      }
      return next;
    });
  };

  const loadReferenceData = async () => {
    try {
      const [skuList, depositList, lineList, typeList, causeList, unitList] = await Promise.all([
        fetchSkus({ include_inactive: false }),
        fetchDeposits(),
        fetchProductionLines(),
        fetchMermaTypes({ include_inactive: true }),
        fetchMermaCauses({ include_inactive: true }),
        fetchUnits(),
      ]);
      setSkus(skuList);
      setDeposits(depositList);
      setProductionLines(lineList);
      setTypes(typeList);
      setCauses(causeList);
      setUnits(unitList);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar los catálogos de mermas");
    }
  };

  const loadEvents = async () => {
    try {
      const data = await fetchMermaEvents({
        ...(
          filters.stage ? { stage: filters.stage } : {}
        ),
        ...(filters.deposit_id ? { deposit_id: Number(filters.deposit_id) } : {}),
        ...(filters.production_line_id ? { production_line_id: Number(filters.production_line_id) } : {}),
        ...(filters.sku_id ? { sku_id: Number(filters.sku_id) } : {}),
        ...(filters.type_id ? { type_id: Number(filters.type_id) } : {}),
        ...(filters.cause_id ? { cause_id: Number(filters.cause_id) } : {}),
        ...(filters.affects_stock ? { affects_stock: filters.affects_stock === "true" } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
      });
      setEvents(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("No pudimos obtener las mermas. ¿Está levantado el backend?");
      setEvents([]);
    }
  };

  const filteredTypes = useMemo(
    () => types.filter((t) => t.stage === eventForm.stage && t.is_active),
    [types, eventForm.stage]
  );

  const filteredCauses = useMemo(
    () => causes.filter((c) => c.stage === eventForm.stage && c.is_active),
    [causes, eventForm.stage]
  );

  const filteredSkus = useMemo(
    () => skus.filter((sku) => {
      if (!sku.is_active) return false;
      if (eventForm.stage === "PRODUCTION" || eventForm.stage === "EMPAQUE") return ["PT", "SEMI", "MP"].includes(sku.sku_type_code);
      return true;
    }),
    [skus, eventForm.stage]
  );
  const selectedEventSku = useMemo(() => skus.find((sku) => sku.id === eventForm.sku_id) ?? null, [skus, eventForm.sku_id]);
  const isSemiEventSku = selectedEventSku?.sku_type_code === "SEMI";
  const semiUnitsPerKg = isSemiEventSku ? selectedEventSku?.units_per_kg ?? 1 : null;

  const typeOptions = useMemo(
    () =>
      filteredTypes.map((type) => ({
        value: type.id,
        label: type.label,
        description: `${stageLabel(type.stage)} · ${type.code}`,
      })),
    [filteredTypes]
  );

  const causeOptions = useMemo(
    () =>
      filteredCauses.map((cause) => ({
        value: cause.id,
        label: cause.label,
        description: `${stageLabel(cause.stage)} · ${cause.code}`,
      })),
    [filteredCauses]
  );

  const skuOptions = useMemo(
    () =>
      filteredSkus.map((sku) => ({
        value: sku.id,
        label: `${sku.name} (${sku.code})`,
        description: `Unidad: ${unitLabel(sku.unit)}`,
      })),
    [filteredSkus, units]
  );

  const depositOptions = useMemo(
    () =>
      deposits.map((deposit) => ({
        value: deposit.id,
        label: deposit.name,
        description: deposit.location || undefined,
      })),
    [deposits]
  );

  const selectedProductionLine = useMemo(
    () => productionLines.find((line) => line.id === eventForm.production_line_id) ?? null,
    [eventForm.production_line_id, productionLines]
  );
  const productionLineOptions = useMemo(() => {
    const visibleLines = productionLines.filter((line) => line.is_active || line.id === selectedProductionLine?.id);
    return visibleLines.map((line) => ({
      value: line.id,
      label: line.is_active ? line.name : `${line.name} (inactiva)`,
    }));
  }, [productionLines, selectedProductionLine]);

  const handleEventSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!eventForm.type_id || !eventForm.cause_id || !eventForm.sku_id || !eventForm.quantity) {
      setError("Completá tipo, causa, SKU y cantidad");
      return;
    }
    if (["PRODUCTION", "EMPAQUE", "STOCK"].includes(eventForm.stage) && !eventForm.deposit_id) {
      setError("Selecciona un depósito para esta etapa");
      return;
    }
    if (eventForm.stage === "PRODUCTION" && !eventForm.production_line_id) {
      setError("Selecciona la línea de producción");
      return;
    }
    if (eventForm.stage === "TRANSITO_POST_REMITO" && !eventForm.remito_id) {
      setError("Indica el remito asociado");
      return;
    }
    if (eventForm.stage === "ADMINISTRATIVA" && (!eventForm.notes || !eventForm.notes?.trim())) {
      setError("En etapa administrativa las notas son obligatorias");
      return;
    }
    try {
      await createMermaEvent({
        stage: eventForm.stage,
        type_id: Number(eventForm.type_id),
        cause_id: Number(eventForm.cause_id),
        sku_id: Number(eventForm.sku_id),
        unit: eventForm.unit,
        notes: eventForm.notes || undefined,
        reported_by_role: eventForm.reported_by_role || undefined,
        quantity: Number(eventForm.quantity),
        deposit_id: eventForm.deposit_id ? Number(eventForm.deposit_id) : undefined,
        remito_id: eventForm.remito_id ? Number(eventForm.remito_id) : undefined,
        order_id: eventForm.order_id ? Number(eventForm.order_id) : undefined,
        production_line_id: eventForm.production_line_id ? Number(eventForm.production_line_id) : undefined,
        detected_at: eventForm.detected_at || undefined,
        lot_code: eventForm.lot_code?.trim() ? eventForm.lot_code.trim() : undefined,
        affects_stock: eventForm.affects_stock,
        action: eventForm.action,
      });
      setSuccess("Merma registrada");
      setError(null);
      setEventForm((prev) => ({
        ...prev,
        quantity: "",
        notes: "",
        lot_code: "",
        remito_id: undefined,
        order_id: undefined,
      }));
      await loadEvents();
    } catch (err) {
      console.error("Error al registrar merma", err);
      const detail = err instanceof Error ? err.message : "";
      setError(detail ? `No pudimos registrar la merma: ${detail}` : "No pudimos registrar la merma. Revisa los datos.");
    }
  };




  const availableTypesForFilters = useMemo(() => types.filter((t) => !filters.stage || t.stage === filters.stage), [types, filters.stage]);
  const availableCausesForFilters = useMemo(() => causes.filter((c) => !filters.stage || c.stage === filters.stage), [causes, filters.stage]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <WarningIcon color="primary" />
        Módulo de mermas
      </Typography>
      {error && <Alert severity="warning" onClose={() => setError(null)}>{error}</Alert>}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab value="registro" label="Registro" icon={<PlaylistAddCheckIcon />} iconPosition="start" />
        <Tab value="listado" label="Listado" icon={<FactCheckIcon />} iconPosition="start" />
        <Tab value="catalogos" label="Catálogos" icon={<SettingsIcon />} iconPosition="start" />
      </Tabs>

      {tab === "registro" && (
        <Card>
          <CardHeader title="Registrar merma" subheader="Campos dinámicos según etapa" />
          <Divider />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleEventSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Etapa"
                    value={eventForm.stage}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, stage: e.target.value as MermaStage }))}
                  >
                    {MERMA_STAGE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <SearchableSelect
                    label="Tipo"
                    required
                    options={typeOptions}
                    value={eventForm.type_id}
                    onChange={(value) => setEventForm((prev) => ({ ...prev, type_id: value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <SearchableSelect
                    label="Causa"
                    required
                    options={causeOptions}
                    value={eventForm.cause_id}
                    onChange={(value) => setEventForm((prev) => ({ ...prev, cause_id: value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <SearchableSelect
                    label="SKU"
                    required
                    options={skuOptions}
                    value={eventForm.sku_id}
                    onChange={(value) => {
                      const skuUnit = value ? skus.find((s) => s.id === value)?.unit : undefined;
                      setEventForm((prev) => ({ ...prev, sku_id: value, unit: skuUnit ?? undefined }));
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Cantidad"
                    required
                    value={eventForm.quantity}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Unidad"
                    value={eventForm.unit || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, unit: e.target.value as UnitOfMeasure }))}
                  >
                    {units.map((unit) => (
                      <MenuItem key={unit.code} value={unit.code}>
                        {unit.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {isSemiEventSku && (
                    <Typography variant="caption" color="text.secondary">
                      SEMI en kg (base). Equivalencia: {semiUnitsPerKg} un = 1 kg
                    </Typography>
                  )}
                </Grid>
                {(eventForm.stage === "PRODUCTION" ||
                  eventForm.stage === "EMPAQUE" ||
                  eventForm.stage === "STOCK" ||
                  (eventForm.stage === "ADMINISTRATIVA" && eventForm.affects_stock)) && (
                  <Grid item xs={12} md={3}>
                    <SearchableSelect
                      label="Depósito"
                      required
                      options={depositOptions}
                      value={eventForm.deposit_id ?? null}
                      onChange={(value) => setEventForm((prev) => ({ ...prev, deposit_id: value }))}
                    />
                  </Grid>
                )}
                {eventForm.stage === "PRODUCTION" && (
                  <Grid item xs={12} md={3}>
                    <SearchableSelect
                      label="Línea de producción"
                      required
                      options={productionLineOptions}
                      value={eventForm.production_line_id ?? null}
                      onChange={(value) => setEventForm((prev) => ({ ...prev, production_line_id: value }))}
                    />
                  </Grid>
                )}
                {eventForm.stage === "TRANSITO_POST_REMITO" && (
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Remito asociado"
                      required
                      value={eventForm.remito_id || ""}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, remito_id: Number(e.target.value) }))}
                    />
                  </Grid>
                )}
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Lote"
                    value={eventForm.lot_code || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, lot_code: e.target.value }))}
                    disabled={!eventForm.sku_id || lotsLoading || availableLots.length === 0}
                    helperText={
                      !eventForm.sku_id
                        ? "Seleccioná un SKU para ver lotes"
                        : lotsLoading
                          ? "Cargando lotes..."
                          : availableLots.length === 0
                            ? "Este producto no tiene lotes disponibles. Se registrará sin lote."
                            : "Opcional: seleccioná un lote o dejalo vacío"
                    }
                  >
                    <MenuItem value="">Sin lote</MenuItem>
                    {availableLots.map((lot) => (
                      <MenuItem key={lot.id} value={lot.lot_code}>
                        {lot.lot_code}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="Detectado"
                    InputLabelProps={{ shrink: true }}
                    value={eventForm.detected_at ?? ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, detected_at: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Acción"
                    value={eventForm.action ?? "NONE"}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, action: e.target.value as MermaAction }))}
                  >
                    {MERMA_ACTION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Rol / responsable"
                    value={eventForm.reported_by_role || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, reported_by_role: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notas"
                    multiline
                    minRows={2}
                    value={eventForm.notes || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(eventForm.affects_stock)}
                        onChange={(e) => setEventForm((prev) => ({ ...prev, affects_stock: e.target.checked }))}
                      />
                    }
                    label="Afecta stock (crea movimiento MERMA)"
                  />
                </Grid>
              </Grid>
              <Box>
                <Button type="submit" variant="contained" startIcon={<AddIcon />}>Registrar merma</Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === "listado" && (
        <Stack spacing={2}>
          <Card>
            <CardHeader title="Filtros" action={<IconButton onClick={loadEvents}><RefreshIcon /></IconButton>} />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Etapa"
                    value={filters.stage || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, stage: (e.target.value as MermaStage) || undefined }))}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {MERMA_STAGE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Depósito"
                    value={filters.deposit_id || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, deposit_id: e.target.value || undefined }))}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {deposits.map((deposit) => (
                      <MenuItem key={deposit.id} value={deposit.id}>
                        {deposit.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Línea"
                    value={filters.production_line_id || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, production_line_id: e.target.value || undefined }))}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {productionLines.map((line) => (
                      <MenuItem key={line.id} value={line.id}>
                        {line.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="SKU"
                    value={filters.sku_id || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sku_id: e.target.value || undefined }))}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {skus.map((sku) => (
                      <MenuItem key={sku.id} value={sku.id}>
                        {sku.name} ({sku.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Tipo"
                    value={filters.type_id || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, type_id: e.target.value || undefined }))}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {availableTypesForFilters.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Causa"
                    value={filters.cause_id || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, cause_id: e.target.value || undefined }))}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {availableCausesForFilters.map((cause) => (
                      <MenuItem key={cause.id} value={cause.id}>
                        {cause.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Afecta stock"
                    value={filters.affects_stock || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, affects_stock: e.target.value || undefined }))}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="true">Sí</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Desde"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date_from || ""}
                    onChange={(e) => handleFilterChange({ date_from: e.target.value || undefined })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Hasta"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date_to || ""}
                    onChange={(e) => handleFilterChange({ date_to: e.target.value || undefined })}
                    inputProps={{ min: filters.date_from || undefined }}
                  />
                </Grid>
              </Grid>
              <Box mt={2} display="flex" gap={1}>
                <Button variant="contained" onClick={loadEvents} startIcon={<RefreshIcon />}>Aplicar filtros</Button>
                <Button
                  onClick={() => {
                    setFilters({});
                    void loadEvents();
                  }}
                >
                  Limpiar
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Mermas registradas" />
            <Divider />
            <CardContent>
              {events === null ? (
                <Skeleton variant="rectangular" height={120} />
              ) : events.length === 0 ? (
                <Alert severity="info">No hay mermas registradas con los filtros seleccionados.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Etapa</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Depósito</TableCell>
                      <TableCell>Tipo / Causa</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Acción</TableCell>
                      <TableCell>Movimiento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow
                        key={event.id}
                        hover
                        selected={selectedEvent?.id === event.id}
                        onClick={() => setSelectedEvent(event)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell>{new Date(event.detected_at).toLocaleString()}</TableCell>
                        <TableCell>{stageLabel(event.stage)}</TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" fontWeight={600}>{event.sku_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{event.sku_code}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography>{event.quantity}</Typography>
                            <Chip size="small" label={event.unit} />
                          </Stack>
                        </TableCell>
                        <TableCell>{event.deposit_name || "-"}</TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2">{event.type_label}</Typography>
                            <Typography variant="caption" color="text.secondary">{event.cause_label}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={event.affects_stock ? "primary" : "default"} label={event.affects_stock ? "Ajusta" : "Sólo registra"} />
                        </TableCell>
                        <TableCell>{MERMA_ACTION_OPTIONS.find((a) => a.value === event.action)?.label ?? "-"}</TableCell>
                        <TableCell>{event.stock_movement_id ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {selectedEvent && (
            <Card>
              <CardHeader title={`Detalle de merma #${selectedEvent.id}`} />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Etapa</Typography>
                    <Typography>{stageLabel(selectedEvent.stage)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">SKU</Typography>
                    <Typography>{selectedEvent.sku_name} ({selectedEvent.sku_code})</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Cantidad</Typography>
                    <Typography>{selectedEvent.quantity} {selectedEvent.unit}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Tipo / causa</Typography>
                    <Typography>{selectedEvent.type_label} · {selectedEvent.cause_label}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Depósito</Typography>
                    <Typography>{selectedEvent.deposit_name || "-"}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Línea de producción</Typography>
                    <Typography>{selectedEvent.production_line_name || "-"}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Remito</Typography>
                    <Typography>{selectedEvent.remito_id ?? "-"}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Movimiento stock</Typography>
                    <Typography>{selectedEvent.stock_movement_id ?? "(sin movimiento)"}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Acción</Typography>
                    <Typography>{MERMA_ACTION_OPTIONS.find((a) => a.value === selectedEvent.action)?.label ?? "-"}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Notas</Typography>
                    <Typography whiteSpace="pre-line">{selectedEvent.notes || "-"}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {tab === "catalogos" && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Tipos de merma" />
              <Divider />
              <CardContent>
                <Stack spacing={1}>
                  {types.map((type) => (
                    <Stack key={type.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography fontWeight={600}>{type.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{stageLabel(type.stage)} · {type.code}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Switch
                          checked={type.is_active}
                          onChange={async (e) => {
                            try {
                              await updateMermaType(type.id, { is_active: e.target.checked });
                              await loadReferenceData();
                            } catch (err) {
                              console.error(err);
                              setError("No pudimos actualizar el tipo");
                            }
                          }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async () => {
                            try {
                              await deleteMermaType(type.id);
                              await loadReferenceData();
                              setSuccess("Tipo desactivado");
                            } catch (err) {
                              console.error(err);
                              setError("No se puede desactivar el tipo");
                            }
                          }}
                        >
                          <PlaylistAddCheckIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Causas de merma" />
              <Divider />
              <CardContent>
                <Stack spacing={1}>
                  {causes.map((cause) => (
                    <Stack key={cause.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography fontWeight={600}>{cause.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{stageLabel(cause.stage)} · {cause.code}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Switch
                          checked={cause.is_active}
                          onChange={async (e) => {
                            try {
                              await updateMermaCause(cause.id, { is_active: e.target.checked });
                              await loadReferenceData();
                            } catch (err) {
                              console.error(err);
                              setError("No pudimos actualizar la causa");
                            }
                          }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async () => {
                            try {
                              await deleteMermaCause(cause.id);
                              await loadReferenceData();
                              setSuccess("Causa desactivada");
                            } catch (err) {
                              console.error(err);
                              setError("No se puede desactivar la causa");
                            }
                          }}
                        >
                          <PlaylistAddCheckIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}
