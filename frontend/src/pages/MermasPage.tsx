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

import {
  createMermaCause,
  createMermaEvent,
  createMermaType,
  createProductionLine,
  deleteMermaCause,
  deleteMermaType,
  Deposit,
  fetchDeposits,
  fetchMermaCauses,
  fetchMermaEvents,
  fetchMermaTypes,
  fetchProductionLines,
  fetchSkus,
  fetchUnits,
  MermaAction,
  MermaCause,
  MermaEvent,
  MermaEventPayload,
  MermaStage,
  MermaType,
  ProductionLine,
  SKU,
  UnitOption,
  UnitOfMeasure,
  updateMermaCause,
  updateMermaType,
  updateProductionLine,
} from "../lib/api";

type TabKey = "registro" | "listado" | "catalogos";

type MermaEventFormState = Omit<MermaEventPayload, "quantity"> & { quantity: number | "" };

const MERMA_STAGE_OPTIONS: { value: MermaStage; label: string }[] = [
  { value: "production", label: "Producción" },
  { value: "empaque", label: "Empaque" },
  { value: "stock", label: "Stock/Depósito" },
  { value: "transito_post_remito", label: "Tránsito post-remito" },
  { value: "administrativa", label: "Administrativa" },
];

const MERMA_ACTION_OPTIONS: { value: MermaAction; label: string }[] = [
  { value: "none", label: "Sin acción" },
  { value: "discarded", label: "Descartado" },
  { value: "reprocessed", label: "Reprocesado" },
  { value: "admin_adjustment", label: "Ajuste administrativo" },
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

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState<MermaEventFormState>({
    stage: "production",
    type_id: 0,
    cause_id: 0,
    sku_id: 0,
    quantity: "",
    unit: undefined,
    deposit_id: undefined,
    remito_id: undefined,
    order_id: undefined,
    production_line_id: undefined,
    reported_by_user_id: undefined,
    reported_by_role: "",
    notes: "",
    detected_at: undefined,
    affects_stock: true,
    action: "none",
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

  const [typeForm, setTypeForm] = useState<{ id?: number; stage: MermaStage; code: string; label: string; is_active: boolean }>(
    { stage: "production", code: "", label: "", is_active: true }
  );
  const [causeForm, setCauseForm] = useState<{ id?: number; stage: MermaStage; code: string; label: string; is_active: boolean }>(
    { stage: "production", code: "", label: "", is_active: true }
  );
  const [lineForm, setLineForm] = useState<{ id?: number; name: string; is_active: boolean }>({ name: "", is_active: true });

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
      if (eventForm.stage === "production" || eventForm.stage === "empaque") return ["PT", "SEMI", "MP"].includes(sku.sku_type_code);
      return true;
    }),
    [skus, eventForm.stage]
  );

  const handleEventSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!eventForm.type_id || !eventForm.cause_id || !eventForm.sku_id || !eventForm.quantity) {
      setError("Completá tipo, causa, SKU y cantidad");
      return;
    }
    if (["production", "empaque", "stock"].includes(eventForm.stage) && !eventForm.deposit_id) {
      setError("Selecciona un depósito para esta etapa");
      return;
    }
    if (eventForm.stage === "production" && !eventForm.production_line_id) {
      setError("Selecciona la línea de producción");
      return;
    }
    if (eventForm.stage === "transito_post_remito" && !eventForm.remito_id) {
      setError("Indica el remito asociado");
      return;
    }
    if (eventForm.stage === "administrativa" && (!eventForm.notes || !eventForm.notes?.trim())) {
      setError("En etapa administrativa las notas son obligatorias");
      return;
    }
    try {
      await createMermaEvent({
        ...eventForm,
        quantity: Number(eventForm.quantity),
        deposit_id: eventForm.deposit_id ? Number(eventForm.deposit_id) : undefined,
        remito_id: eventForm.remito_id ? Number(eventForm.remito_id) : undefined,
        order_id: eventForm.order_id ? Number(eventForm.order_id) : undefined,
        production_line_id: eventForm.production_line_id ? Number(eventForm.production_line_id) : undefined,
        reported_by_user_id: eventForm.reported_by_user_id ? Number(eventForm.reported_by_user_id) : undefined,
        detected_at: eventForm.detected_at || undefined,
        lot_code: eventForm.lot_code || undefined,
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
      console.error(err);
      setError("No pudimos registrar la merma. Revisa los datos.");
    }
  };

  const handleTypeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (typeForm.id) {
        await updateMermaType(typeForm.id, { label: typeForm.label, is_active: typeForm.is_active });
      } else {
        await createMermaType({ stage: typeForm.stage, code: typeForm.code, label: typeForm.label, is_active: typeForm.is_active });
      }
      setTypeForm({ id: undefined, stage: "production", code: "", label: "", is_active: true });
      await loadReferenceData();
      setSuccess("Catálogo de tipos actualizado");
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar el tipo de merma");
    }
  };

  const handleCauseSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (causeForm.id) {
        await updateMermaCause(causeForm.id, { label: causeForm.label, is_active: causeForm.is_active });
      } else {
        await createMermaCause({ stage: causeForm.stage, code: causeForm.code, label: causeForm.label, is_active: causeForm.is_active });
      }
      setCauseForm({ id: undefined, stage: "production", code: "", label: "", is_active: true });
      await loadReferenceData();
      setSuccess("Catálogo de causas actualizado");
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar la causa de merma");
    }
  };

  const handleLineSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (lineForm.id) {
        await updateProductionLine(lineForm.id, { name: lineForm.name, is_active: lineForm.is_active });
      } else {
        await createProductionLine({ name: lineForm.name, is_active: lineForm.is_active });
      }
      setLineForm({ id: undefined, name: "", is_active: true });
      await loadReferenceData();
      setSuccess("Líneas de producción actualizadas");
    } catch (err) {
      console.error(err);
      setError("No pudimos guardar la línea de producción");
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
                  <TextField
                    select
                    fullWidth
                    label="Tipo"
                    required
                    value={eventForm.type_id || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, type_id: Number(e.target.value) }))}
                  >
                    {filteredTypes.map((type) => (
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
                    required
                    value={eventForm.cause_id || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, cause_id: Number(e.target.value) }))}
                  >
                    {filteredCauses.map((cause) => (
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
                    label="SKU"
                    required
                    value={eventForm.sku_id || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, sku_id: Number(e.target.value), unit: undefined }))}
                  >
                    {filteredSkus.map((sku) => (
                      <MenuItem key={sku.id} value={sku.id}>
                        {sku.name} ({sku.code})
                      </MenuItem>
                    ))}
                  </TextField>
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
                </Grid>
                {(eventForm.stage === "production" || eventForm.stage === "empaque" || eventForm.stage === "stock" || (eventForm.stage === "administrativa" && eventForm.affects_stock)) && (
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      fullWidth
                      label="Depósito"
                      required
                      value={eventForm.deposit_id || ""}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, deposit_id: Number(e.target.value) }))}
                    >
                      {deposits.map((deposit) => (
                        <MenuItem key={deposit.id} value={deposit.id}>
                          {deposit.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                {eventForm.stage === "production" && (
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      fullWidth
                      label="Línea de producción"
                      required
                      value={eventForm.production_line_id || ""}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, production_line_id: Number(e.target.value) }))}
                    >
                      {productionLines.filter((line) => line.is_active).map((line) => (
                        <MenuItem key={line.id} value={line.id}>
                          {line.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                {eventForm.stage === "transito_post_remito" && (
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
                    fullWidth
                    label="Lote"
                    value={eventForm.lot_code || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, lot_code: e.target.value }))}
                  />
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
                    value={eventForm.action ?? "none"}
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
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Usuario informante (ID)"
                    value={eventForm.reported_by_user_id || ""}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, reported_by_user_id: Number(e.target.value) }))}
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
                    onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value || undefined }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Hasta"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date_to || ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value || undefined }))}
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
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Tipos de merma" />
              <Divider />
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={handleTypeSubmit}>
                  <TextField
                    select
                    fullWidth
                    label="Etapa"
                    value={typeForm.stage}
                    onChange={(e) => setTypeForm((prev) => ({ ...prev, stage: e.target.value as MermaStage }))}
                  >
                    {MERMA_STAGE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Código"
                    required
                    disabled={Boolean(typeForm.id)}
                    value={typeForm.code}
                    onChange={(e) => setTypeForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                  <TextField
                    label="Nombre visible"
                    required
                    value={typeForm.label}
                    onChange={(e) => setTypeForm((prev) => ({ ...prev, label: e.target.value }))}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={typeForm.is_active}
                        onChange={(e) => setTypeForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      />
                    }
                    label="Activo"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                      {typeForm.id ? "Actualizar" : "Crear"}
                    </Button>
                    {typeForm.id && (
                      <Button onClick={() => setTypeForm({ id: undefined, stage: "production", code: "", label: "", is_active: true })}>Cancelar</Button>
                    )}
                  </Stack>
                </Stack>
                <Divider sx={{ my: 2 }} />
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
                        <Button size="small" onClick={() => setTypeForm({ ...type, id: type.id })}>Editar</Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async () => {
                            try {
                              await deleteMermaType(type.id);
                              await loadReferenceData();
                              setSuccess("Tipo eliminado");
                            } catch (err) {
                              console.error(err);
                              setError("No se puede eliminar el tipo (en uso)");
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

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Causas de merma" />
              <Divider />
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={handleCauseSubmit}>
                  <TextField
                    select
                    fullWidth
                    label="Etapa"
                    value={causeForm.stage}
                    onChange={(e) => setCauseForm((prev) => ({ ...prev, stage: e.target.value as MermaStage }))}
                  >
                    {MERMA_STAGE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Código"
                    required
                    disabled={Boolean(causeForm.id)}
                    value={causeForm.code}
                    onChange={(e) => setCauseForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                  <TextField
                    label="Nombre visible"
                    required
                    value={causeForm.label}
                    onChange={(e) => setCauseForm((prev) => ({ ...prev, label: e.target.value }))}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={causeForm.is_active}
                        onChange={(e) => setCauseForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      />
                    }
                    label="Activo"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                      {causeForm.id ? "Actualizar" : "Crear"}
                    </Button>
                    {causeForm.id && (
                      <Button onClick={() => setCauseForm({ id: undefined, stage: "production", code: "", label: "", is_active: true })}>Cancelar</Button>
                    )}
                  </Stack>
                </Stack>
                <Divider sx={{ my: 2 }} />
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
                        <Button size="small" onClick={() => setCauseForm({ ...cause, id: cause.id })}>Editar</Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async () => {
                            try {
                              await deleteMermaCause(cause.id);
                              await loadReferenceData();
                              setSuccess("Causa eliminada");
                            } catch (err) {
                              console.error(err);
                              setError("No se puede eliminar la causa (en uso)");
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

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Líneas de producción" />
              <Divider />
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={handleLineSubmit}>
                  <TextField
                    label="Nombre"
                    required
                    value={lineForm.name}
                    onChange={(e) => setLineForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={lineForm.is_active}
                        onChange={(e) => setLineForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      />
                    }
                    label="Activa"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>
                      {lineForm.id ? "Actualizar" : "Crear"}
                    </Button>
                    {lineForm.id && (
                      <Button onClick={() => setLineForm({ id: undefined, name: "", is_active: true })}>Cancelar</Button>
                    )}
                  </Stack>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {productionLines.map((line) => (
                    <Stack key={line.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography fontWeight={600}>{line.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{line.is_active ? "Activa" : "Inactiva"}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Switch
                          checked={line.is_active}
                          onChange={async (e) => {
                            try {
                              await updateProductionLine(line.id, { is_active: e.target.checked });
                              await loadReferenceData();
                            } catch (err) {
                              console.error(err);
                              setError("No pudimos actualizar la línea");
                            }
                          }}
                        />
                        <Button size="small" onClick={() => setLineForm({ ...line })}>Editar</Button>
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
