import AssessmentIcon from "@mui/icons-material/Assessment";
import SummarizeIcon from "@mui/icons-material/Summarize";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  LinearProgress,
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
import { useEffect, useState } from "react";

import {
  Deposit,
  fetchDeposits,
  fetchSkus,
  fetchSkuTypes,
  fetchStockAlertReport,
  fetchStockExpirations,
  fetchStockReport,
  ExpiryReport,
  ExpiryStatus,
  MovementSummary,
  SKU,
  SKUType,
  StockAlertReport,
  StockAlertStatus,
  StockSummaryRow,
} from "../lib/api";

type ChartProps = {
  title: string;
  rows: StockSummaryRow[];
  emptyText: string;
};

const SummaryBar = ({ label, quantity, total, absolute }: { label: string; quantity: number; total: number; absolute?: boolean }) => {
  const value = absolute ? Math.abs(quantity) : quantity;
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body2">
          {quantity.toFixed(2)} ({percentage}%)
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={percentage} />
    </Stack>
  );
};

const SummaryCard = ({ title, rows, emptyText }: ChartProps) => {
  const total = rows.reduce((acc, row) => acc + row.quantity, 0);
  return (
    <Card>
      <CardHeader avatar={<AssessmentIcon color="primary" />} title={title} />
      <Divider />
      <CardContent>
        {rows.length === 0 && <Typography variant="body2">{emptyText}</Typography>}
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <SummaryBar key={row.label} label={row.label} quantity={row.quantity} total={total} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export function ReportsPage() {
  const [totalsByTag, setTotalsByTag] = useState<StockSummaryRow[]>([]);
  const [totalsByDeposit, setTotalsByDeposit] = useState<StockSummaryRow[]>([]);
  const [movementTotals, setMovementTotals] = useState<MovementSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [alertReport, setAlertReport] = useState<StockAlertReport>({ total: 0, items: [] });
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSkuTypes, setAlertSkuTypes] = useState<SKUType[]>([]);
  const [alertDeposits, setAlertDeposits] = useState<Deposit[]>([]);
  const [expiryReport, setExpiryReport] = useState<ExpiryReport>({ total: 0, items: [] });
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [expirySkus, setExpirySkus] = useState<SKU[]>([]);
  const [alertFilters, setAlertFilters] = useState<{
    sku_type_id: string;
    deposit_id: string;
    status: StockAlertStatus | "";
    search: string;
    min_quantity: string;
    max_quantity: string;
    only_configured: boolean;
    include_inactive: boolean;
  }>({
    sku_type_id: "",
    deposit_id: "",
    status: "",
    search: "",
    min_quantity: "",
    max_quantity: "",
    only_configured: false,
    include_inactive: false,
  });
  const [expiryFilters, setExpiryFilters] = useState<{
    sku_id: string;
    deposit_id: string;
    status: ExpiryStatus | "";
    expiry_from: string;
    expiry_to: string;
    include_no_expiry: boolean;
  }>({
    sku_id: "",
    deposit_id: "",
    status: "",
    expiry_from: "",
    expiry_to: "",
    include_no_expiry: true,
  });

  useEffect(() => {
    async function load() {
      try {
        const report = await fetchStockReport();
        setTotalsByTag(report.totals_by_tag);
        setTotalsByDeposit(report.totals_by_deposit);
        setMovementTotals(report.movement_totals);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("No pudimos obtener los reportes. Verifica el backend.");
      }
    }
    void load();
  }, []);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [skuTypes, deposits, skuList] = await Promise.all([
          fetchSkuTypes({ include_inactive: true }),
          fetchDeposits(),
          fetchSkus(),
        ]);
        setAlertSkuTypes(skuTypes);
        setAlertDeposits(deposits);
        setExpirySkus(skuList);
      } catch (err) {
        console.error(err);
      }
    }
    void loadFilters();
  }, []);

  const loadAlertReport = async () => {
    setAlertLoading(true);
    try {
      const report = await fetchStockAlertReport({
        sku_type_ids: alertFilters.sku_type_id ? [Number(alertFilters.sku_type_id)] : undefined,
        deposit_ids: alertFilters.deposit_id ? [Number(alertFilters.deposit_id)] : undefined,
        alert_status: alertFilters.status ? [alertFilters.status] : undefined,
        search: alertFilters.search || undefined,
        min_quantity: alertFilters.min_quantity ? Number(alertFilters.min_quantity) : undefined,
        max_quantity: alertFilters.max_quantity ? Number(alertFilters.max_quantity) : undefined,
        only_configured: alertFilters.only_configured || undefined,
        include_inactive: alertFilters.include_inactive || undefined,
      });
      setAlertReport(report);
      setAlertError(null);
    } catch (err) {
      console.error(err);
      setAlertError("No pudimos obtener el reporte de alertas.");
    } finally {
      setAlertLoading(false);
    }
  };

  const loadExpiryReport = async () => {
    setExpiryLoading(true);
    try {
      const report = await fetchStockExpirations({
        sku_id: expiryFilters.sku_id ? Number(expiryFilters.sku_id) : undefined,
        deposit_id: expiryFilters.deposit_id ? Number(expiryFilters.deposit_id) : undefined,
        status: expiryFilters.status ? [expiryFilters.status] : undefined,
        expiry_from: expiryFilters.expiry_from || undefined,
        expiry_to: expiryFilters.expiry_to || undefined,
        include_no_expiry: expiryFilters.include_no_expiry,
      });
      setExpiryReport(report);
      setExpiryError(null);
    } catch (err) {
      console.error(err);
      setExpiryError("No pudimos obtener el reporte de vencimientos.");
    } finally {
      setExpiryLoading(false);
    }
  };

  useEffect(() => {
    void loadAlertReport();
  }, []);

  useEffect(() => {
    void loadExpiryReport();
  }, []);

  const alertStatusLabels: Record<StockAlertStatus, { label: string; color: "success" | "warning" | "error" | "default" }> = {
    green: { label: "Verde", color: "success" },
    yellow: { label: "Amarillo", color: "warning" },
    red: { label: "Rojo", color: "error" },
    none: { label: "Sin alerta", color: "default" },
  };

  const expiryStatusLabels: Record<ExpiryStatus, { label: string; color: "success" | "warning" | "error" | "default" }> = {
    green: { label: "Verde", color: "success" },
    yellow: { label: "Amarillo", color: "warning" },
    red: { label: "Rojo", color: "error" },
    none: { label: "Sin vencimiento", color: "default" },
  };

  const alertStatusCounts = alertReport.items.reduce(
    (acc, row) => ({ ...acc, [row.alert_status]: (acc[row.alert_status] ?? 0) + 1 }),
    {} as Record<StockAlertStatus, number>,
  );

  const totalMovements = movementTotals.reduce((acc, row) => acc + Math.abs(row.quantity), 0);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SummarizeIcon color="primary" />
        Reportes rápidos
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SummaryCard title="Stock por tipo de SKU" rows={totalsByTag} emptyText="Sin datos de stock." />
        </Grid>
        <Grid item xs={12} md={6}>
          <SummaryCard title="Stock por depósito" rows={totalsByDeposit} emptyText="Sin datos de stock." />
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Movimientos últimos 7 días" />
            <Divider />
            <CardContent>
              {movementTotals.length === 0 && <Typography variant="body2">Sin movimientos registrados.</Typography>}
              <Stack spacing={1}>
                {movementTotals.map((row) => {
                  const pct = totalMovements > 0 ? Math.round((Math.abs(row.quantity) / totalMovements) * 100) : 0;
                  return (
                    <SummaryBar
                      key={row.movement_type_code}
                      label={row.movement_type_label || row.movement_type_code}
                      quantity={row.quantity}
                      total={totalMovements || 1}
                      absolute
                    />
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Alertas de stock" subheader="Semáforo por SKU y depósito" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Buscar SKU"
                      value={alertFilters.search}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, search: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Tipo de SKU"
                      value={alertFilters.sku_type_id}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, sku_type_id: e.target.value }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {alertSkuTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.code} — {type.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Depósito"
                      value={alertFilters.deposit_id}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, deposit_id: e.target.value }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {alertDeposits.map((deposit) => (
                        <MenuItem key={deposit.id} value={deposit.id}>
                          {deposit.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Estado"
                      value={alertFilters.status}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, status: e.target.value as StockAlertStatus | "" }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {Object.entries(alertStatusLabels).map(([key, cfg]) => (
                        <MenuItem key={key} value={key}>
                          {cfg.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Cantidad mínima"
                      type="number"
                      value={alertFilters.min_quantity}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, min_quantity: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Cantidad máxima"
                      type="number"
                      value={alertFilters.max_quantity}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, max_quantity: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Alertas configuradas"
                      value={alertFilters.only_configured ? "true" : "false"}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, only_configured: e.target.value === "true" }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="false">Todas</MenuItem>
                      <MenuItem value="true">Sólo configuradas</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="SKUs inactivos"
                      value={alertFilters.include_inactive ? "true" : "false"}
                      onChange={(e) => setAlertFilters((prev) => ({ ...prev, include_inactive: e.target.value === "true" }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="false">Ocultar inactivos</MenuItem>
                      <MenuItem value="true">Incluir inactivos</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="flex-end">
                      <Button variant="outlined" onClick={() => {
                        setAlertFilters({
                          sku_type_id: "",
                          deposit_id: "",
                          status: "",
                          search: "",
                          min_quantity: "",
                          max_quantity: "",
                          only_configured: false,
                          include_inactive: false,
                        });
                      }}>
                        Limpiar
                      </Button>
                      <Button variant="contained" onClick={loadAlertReport}>
                        Aplicar filtros
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
                {alertError && <Alert severity="warning">{alertError}</Alert>}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(alertStatusLabels).map(([key, cfg]) => (
                    <Chip
                      key={key}
                      label={`${cfg.label}: ${alertStatusCounts[key as StockAlertStatus] ?? 0}`}
                      color={cfg.color}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                  <Chip label={`Total: ${alertReport.total}`} variant="outlined" size="small" />
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Depósito</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Umbrales</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertReport.items.map((row) => (
                      <TableRow key={`${row.sku_id}-${row.deposit_id}`}>
                        <TableCell>{row.sku_name} ({row.sku_code})</TableCell>
                        <TableCell>{row.sku_type_code} — {row.sku_type_label}</TableCell>
                        <TableCell>{row.deposit_name}</TableCell>
                        <TableCell align="right">{row.quantity.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={alertStatusLabels[row.alert_status].label}
                            color={alertStatusLabels[row.alert_status].color}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {[
                            row.alert_green_min != null ? `Verde >= ${row.alert_green_min}` : null,
                            row.alert_yellow_min != null ? `Amarillo >= ${row.alert_yellow_min}` : null,
                            row.alert_red_max != null ? `Rojo <= ${row.alert_red_max}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Sin alerta"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {alertReport.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          {alertLoading ? "Cargando..." : "Sin registros para los filtros actuales."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Vencimientos por lote" subheader="Semáforo por fecha de vencimiento" />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="SKU"
                      value={expiryFilters.sku_id}
                      onChange={(e) => setExpiryFilters((prev) => ({ ...prev, sku_id: e.target.value }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {expirySkus.map((sku) => (
                        <MenuItem key={sku.id} value={sku.id}>
                          {sku.name} ({sku.code})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Depósito"
                      value={expiryFilters.deposit_id}
                      onChange={(e) => setExpiryFilters((prev) => ({ ...prev, deposit_id: e.target.value }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {alertDeposits.map((deposit) => (
                        <MenuItem key={deposit.id} value={deposit.id}>
                          {deposit.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Estado"
                      value={expiryFilters.status}
                      onChange={(e) => setExpiryFilters((prev) => ({ ...prev, status: e.target.value as ExpiryStatus | "" }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {Object.entries(expiryStatusLabels).map(([key, cfg]) => (
                        <MenuItem key={key} value={key}>
                          {cfg.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Sin vencimiento"
                      value={expiryFilters.include_no_expiry ? "true" : "false"}
                      onChange={(e) => setExpiryFilters((prev) => ({ ...prev, include_no_expiry: e.target.value === "true" }))}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="true">Mostrar</MenuItem>
                      <MenuItem value="false">Ocultar</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Vence desde"
                      type="date"
                      value={expiryFilters.expiry_from}
                      onChange={(e) => setExpiryFilters((prev) => ({ ...prev, expiry_from: e.target.value }))}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Vence hasta"
                      type="date"
                      value={expiryFilters.expiry_to}
                      onChange={(e) => setExpiryFilters((prev) => ({ ...prev, expiry_to: e.target.value }))}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} display="flex" justifyContent="flex-end" alignItems="center">
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="flex-end" width="100%">
                      <Button
                        variant="outlined"
                        onClick={() =>
                          setExpiryFilters({
                            sku_id: "",
                            deposit_id: "",
                            status: "",
                            expiry_from: "",
                            expiry_to: "",
                            include_no_expiry: true,
                          })
                        }
                      >
                        Limpiar
                      </Button>
                      <Button variant="contained" onClick={loadExpiryReport}>
                        Aplicar filtros
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
                {expiryError && <Alert severity="warning">{expiryError}</Alert>}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(expiryStatusLabels).map(([key, cfg]) => (
                    <Chip
                      key={key}
                      label={cfg.label}
                      color={cfg.color}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                  <Chip label={`Total: ${expiryReport.total}`} variant="outlined" size="small" />
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lote</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Depósito</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell>Vence</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expiryReport.items.map((row) => (
                      <TableRow key={`${row.lot_id ?? row.lot_code}-${row.sku_id}-${row.deposit_id}`}>
                        <TableCell>{row.lot_code ?? "—"}</TableCell>
                        <TableCell>
                          {row.sku_name} ({row.sku_code})
                        </TableCell>
                        <TableCell>{row.deposit_name}</TableCell>
                        <TableCell align="right">{row.remaining_quantity.toFixed(2)}</TableCell>
                        <TableCell>
                          {row.expiry_date ?? "—"}
                          {row.days_to_expiry != null && ` (${row.days_to_expiry} días)`}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={expiryStatusLabels[row.status].label}
                            color={expiryStatusLabels[row.status].color}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {expiryReport.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          {expiryLoading ? "Cargando..." : "Sin registros para los filtros actuales."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
